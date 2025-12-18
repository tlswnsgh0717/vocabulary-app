// PDF.js 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// PDF 뷰어 변수
let currentPDF = null;
let currentPageNum = 1;
let totalPages = 0;
let currentPDFPath = '';
let resizeObserver = null; // 화면 크기 변경 감지용

// PDF 책 목록 데이터
const pdfBooks = [
    {
        id: 1,
        title: "능률보카 중등 1권 (기본)",
        pdfPath: "voca.pdf",
        description: "보카북 본책"
    }
    // 여기에 더 많은 책을 추가할 수 있습니다
];

// PDF 책 목록 렌더링
function renderPDFBookList() {
    const bookList = document.getElementById('pdfBookList');
    if (!bookList) {
        console.error('pdfBookList 요소를 찾을 수 없습니다.');
        // PDF 모드 요소 확인
        const pdfMode = document.getElementById('pdf-mode');
        console.log('PDF 모드 요소:', pdfMode);
        if (pdfMode) {
            console.log('PDF 모드 active 상태:', pdfMode.classList.contains('active'));
        }
        return;
    }
    
    console.log('PDF 책 목록 렌더링 시작:', pdfBooks);
    
    // HTML 이스케이프 처리
    bookList.innerHTML = pdfBooks.map(book => {
        const escapedPath = book.pdfPath.replace(/'/g, "\\'");
        const escapedTitle = book.title.replace(/'/g, "\\'");
        // 항상 자동 로드 (로컬 서버 사용 권장)
        return `
        <div class="pdf-book-item" onclick="openPDFViewer('${escapedPath}', '${escapedTitle}')">
            <h3>${book.title}</h3>
            <p>${book.description}</p>
        </div>
    `;
    }).join('');
    
    console.log('PDF 책 목록 렌더링 완료. 책 개수:', pdfBooks.length);
}

// 파일 입력을 통한 PDF 로드
function loadPDFFile(pdfPath, title) {
    // 파일 입력 요소 생성
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // FileReader를 사용하여 파일 읽기
        const reader = new FileReader();
        reader.onload = async (event) => {
            const arrayBuffer = event.target.result;
            await openPDFViewerWithData(arrayBuffer, title);
        };
        reader.readAsArrayBuffer(file);
        
        // 파일 입력 제거
        document.body.removeChild(fileInput);
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
}

// ArrayBuffer로 PDF 뷰어 열기
async function openPDFViewerWithData(pdfData, title) {
    const viewerContainer = document.getElementById('pdfViewerContainer');
    const canvas = document.getElementById('pdfCanvas');
    
    if (!viewerContainer || !canvas) {
        console.error('뷰어 요소를 찾을 수 없습니다.');
        return;
    }
    
    viewerContainer.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // 로딩 표시
    const pageWrapper = document.querySelector('.pdf-page-wrapper');
    let loading = document.querySelector('.pdf-loading');
    if (!loading && pageWrapper) {
        loading = document.createElement('div');
        loading.className = 'pdf-loading';
        loading.textContent = 'PDF 로딩 중...';
        loading.style.color = 'white';
        loading.style.fontSize = '18px';
        loading.style.position = 'absolute';
        loading.style.top = '50%';
        loading.style.left = '50%';
        loading.style.transform = 'translate(-50%, -50%)';
        loading.style.zIndex = '100';
        pageWrapper.appendChild(loading);
    }

    try {
        console.log('PDF 파일 로드 시작 (ArrayBuffer)');
        
        // ArrayBuffer로 PDF 로드
        const loadingTask = pdfjsLib.getDocument({
            data: pdfData,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
        });
        
        currentPDF = await loadingTask.promise;
        totalPages = currentPDF.numPages;
        currentPageNum = 1;

        console.log('PDF 로드 완료. 총 페이지:', totalPages);

        const titleElement = document.getElementById('pdfViewerTitle');
        if (titleElement) {
            titleElement.textContent = title;
        }
        
        const totalPagesElement = document.getElementById('pdfTotalPages');
        if (totalPagesElement) {
            totalPagesElement.textContent = totalPages;
        }

        // 로딩 메시지 제거
        if (loading && loading.parentNode) {
            loading.parentNode.removeChild(loading);
        }

        // 첫 페이지 렌더링
        await renderPDFPage(currentPageNum);
        updatePDFButtons();
        
        // 화면 크기 변경 감지하여 자동 리사이즈
        setupResizeObserver();
    } catch (error) {
        console.error('PDF 로드 오류:', error);
        // 로딩 메시지 제거
        if (loading && loading.parentNode) {
            loading.parentNode.removeChild(loading);
        }
        const errorMsg = error.message || '알 수 없는 오류';
        console.error('상세 오류:', error);
        alert('PDF 파일을 불러올 수 없습니다.\n\n확인 사항:\n1. 로컬 서버가 실행 중인지 확인하세요\n2. PDF 파일이 vocabulary-app 폴더에 있는지 확인하세요\n3. 브라우저 주소창이 http://localhost:8000/... 인지 확인하세요\n\n터미널에서 실행: python3 -m http.server 8000\n그 다음 http://localhost:8000/voca.html 을 열어주세요.\n\n오류: ' + errorMsg);
        closePDFViewer();
    }
}

// PDF 뷰어 열기 (URL 경로 사용 - 로컬 서버 사용 시)
async function openPDFViewer(pdfPath, title) {
    console.log('PDF 뷰어 열기 (URL):', pdfPath, title);
    const viewerContainer = document.getElementById('pdfViewerContainer');
    const canvas = document.getElementById('pdfCanvas');
    
    if (!viewerContainer || !canvas) {
        console.error('뷰어 요소를 찾을 수 없습니다.');
        return;
    }
    
    viewerContainer.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // 로딩 표시
    const pageWrapper = document.querySelector('.pdf-page-wrapper');
    let loading = document.querySelector('.pdf-loading');
    if (!loading && pageWrapper) {
        loading = document.createElement('div');
        loading.className = 'pdf-loading';
        loading.textContent = 'PDF 로딩 중...';
        loading.style.color = 'white';
        loading.style.fontSize = '18px';
        loading.style.position = 'absolute';
        loading.style.top = '50%';
        loading.style.left = '50%';
        loading.style.transform = 'translate(-50%, -50%)';
        loading.style.zIndex = '100';
        pageWrapper.appendChild(loading);
    }

    try {
        console.log('PDF 파일 로드 시작:', pdfPath);
        console.log('현재 페이지 URL:', window.location.href);
        console.log('현재 프로토콜:', window.location.protocol);
        
        // file:// 프로토콜 사용 시 경고
        if (window.location.protocol === 'file:') {
            alert('로컬 서버를 사용해주세요!\n\n터미널에서 다음 명령어를 실행하세요:\npython3 -m http.server 8000\n\n그 다음 브라우저에서 http://localhost:8000/voca.html 을 열어주세요.');
            closePDFViewer();
            return;
        }
        
        // 상대 경로를 절대 URL로 변환
        let absolutePath = pdfPath;
        if (!pdfPath.startsWith('http://') && !pdfPath.startsWith('https://') && !pdfPath.startsWith('file://')) {
            // URL 생성자를 사용하여 올바른 절대 URL 생성
            try {
                absolutePath = new URL(pdfPath, window.location.href).href;
            } catch (e) {
                // URL 생성자가 실패하면 수동으로 생성
                const currentPath = window.location.pathname;
                let basePath = '/';
                
                if (currentPath.includes('/')) {
                    const lastSlash = currentPath.lastIndexOf('/');
                    basePath = currentPath.substring(0, lastSlash + 1);
                }
                
                // 파일명만 인코딩 (경로 구분자는 유지)
                const fileName = pdfPath.split('/').pop();
                const encodedFileName = encodeURIComponent(fileName);
                const dirPath = pdfPath.substring(0, pdfPath.lastIndexOf('/') + 1);
                
                absolutePath = window.location.origin + basePath + dirPath + encodedFileName;
            }
        }
        
        console.log('원본 경로:', pdfPath);
        console.log('절대 경로:', absolutePath);
        console.log('현재 origin:', window.location.origin);
        console.log('현재 pathname:', window.location.pathname);
        
        // fetch로 PDF 파일 로드
        const response = await fetch(absolutePath, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        console.log('Fetch 응답 상태:', response.status, response.statusText);
        console.log('응답 URL:', response.url);
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => '응답 본문을 읽을 수 없습니다');
            console.error('응답 본문:', errorText.substring(0, 200));
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}\n시도한 경로: ${absolutePath}`);
        }
        
        const contentType = response.headers.get('content-type');
        console.log('응답 Content-Type:', contentType);
        
        const pdfData = await response.arrayBuffer();
        console.log('PDF 파일 fetch 완료, 크기:', pdfData.byteLength, 'bytes');
        
        if (pdfData.byteLength === 0) {
            throw new Error('PDF 파일이 비어있습니다. 파일이 제대로 다운로드되지 않았습니다.');
        }
        
        // ArrayBuffer로 PDF 로드
        const loadingTask = pdfjsLib.getDocument({
            data: pdfData,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
        });
        
        currentPDF = await loadingTask.promise;
        totalPages = currentPDF.numPages;
        currentPageNum = 1;
        currentPDFPath = pdfPath;

        console.log('PDF 로드 완료. 총 페이지:', totalPages);

        const titleElement = document.getElementById('pdfViewerTitle');
        if (titleElement) {
            titleElement.textContent = title;
        }
        
        const totalPagesElement = document.getElementById('pdfTotalPages');
        if (totalPagesElement) {
            totalPagesElement.textContent = totalPages;
        }

        // 로딩 메시지 제거
        if (loading && loading.parentNode) {
            loading.parentNode.removeChild(loading);
        }

        // 첫 페이지 렌더링
        await renderPDFPage(currentPageNum);
        updatePDFButtons();
        
        // 화면 크기 변경 감지하여 자동 리사이즈
        setupResizeObserver();
    } catch (error) {
        console.error('PDF 로드 오류:', error);
        // 로딩 메시지 제거
        if (loading && loading.parentNode) {
            loading.parentNode.removeChild(loading);
        }
        const errorMsg = error.message || '알 수 없는 오류';
        console.error('상세 오류:', error);
        alert('PDF 파일을 불러올 수 없습니다.\n\n확인 사항:\n1. 로컬 서버가 실행 중인지 확인하세요\n2. PDF 파일이 vocabulary-app 폴더에 있는지 확인하세요\n3. 브라우저 주소창이 http://localhost:8000/... 인지 확인하세요\n\n터미널에서 실행: python3 -m http.server 8000\n그 다음 http://localhost:8000/voca.html 을 열어주세요.\n\n오류: ' + errorMsg);
        closePDFViewer();
    }
}

// PDF 페이지 렌더링 (화면 크기에 자동 맞춤)
async function renderPDFPage(pageNum) {
    if (!currentPDF) {
        console.error('currentPDF가 없습니다.');
        return;
    }

    const canvas = document.getElementById('pdfCanvas');
    const pageWrapper = document.querySelector('.pdf-page-wrapper');

    if (!canvas) {
        console.error('pdfCanvas 요소를 찾을 수 없습니다.');
        return;
    }
    
    if (!pageWrapper) {
        console.error('pdf-page-wrapper 요소를 찾을 수 없습니다.');
        return;
    }

    try {
        console.log('페이지 렌더링 시작:', pageNum);
        const page = await currentPDF.getPage(pageNum);
        
        // 화면 크기에 맞게 scale 계산
        const pageWrapperRect = pageWrapper.getBoundingClientRect();
        const maxWidth = pageWrapperRect.width * 0.9; // 여백 10%
        const maxHeight = pageWrapperRect.height * 0.9; // 여백 10%
        
        // 기본 viewport 가져오기
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;
        
        // 화면에 맞는 scale 계산
        const scaleX = maxWidth / pageWidth;
        const scaleY = maxHeight / pageHeight;
        const scale = Math.min(scaleX, scaleY, 2.0); // 최대 2배까지 확대 가능
        
        // 계산된 scale로 viewport 생성
        const scaledViewport = page.getViewport({ scale: scale });
        
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const ctx = canvas.getContext('2d');
        const renderContext = {
            canvasContext: ctx,
            viewport: scaledViewport
        };

        await page.render(renderContext).promise;
        
        console.log('페이지 렌더링 완료:', pageNum, 'scale:', scale.toFixed(2));
        
        const currentPageElement = document.getElementById('pdfCurrentPage');
        if (currentPageElement) {
            currentPageElement.textContent = pageNum;
        }
        updatePDFButtons();
    } catch (error) {
        console.error('페이지 렌더링 오류:', error);
        alert('페이지를 렌더링할 수 없습니다: ' + error.message);
    }
}

// 다음 페이지
function pdfNextPage() {
    if (currentPageNum < totalPages) {
        currentPageNum++;
        renderPDFPage(currentPageNum);
    }
}

// 이전 페이지
function pdfPrevPage() {
    if (currentPageNum > 1) {
        currentPageNum--;
        renderPDFPage(currentPageNum);
    }
}

// 버튼 상태 업데이트
function updatePDFButtons() {
    const prevBtn = document.getElementById('pdfPrevBtn');
    const nextBtn = document.getElementById('pdfNextBtn');
    const prevBtnBottom = document.getElementById('pdfPrevBtnBottom');
    const nextBtnBottom = document.getElementById('pdfNextBtnBottom');

    const canGoPrev = currentPageNum > 1;
    const canGoNext = currentPageNum < totalPages;

    if (prevBtn) prevBtn.disabled = !canGoPrev;
    if (nextBtn) nextBtn.disabled = !canGoNext;
    if (prevBtnBottom) prevBtnBottom.disabled = !canGoPrev;
    if (nextBtnBottom) nextBtnBottom.disabled = !canGoNext;
}

// 화면 크기 변경 감지 설정
function setupResizeObserver() {
    // 기존 observer 제거
    if (resizeObserver) {
        resizeObserver.disconnect();
    }
    
    const pageWrapper = document.querySelector('.pdf-page-wrapper');
    if (!pageWrapper) return;
    
    // ResizeObserver로 화면 크기 변경 감지
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
            if (currentPDF && currentPageNum > 0) {
                // 현재 페이지 다시 렌더링 (화면 크기에 맞춤)
                renderPDFPage(currentPageNum);
            }
        });
        resizeObserver.observe(pageWrapper);
    } else {
        // ResizeObserver가 지원되지 않으면 window resize 이벤트 사용
        window.addEventListener('resize', () => {
            if (currentPDF && currentPageNum > 0) {
                // 디바운싱 (성능 최적화)
                clearTimeout(window.pdfResizeTimeout);
                window.pdfResizeTimeout = setTimeout(() => {
                    renderPDFPage(currentPageNum);
                }, 250);
            }
        });
    }
}

// PDF 뷰어 닫기
function closePDFViewer() {
    const viewerContainer = document.getElementById('pdfViewerContainer');
    if (viewerContainer) {
        viewerContainer.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
    
    // ResizeObserver 정리
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }
    
    currentPDF = null;
    currentPageNum = 1;
    totalPages = 0;
    currentPDFPath = '';
}

// 키보드 단축키
document.addEventListener('keydown', (e) => {
    const viewerContainer = document.getElementById('pdfViewerContainer');
    if (viewerContainer && viewerContainer.style.display === 'flex') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            pdfNextPage();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            pdfPrevPage();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closePDFViewer();
        }
    }
});

// PDF 모드가 활성화될 때 호출되는 함수 (app.js에서 호출)
function initPDFMode() {
    console.log('PDF 모드 초기화 시작');
    // 약간의 지연 후 렌더링 (DOM 업데이트 대기)
    setTimeout(() => {
        renderPDFBookList();
    }, 100);
}

// 초기 로드 시 PDF 모드가 활성화되어 있으면 렌더링
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // PDF 모드가 이미 활성화되어 있는지 확인
        const pdfMode = document.getElementById('pdf-mode');
        if (pdfMode && pdfMode.classList.contains('active')) {
            console.log('초기 로드 시 PDF 모드 활성화됨');
            initPDFMode();
        }
    });
} else {
    // 이미 로드된 경우
    const pdfMode = document.getElementById('pdf-mode');
    if (pdfMode && pdfMode.classList.contains('active')) {
        console.log('이미 로드된 상태에서 PDF 모드 활성화됨');
        initPDFMode();
    }
}

