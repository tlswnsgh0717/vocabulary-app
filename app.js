// 전역 변수
let vocabularyData = null;
let currentUserName = 'default'; // 현재 사용자 이름
let studyProgress = {
    completedDays: 0,
    studiedWords: 0,
    masteredWords: 0,
    daysProgress: {},
    wordStatus: {}, // wordId -> 'correct' | 'wrong' | 'mastered'
    lastDayNumber: 1, // 마지막 학습 일차
    lastTypingDayStart: 1, // 타이핑 모드 마지막 시작 일차
    lastTypingDayEnd: 100, // 타이핑 모드 마지막 끝 일차
    lastMatchingDayStart: 1, // 매칭 모드 마지막 시작 일차
    lastMatchingDayEnd: 100 // 매칭 모드 마지막 끝 일차
};

// 타이핑 모드 변수
let typingWords = [];
let currentTypingIndex = 0;
let typingStartTime = null;
let typingCorrectCount = 0;
let typingTotalCount = 0;
let typingAnswered = false; // 답변 완료 여부
let typingIsCorrect = false; // 정답 여부
let typingAnswerRevealed = false; // 정답 공개 여부
let typingHintRevealed = false; // 힌트 공개 여부

// 매칭 게임 변수
let matchingWords = [];
let selectedCards = [];
let matchedPairs = 0;

// 일일 단어 모드 변수
let currentDayNumber = 1;
let currentDayWords = [];
let currentWordIndex = 0;
let speedMeaningRevealed = false;

// 데이터 로드
async function loadData() {
    try {
        console.log('데이터 로딩 시작...');
        
        // 먼저 전역 변수에서 데이터를 가져오려고 시도
        if (typeof VOCABULARY_DATA !== 'undefined') {
            vocabularyData = VOCABULARY_DATA;
            console.log('data.js에서 데이터 로드 성공');
        } else {
            // data.js가 없으면 fetch로 시도
            const response = await fetch('vocabulary_app_data.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            vocabularyData = await response.json();
            console.log('JSON 파일에서 데이터 로드 성공');
        }
        
        console.log('데이터 로드 성공:', vocabularyData);
        console.log('총 일차:', vocabularyData.days.length);
        console.log('총 단어:', vocabularyData.metadata.total_words);
        
        // 사용자 이름 로드
        loadUserName();
        
        loadProgress();
        initializeApp();
        
        // 저장된 마지막 일차 불러오기
        if (studyProgress.lastDayNumber) {
            currentDayNumber = studyProgress.lastDayNumber;
        } else {
            // 완료되지 않은 첫 일차 찾기
            if (studyProgress.daysProgress) {
                for (let i = 1; i <= 100; i++) {
                    const dayKey = `day-${i}`;
                    const status = studyProgress.daysProgress[dayKey];
                    if (status !== 'completed') {
                        currentDayNumber = i;
                        break;
                    }
                }
            }
        }
        
        // 타이핑 모드 일차 범위 불러오기
        if (studyProgress.lastTypingDayStart) {
            typingDayStart = studyProgress.lastTypingDayStart;
        }
        if (studyProgress.lastTypingDayEnd) {
            typingDayEnd = studyProgress.lastTypingDayEnd;
        }
        
        // 매칭 모드 일차 범위 불러오기
        if (studyProgress.lastMatchingDayStart) {
            matchingDayStart = studyProgress.lastMatchingDayStart;
        }
        if (studyProgress.lastMatchingDayEnd) {
            matchingDayEnd = studyProgress.lastMatchingDayEnd;
        }
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        console.error('에러 상세:', error.message);
        
        // 사용자에게 명확한 에러 메시지 표시
        const container = document.getElementById('words-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <h3>데이터를 불러올 수 없습니다</h3>
                    <p>${error.message}</p>
                    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
                        data.js 파일이 필요합니다. 페이지를 새로고침해보세요.
                    </p>
                </div>
            `;
        } else {
            alert('데이터를 불러올 수 없습니다. 콘솔을 확인하세요.');
        }
    }
}

// 사용자 이름 로드
function loadUserName() {
    const saved = localStorage.getItem('currentUserName');
    if (saved) {
        currentUserName = saved;
    } else {
        // 기본 사용자 이름 설정
        currentUserName = 'default';
        localStorage.setItem('currentUserName', currentUserName);
    }
    updateUserNameDisplay();
    loadUserList();
}

// 사용자 이름 표시 업데이트
function updateUserNameDisplay() {
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = currentUserName === 'default' ? '사용자' : currentUserName;
    }
}

// 사용자 목록 로드
function loadUserList() {
    const userList = document.getElementById('userList');
    if (!userList) return;
    
    const users = JSON.parse(localStorage.getItem('userList') || '[]');
    if (users.length === 0) {
        userList.innerHTML = '<p class="no-users">저장된 사용자가 없습니다.</p>';
        return;
    }
    
    userList.innerHTML = users.map(user => `
        <div class="user-item ${user === currentUserName ? 'active' : ''}" onclick="switchUser('${user}')">
            <span>${user === 'default' ? '사용자' : user}</span>
            ${user !== currentUserName ? `<button class="user-delete-btn" onclick="deleteUser('${user}', event)">삭제</button>` : ''}
        </div>
    `).join('');
}

// 사용자 전환
function switchUser(userName) {
    if (userName === currentUserName) {
        closeUserModal();
        return;
    }
    
    // 현재 사용자 데이터 저장
    saveProgress();
    
    // 새 사용자로 전환
    currentUserName = userName;
    localStorage.setItem('currentUserName', currentUserName);
    
    // 새 사용자 데이터 로드
    loadProgress();
    updateUserNameDisplay();
    loadUserList();
    
    // UI 업데이트
    updateOverallProgress();
    updateStats();
    
    // 현재 모드 다시 초기화
    const activeMode = document.querySelector('.mode-content.active')?.id;
    if (activeMode) {
        const mode = activeMode.replace('-mode', '');
        showMode(mode);
    }
    
    closeUserModal();
}

// 사용자 삭제
function deleteUser(userName, event) {
    event.stopPropagation();
    
    if (!confirm(`"${userName === 'default' ? '사용자' : userName}"의 모든 학습 데이터를 삭제하시겠습니까?`)) {
        return;
    }
    
    // 사용자 데이터 삭제
    localStorage.removeItem(`studyProgress_${userName}`);
    
    // 사용자 목록에서 제거
    const users = JSON.parse(localStorage.getItem('userList') || '[]');
    const filteredUsers = users.filter(u => u !== userName);
    localStorage.setItem('userList', JSON.stringify(filteredUsers));
    
    // 현재 사용자면 기본 사용자로 전환
    if (userName === currentUserName) {
        switchUser('default');
    } else {
        loadUserList();
    }
}

// 사용자 이름 설정
function setUserName() {
    const input = document.getElementById('userNameInput');
    if (!input) return;
    
    const userName = input.value.trim();
    if (!userName) {
        alert('이름을 입력해주세요.');
        return;
    }
    
    if (userName === 'default') {
        alert('사용할 수 없는 이름입니다.');
        return;
    }
    
    // 사용자 목록에 추가
    const users = JSON.parse(localStorage.getItem('userList') || '[]');
    if (!users.includes(userName)) {
        users.push(userName);
        localStorage.setItem('userList', JSON.stringify(users));
    }
    
    // 사용자 전환
    switchUser(userName);
    input.value = '';
}

// 사용자 모달 표시
function showUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.style.display = 'flex';
        loadUserList();
        const input = document.getElementById('userNameInput');
        if (input) {
            input.focus();
        }
    }
}

// 사용자 모달 닫기
function closeUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.style.display = 'none';
    }
    const input = document.getElementById('userNameInput');
    if (input) {
        input.value = '';
    }
}

// 진행 상황 로드 (사용자별)
function loadProgress() {
    const key = `studyProgress_${currentUserName}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        const loaded = JSON.parse(saved);
        // 기본 구조 유지하면서 로드된 데이터 병합
        studyProgress = {
            completedDays: loaded.completedDays || 0,
            studiedWords: loaded.studiedWords || 0,
            masteredWords: loaded.masteredWords || 0,
            daysProgress: loaded.daysProgress || {},
            wordStatus: loaded.wordStatus || {},
            lastDayNumber: loaded.lastDayNumber || 1,
            lastTypingDayStart: loaded.lastTypingDayStart || 1,
            lastTypingDayEnd: loaded.lastTypingDayEnd || 100,
            lastMatchingDayStart: loaded.lastMatchingDayStart || 1,
            lastMatchingDayEnd: loaded.lastMatchingDayEnd || 100
        };
    } else {
        // 기본값으로 초기화
        studyProgress = {
            completedDays: 0,
            studiedWords: 0,
            masteredWords: 0,
            daysProgress: {},
            wordStatus: {},
            lastDayNumber: 1,
            lastTypingDayStart: 1,
            lastTypingDayEnd: 100,
            lastMatchingDayStart: 1,
            lastMatchingDayEnd: 100
        };
    }
}

// 진행 상황 저장 (사용자별)
function saveProgress() {
    const key = `studyProgress_${currentUserName}`;
    localStorage.setItem(key, JSON.stringify(studyProgress));
    updateOverallProgress();
}

// 앱 초기화
function initializeApp() {
    setupNavigation();
    setupDaySelector();
    setupSearch();
    setupViewToggle();
    showMode('speed'); // 일일 단어 모드를 기본 화면으로
    updateOverallProgress();
    updateStats();
}

// 네비게이션 설정
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const mode = item.dataset.mode;
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            showMode(mode);
        });
    });
}

// 모드 전환
function showMode(mode) {
    document.querySelectorAll('.mode-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const modeMap = {
        'list': 'list-mode',
        'typing': 'typing-mode',
        'matching': 'matching-mode',
        'speed': 'speed-mode',
        'stats': 'stats-mode',
        'pdf': 'pdf-mode'
    };
    
    const modeElement = document.getElementById(modeMap[mode]);
    if (modeElement) {
        modeElement.classList.add('active');
    }
    
    // 각 모드별 초기화
    switch(mode) {
        case 'speed':
            // 현재 진행 중인 일차 찾기
            if (!currentDayNumber || currentDayNumber < 1) {
                currentDayNumber = 1;
            }
            initSpeedMode();
            break;
        case 'list':
            displayWords();
            break;
        case 'typing':
            initTypingMode();
            break;
        case 'matching':
            setupMatchingDaySelectors();
            startMatchingGame();
            break;
        case 'pdf':
            // PDF 모드 초기화
            console.log('PDF 모드 활성화');
            setTimeout(() => {
                if (typeof initPDFMode === 'function') {
                    initPDFMode();
                } else if (typeof renderPDFBookList === 'function') {
                    renderPDFBookList();
                } else {
                    console.error('PDF 뷰어 함수를 찾을 수 없습니다.');
                }
            }, 200);
            break;
        case 'stats':
            updateStats();
            break;
    }
}

// 일차 선택기 설정
function setupDaySelector() {
    if (!vocabularyData || !vocabularyData.days) {
        console.error('데이터가 로드되지 않았습니다.');
        return;
    }
    
    const daySelect = document.getElementById('day-select');
    if (!daySelect) {
        console.error('day-select 요소를 찾을 수 없습니다.');
        return;
    }
    
    vocabularyData.days.forEach(day => {
        const option = document.createElement('option');
        option.value = day.day;
        option.textContent = `${day.day}일차`;
        daySelect.appendChild(option);
    });
    
    daySelect.addEventListener('change', () => {
        displayWords();
        checkStudyComplete();
    });
}

// 검색 설정
function setupSearch() {
    const searchInput = document.getElementById('word-search');
    searchInput.addEventListener('input', () => {
        displayWords();
    });
}

// 뷰 토글 설정
function setupViewToggle() {
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            displayWords();
        });
    });
}

// 단어 표시
function displayWords() {
    // 데이터가 로드되지 않았으면 대기
    if (!vocabularyData || !vocabularyData.days) {
        console.log('데이터 로딩 중...');
        setTimeout(displayWords, 100);
        return;
    }
    
    const container = document.getElementById('words-container');
    if (!container) {
        console.error('words-container를 찾을 수 없습니다.');
        return;
    }
    
    const daySelect = document.getElementById('day-select');
    const searchInput = document.getElementById('word-search');
    
    const selectedDay = daySelect ? daySelect.value : '';
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    container.innerHTML = '';
    container.className = 'words-by-day';
    
    // 일차별로 그룹화
    let daysToShow = [];
    
    if (selectedDay) {
        const dayData = vocabularyData.days.find(d => d.day == selectedDay);
        if (dayData) {
            daysToShow = [dayData];
        }
    } else {
        daysToShow = vocabularyData.days;
    }
    
    daysToShow.forEach(day => {
        let dayWords = day.words;
        
        // 검색 필터 적용
        if (searchTerm) {
            dayWords = dayWords.filter(word => 
                word.word.toLowerCase().includes(searchTerm) ||
                word.meaning.includes(searchTerm)
            );
        }
        
        if (dayWords.length === 0 && searchTerm) {
            return; // 검색 결과가 없으면 해당 일차 스킵
        }
        
        // 일차 헤더
        const daySection = document.createElement('div');
        daySection.className = 'day-section';
        daySection.innerHTML = `<h2 class="day-title">DAY ${day.day}</h2>`;
        
        // 단어 카드들
        const wordsContainer = document.createElement('div');
        wordsContainer.className = 'day-words-container';
        
        dayWords.forEach(word => {
            const wordCard = createSpeedStyleCard({...word, day: day.day});
            wordsContainer.appendChild(wordCard);
        });
        
        daySection.appendChild(wordsContainer);
        container.appendChild(daySection);
    });
    
    if (container.children.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b;">표시할 단어가 없습니다.</div>';
        return;
    }
    
    // 학습 완료 체크
    checkStudyComplete();
    
    console.log(`단어 표시 완료`);
}

// 스피드 스타일 카드 생성
function createSpeedStyleCard(word) {
    const card = document.createElement('div');
    card.className = 'speed-style-card';
    
    const wordKey = `${word.day || 'unknown'}-${word.id}`;
    const status = studyProgress.wordStatus[wordKey];
    let meaningRevealed = false;
    
    card.innerHTML = `
        <div class="speed-style-question">
            <div class="speed-style-word">${word.word}</div>
            <div class="speed-style-pos">${word.pos}</div>
            <div class="speed-style-meaning-hidden">
                <div class="reveal-hint">클릭하여 뜻 보기</div>
            </div>
            <div class="speed-style-meaning" style="display: none;">${word.meaning}</div>
        </div>
        <div class="speed-style-controls">
            <button class="status-btn ${status === 'wrong' ? 'active' : ''}" data-status="wrong">모름</button>
            <button class="status-btn ${status === 'correct' ? 'active' : ''}" data-status="correct">알음</button>
            <button class="status-btn ${status === 'mastered' ? 'active' : ''}" data-status="mastered">완벽히 이해</button>
        </div>
    `;
    
    // 카드 클릭으로 뜻 보기/숨기기
    const questionDiv = card.querySelector('.speed-style-question');
    const meaningHidden = questionDiv.querySelector('.speed-style-meaning-hidden');
    const meaning = questionDiv.querySelector('.speed-style-meaning');
    
    questionDiv.addEventListener('click', (e) => {
        // 버튼 클릭은 무시
        if (e.target.closest('.speed-style-controls')) {
            return;
        }
        
        if (meaningHidden.style.display !== 'none') {
            meaningHidden.style.display = 'none';
            meaning.style.display = 'block';
            meaningRevealed = true;
        } else {
            meaningHidden.style.display = 'block';
            meaning.style.display = 'none';
            meaningRevealed = false;
        }
    });
    
    // 상태 버튼 이벤트
    const statusBtns = card.querySelectorAll('.status-btn:not(.reveal-btn)');
    statusBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newStatus = e.target.dataset.status;
            const oldStatus = studyProgress.wordStatus[wordKey];
            
            // 다른 버튼 비활성화
            statusBtns.forEach(b => {
                b.classList.remove('active');
            });
            
            // 현재 버튼 토글
            if (e.target.classList.contains('active')) {
                e.target.classList.remove('active');
                // 상태 제거
                if (oldStatus === 'mastered') {
                    studyProgress.masteredWords--;
                }
                delete studyProgress.wordStatus[wordKey];
                updateDayProgress(word.day);
            } else {
                e.target.classList.add('active');
                
                // 상태 업데이트
                if (oldStatus === 'mastered') {
                    studyProgress.masteredWords--;
                }
                
                studyProgress.wordStatus[wordKey] = newStatus;
                
                if (newStatus === 'mastered') {
                    studyProgress.masteredWords++;
                }
                
                if (!oldStatus) {
                    studyProgress.studiedWords++;
                }
                
                updateDayProgress(word.day);
            }
            
            saveProgress();
            updateOverallProgress();
            
            setTimeout(() => {
                checkStudyComplete();
            }, 100);
        });
    });
    
    return card;
}

// 일차 진행 상태 업데이트 헬퍼 함수
function updateDayProgress(dayNum) {
    if (!dayNum || !vocabularyData) return;
    
    const dayData = vocabularyData.days.find(d => d.day === dayNum);
    if (!dayData) return;
    
    const dayKey = `day-${dayNum}`;
    let studiedCount = 0;
    let masteredCount = 0;
    
    dayData.words.forEach(w => {
        const wKey = `${dayNum}-${w.id}`;
        const wStatus = studyProgress.wordStatus[wKey];
        if (wStatus) {
            studiedCount++;
            if (wStatus === 'mastered') {
                masteredCount++;
            }
        }
    });
    
    if (studiedCount === 0) {
        studyProgress.daysProgress[dayKey] = 'not_started';
    } else if (masteredCount === dayData.words.length && dayData.words.length > 0) {
        studyProgress.daysProgress[dayKey] = 'completed';
    } else {
        studyProgress.daysProgress[dayKey] = 'in-progress';
    }
    
    studyProgress.completedDays = Object.values(studyProgress.daysProgress).filter(s => s === 'completed').length;
}

// 단어 카드 생성 (기존 함수 - 사용하지 않음)
function createWordCard(word) {
    const card = document.createElement('div');
    card.className = 'word-card';
    
    const wordKey = `${word.day || 'unknown'}-${word.id}`;
    const status = studyProgress.wordStatus[wordKey];
    
    card.innerHTML = `
        <div class="word-card-header">
            <div class="word-text">${word.word}</div>
            <div class="pos-badge">${word.pos}</div>
        </div>
        <div class="meaning-text">${word.meaning}</div>
        <div class="word-meta">
            <span class="word-status">
                ${word.day ? `${word.day}일차` : ''}
            </span>
            <div class="word-status-controls">
                <label class="status-checkbox">
                    <input type="checkbox" class="status-check" data-status="wrong" ${status === 'wrong' ? 'checked' : ''}>
                    <span>❌ 모름</span>
                </label>
                <label class="status-checkbox">
                    <input type="checkbox" class="status-check" data-status="correct" ${status === 'correct' ? 'checked' : ''}>
                    <span>✅ 알음</span>
                </label>
                <label class="status-checkbox">
                    <input type="checkbox" class="status-check" data-status="mastered" ${status === 'mastered' ? 'checked' : ''}>
                    <span>⭐ 완벽히 암기</span>
                </label>
            </div>
        </div>
    `;
    
    // 체크박스 이벤트
    const checkboxes = card.querySelectorAll('.status-check');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const newStatus = e.target.dataset.status;
            const oldStatus = studyProgress.wordStatus[wordKey];
            
            // 다른 체크박스 해제
            checkboxes.forEach(cb => {
                if (cb !== e.target) {
                    cb.checked = false;
                }
            });
            
            // 상태 업데이트
            if (e.target.checked) {
                // 이전 상태가 있으면 먼저 제거
                if (oldStatus === 'mastered') {
                    studyProgress.masteredWords--;
                }
                
                studyProgress.wordStatus[wordKey] = newStatus;
                
                if (newStatus === 'mastered') {
                    studyProgress.masteredWords++;
                }
                
                // 처음 학습하는 경우에만 studiedWords 증가
                if (!oldStatus) {
                    studyProgress.studiedWords++;
                }
                
                // 일차 진행 상태 업데이트
                if (word.day) {
                    const dayKey = `day-${word.day}`;
                    const dayData = vocabularyData.days.find(d => d.day === word.day);
                    
                    if (dayData) {
                        // 해당 일차의 단어 상태 확인
                        let masteredCount = 0;
                        let studiedCount = 0;
                        
                        dayData.words.forEach(w => {
                            const wKey = `${word.day}-${w.id}`;
                            const wStatus = studyProgress.wordStatus[wKey];
                            if (wStatus) {
                                studiedCount++;
                                if (wStatus === 'mastered') {
                                    masteredCount++;
                                }
                            }
                        });
                        
                        // 일차 진행 상태 설정
                        if (masteredCount === dayData.words.length && dayData.words.length > 0) {
                            studyProgress.daysProgress[dayKey] = 'completed';
                            studyProgress.completedDays = Object.values(studyProgress.daysProgress).filter(s => s === 'completed').length;
                        } else if (studiedCount > 0) {
                            studyProgress.daysProgress[dayKey] = 'in-progress';
                        } else {
                            studyProgress.daysProgress[dayKey] = 'not_started';
                        }
                    }
                }
            } else {
                // 체크 해제 시 상태 제거
                if (oldStatus === 'mastered') {
                    studyProgress.masteredWords--;
                }
                delete studyProgress.wordStatus[wordKey];
                
                // 일차 진행 상태 업데이트
                if (word.day) {
                    const dayKey = `day-${word.day}`;
                    const dayData = vocabularyData.days.find(d => d.day === word.day);
                    
                    if (dayData) {
                        let studiedCount = 0;
                        let masteredCount = 0;
                        
                        dayData.words.forEach(w => {
                            const wKey = `${word.day}-${w.id}`;
                            const wStatus = studyProgress.wordStatus[wKey];
                            if (wStatus) {
                                studiedCount++;
                                if (wStatus === 'mastered') {
                                    masteredCount++;
                                }
                            }
                        });
                        
                        if (studiedCount === 0) {
                            studyProgress.daysProgress[dayKey] = 'not_started';
                        } else if (masteredCount === dayData.words.length) {
                            studyProgress.daysProgress[dayKey] = 'completed';
                        } else {
                            studyProgress.daysProgress[dayKey] = 'in-progress';
                        }
                        
                        studyProgress.completedDays = Object.values(studyProgress.daysProgress).filter(s => s === 'completed').length;
                    }
                }
            }
            
            saveProgress();
            updateOverallProgress();
            
            // 학습 완료 체크만 수행 (전체 목록 새로고침하지 않음)
            setTimeout(() => {
                checkStudyComplete();
            }, 100);
        });
    });
    
    // 카드 클릭 시 뜻 표시/숨김 토글
    card.addEventListener('click', (e) => {
        // 체크박스나 메타 정보 클릭은 무시
        if (e.target.closest('.word-status-controls') || e.target.closest('.status-check')) {
            return;
        }
        
        // 카드 클릭은 뜻 표시/숨김
        card.classList.toggle('revealed');
    });
    
    return card;
}

// 단어 상태 토글
function toggleWordStatus(word, wordKey) {
    const currentStatus = studyProgress.wordStatus[wordKey];
    let newStatus;
    
    if (!currentStatus || currentStatus === 'wrong') {
        newStatus = 'correct';
    } else if (currentStatus === 'correct') {
        newStatus = 'mastered';
        studyProgress.masteredWords++;
    } else {
        newStatus = 'wrong';
        if (studyProgress.masteredWords > 0) studyProgress.masteredWords--;
    }
    
    studyProgress.wordStatus[wordKey] = newStatus;
    studyProgress.studiedWords++;
    saveProgress();
    displayWords();
}

// 타이핑 모드 초기화
let typingDayStart = 1;
let typingDayEnd = 100;

function initTypingMode() {
    // 일차 선택기 초기화
    setupTypingDaySelectors();
    
    // 저장된 일차 범위 적용
    const startSelect = document.getElementById('typing-day-start');
    const endSelect = document.getElementById('typing-day-end');
    if (startSelect && endSelect) {
        startSelect.value = typingDayStart;
        endSelect.value = typingDayEnd;
    }
    
    applyTypingRange();
    
    const input = document.getElementById('typing-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !input.disabled) {
                checkTypingAnswer();
            }
        });
    }
    
    // 확인 버튼 이벤트
    const checkBtn = document.querySelector('.check-btn');
    if (checkBtn) {
        checkBtn.onclick = () => {
            if (!input.disabled) {
                checkTypingAnswer();
            }
        };
    }
}

function setupTypingDaySelectors() {
    const startSelect = document.getElementById('typing-day-start');
    const endSelect = document.getElementById('typing-day-end');
    
    if (!startSelect || !endSelect || !vocabularyData) return;
    
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';
    
    vocabularyData.days.forEach(day => {
        const option1 = document.createElement('option');
        option1.value = day.day;
        option1.textContent = `${day.day}일차`;
        startSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = day.day;
        option2.textContent = `${day.day}일차`;
        endSelect.appendChild(option2);
    });
    
    startSelect.value = typingDayStart;
    endSelect.value = typingDayEnd;
}

function applyTypingRange() {
    const startSelect = document.getElementById('typing-day-start');
    const endSelect = document.getElementById('typing-day-end');
    
    if (!startSelect || !endSelect) return;
    
    typingDayStart = parseInt(startSelect.value);
    typingDayEnd = parseInt(endSelect.value);
    
    // 마지막 사용한 일차 범위 저장
    studyProgress.lastTypingDayStart = typingDayStart;
    studyProgress.lastTypingDayEnd = typingDayEnd;
    saveProgress();
    
    // 선택된 일차 범위의 단어만 가져오기
    typingWords = [];
    vocabularyData.days.forEach(day => {
        if (day.day >= typingDayStart && day.day <= typingDayEnd) {
            day.words.forEach(word => {
                typingWords.push({...word, day: day.day});
            });
        }
    });
    
    // 랜덤 셔플
    for (let i = typingWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [typingWords[i], typingWords[j]] = [typingWords[j], typingWords[i]];
    }
    
    currentTypingIndex = 0;
    typingCorrectCount = 0;
    typingTotalCount = 0;
    typingStartTime = Date.now();
    
    if (typingWords.length === 0) {
        alert('선택한 일차 범위에 단어가 없습니다.');
        return;
    }
    
    showTypingWord();
    const input = document.getElementById('typing-input');
    if (input) input.focus();
}

// 타이핑 단어 표시
function showTypingWord() {
    if (currentTypingIndex >= typingWords.length) {
        // 모든 단어 완료
        const accuracy = typingTotalCount > 0 ? Math.round((typingCorrectCount / typingTotalCount) * 100) : 0;
        alert(`연습 완료!\n정확도: ${accuracy}%\n맞춘 개수: ${typingCorrectCount} / ${typingTotalCount}`);
        currentTypingIndex = 0;
        typingCorrectCount = 0;
        typingTotalCount = 0;
        typingStartTime = Date.now();
    }
    
    const word = typingWords[currentTypingIndex];
    document.getElementById('typing-meaning').textContent = word.meaning;
    document.getElementById('typing-pos').textContent = word.pos;
    document.getElementById('typing-input').value = '';
    document.getElementById('typing-result').textContent = '';
    document.getElementById('typing-hint').textContent = '';
    
    // 상태 초기화
    typingAnswered = false;
    typingIsCorrect = false;
    typingAnswerRevealed = false;
    typingHintRevealed = false;
    
    const input = document.getElementById('typing-input');
    input.disabled = false;
    input.style.borderColor = '';
    input.focus();
    
    // 버튼 숨기기 및 초기화
    const nextBtn = document.getElementById('typing-next');
    const hintBtn = document.getElementById('typing-hint-btn');
    const answerBtn = document.getElementById('typing-answer-btn');
    
    if (nextBtn) {
        nextBtn.style.display = 'none';
        nextBtn.textContent = '다음 단어';
    }
    if (hintBtn) {
        hintBtn.style.display = 'none';
    }
    if (answerBtn) {
        answerBtn.style.display = 'none';
    }
}

// 타이핑 답 확인
function checkTypingAnswer() {
    // 이미 답변했고 정답이면 다음으로 넘어가기
    if (typingAnswered && typingIsCorrect) {
        nextTypingWord();
        return;
    }
    
    const input = document.getElementById('typing-input');
    const userAnswer = input.value.trim().toLowerCase();
    
    if (!userAnswer) {
        return; // 빈 입력은 무시
    }
    
    const correctAnswer = typingWords[currentTypingIndex].word.toLowerCase();
    const resultDiv = document.getElementById('typing-result');
    const nextBtn = document.getElementById('typing-next');
    const hintBtn = document.getElementById('typing-hint-btn');
    const answerBtn = document.getElementById('typing-answer-btn');
    
    if (userAnswer === correctAnswer) {
        // 정답
        typingAnswered = true;
        typingIsCorrect = true;
        typingTotalCount++;
        typingCorrectCount++;
        
        resultDiv.textContent = '정답입니다! ✅';
        resultDiv.className = 'typing-result correct';
        input.style.borderColor = '#10b981';
        input.disabled = true;
        
        // 버튼 숨기기
        if (hintBtn) hintBtn.style.display = 'none';
        if (answerBtn) answerBtn.style.display = 'none';
        
        updateTypingStats();
        
        // 1초 후 자동으로 다음 단어로
        setTimeout(() => {
            nextTypingWord();
        }, 1000);
    } else {
        // 오답
        typingAnswered = true;
        typingIsCorrect = false;
        typingTotalCount++;
        
        resultDiv.textContent = '오답입니다! ❌';
        resultDiv.className = 'typing-result wrong';
        input.style.borderColor = '#ef4444';
        
        // 힌트 버튼과 정답 보기 버튼 표시
        if (hintBtn) {
            hintBtn.style.display = 'inline-block';
        }
        if (answerBtn) {
            answerBtn.style.display = 'inline-block';
        }
        
        // 다음 버튼 표시 (다시 입력할 수 있게)
        if (nextBtn) {
            nextBtn.style.display = 'block';
            nextBtn.textContent = '다시 시도';
            nextBtn.onclick = () => {
                input.value = '';
                input.disabled = false;
                input.focus();
                input.style.borderColor = '';
                resultDiv.textContent = '';
                document.getElementById('typing-hint').textContent = '';
                typingAnswered = false;
                typingAnswerRevealed = false;
                typingHintRevealed = false;
                nextBtn.style.display = 'none';
                if (hintBtn) hintBtn.style.display = 'none';
                if (answerBtn) answerBtn.style.display = 'none';
            };
        }
        
        updateTypingStats();
    }
}

// 힌트 보기
function showTypingHint() {
    if (typingHintRevealed) return;
    
    const correctAnswer = typingWords[currentTypingIndex].word.toLowerCase();
    const hintDiv = document.getElementById('typing-hint');
    hintDiv.textContent = `힌트: "${correctAnswer.charAt(0).toUpperCase()}"로 시작합니다`;
    hintDiv.style.display = 'block';
    typingHintRevealed = true;
}

// 정답 보기
function showTypingAnswer() {
    if (typingAnswerRevealed) return;
    
    const correctAnswer = typingWords[currentTypingIndex].word;
    const resultDiv = document.getElementById('typing-result');
    resultDiv.textContent = `정답: ${correctAnswer}`;
    resultDiv.className = 'typing-result';
    resultDiv.style.color = '#f59e0b';
    
    const input = document.getElementById('typing-input');
    input.value = correctAnswer;
    input.disabled = true;
    input.style.borderColor = '#f59e0b';
    
    typingAnswerRevealed = true;
    
    // 다음 버튼 표시
    const nextBtn = document.getElementById('typing-next');
    if (nextBtn) {
        nextBtn.style.display = 'block';
        nextBtn.textContent = '다음 단어';
        nextBtn.onclick = () => {
            nextTypingWord();
        };
    }
}

// 다음 타이핑 단어
function nextTypingWord() {
    if (typingAnswered) {
        currentTypingIndex++;
    }
    showTypingWord();
}

// 타이핑 통계 업데이트
function updateTypingStats() {
    const elapsed = (Date.now() - typingStartTime) / 1000 / 60; // 분
    const wpm = Math.round(typingTotalCount / elapsed);
    const accuracy = typingTotalCount > 0 ? Math.round((typingCorrectCount / typingTotalCount) * 100) : 0;
    
    document.getElementById('typing-speed').textContent = wpm || 0;
    document.getElementById('typing-accuracy').textContent = accuracy + '%';
}

// 매칭 게임 변수
let matchingDayStart = 1;
let matchingDayEnd = 100;

function setupMatchingDaySelectors() {
    const startSelect = document.getElementById('matching-day-start');
    const endSelect = document.getElementById('matching-day-end');
    
    // 저장된 일차 범위 적용
    if (startSelect) startSelect.value = matchingDayStart;
    if (endSelect) endSelect.value = matchingDayEnd;
    
    if (!startSelect || !endSelect || !vocabularyData) return;
    
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';
    
    vocabularyData.days.forEach(day => {
        const option1 = document.createElement('option');
        option1.value = day.day;
        option1.textContent = `${day.day}일차`;
        startSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = day.day;
        option2.textContent = `${day.day}일차`;
        endSelect.appendChild(option2);
    });
    
    startSelect.value = matchingDayStart;
    endSelect.value = matchingDayEnd;
}

function applyMatchingRange() {
    const startSelect = document.getElementById('matching-day-start');
    const endSelect = document.getElementById('matching-day-end');
    
    if (!startSelect || !endSelect) return;
    
    matchingDayStart = parseInt(startSelect.value);
    matchingDayEnd = parseInt(endSelect.value);
    
    // 마지막 사용한 일차 범위 저장
    studyProgress.lastMatchingDayStart = matchingDayStart;
    studyProgress.lastMatchingDayEnd = matchingDayEnd;
    saveProgress();
    
    startMatchingGame();
}

// 매칭 게임 시작
function startMatchingGame() {
    // 선택된 일차 범위의 단어만 가져오기
    const allWords = [];
    vocabularyData.days.forEach(day => {
        if (day.day >= matchingDayStart && day.day <= matchingDayEnd) {
            day.words.forEach(word => {
                allWords.push({...word, day: day.day});
            });
        }
    });
    
    if (allWords.length === 0) {
        alert('선택한 일차 범위에 단어가 없습니다.');
        return;
    }
    
    // 랜덤 셔플
    for (let i = allWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
    }
    
    // 최대 10개만 선택
    matchingWords = allWords.slice(0, Math.min(10, allWords.length));
    selectedCards = [];
    matchedPairs = 0;
    
    displayMatchingBoard();
}

// 매칭 보드 표시
function displayMatchingBoard() {
    const board = document.getElementById('matching-board');
    board.innerHTML = '';
    
    // 왼쪽 컬럼 (영어단어)과 오른쪽 컬럼 (뜻) 생성
    const leftColumn = document.createElement('div');
    leftColumn.className = 'matching-column matching-column-left';
    
    const rightColumn = document.createElement('div');
    rightColumn.className = 'matching-column matching-column-right';
    
    // 영어단어 배열 생성 및 셔플
    const words = matchingWords.map(word => ({
        type: 'word',
        content: word.word,
        id: word.id
    }));
    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }
    
    // 뜻 배열 생성 및 셔플
    const meanings = matchingWords.map(word => ({
        type: 'meaning',
        content: word.meaning,
        id: word.id
    }));
    for (let i = meanings.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [meanings[i], meanings[j]] = [meanings[j], meanings[i]];
    }
    
    // 왼쪽 컬럼에 영어단어 카드 추가
    words.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'matching-card';
        card.textContent = item.content;
        card.dataset.type = item.type;
        card.dataset.id = item.id;
        card.dataset.index = index;
        
        card.addEventListener('click', () => selectMatchingCard(card));
        leftColumn.appendChild(card);
    });
    
    // 오른쪽 컬럼에 뜻 카드 추가
    meanings.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'matching-card';
        card.textContent = item.content;
        card.dataset.type = item.type;
        card.dataset.id = item.id;
        card.dataset.index = index;
        
        card.addEventListener('click', () => selectMatchingCard(card));
        rightColumn.appendChild(card);
    });
    
    board.appendChild(leftColumn);
    board.appendChild(rightColumn);
    
    document.getElementById('matching-score').textContent = '0';
    document.getElementById('matching-count').textContent = '0';
    document.getElementById('matching-total').textContent = matchingWords.length.toString();
}

// 매칭 카드 선택
function selectMatchingCard(card) {
    if (card.classList.contains('matched') || card.classList.contains('selected')) {
        return;
    }
    
    card.classList.add('selected');
    selectedCards.push(card);
    
    if (selectedCards.length === 2) {
        checkMatching();
    }
}

// 매칭 확인
function checkMatching() {
    const [card1, card2] = selectedCards;
    
    if (card1.dataset.type !== card2.dataset.type && card1.dataset.id === card2.dataset.id) {
        // 매칭 성공
        card1.classList.add('matched');
        card2.classList.add('matched');
        card1.classList.remove('selected');
        card2.classList.remove('selected');
        matchedPairs++;
        
        const score = parseInt(document.getElementById('matching-score').textContent) + 10;
        document.getElementById('matching-score').textContent = score;
        document.getElementById('matching-count').textContent = matchedPairs;
        
        if (matchedPairs === matchingWords.length) {
            setTimeout(() => {
                alert(`게임 완료! 점수: ${score}`);
            }, 500);
        }
    } else {
        // 매칭 실패
        setTimeout(() => {
            card1.classList.remove('selected');
            card2.classList.remove('selected');
        }, 1000);
    }
    
    selectedCards = [];
}

// 일일 단어 모드 초기화
function initSpeedMode() {
    // 일차 선택기 설정
    setupSpeedDaySelector();
    
    // 저장된 마지막 일차 사용
    if (studyProgress.lastDayNumber && studyProgress.lastDayNumber >= 1 && studyProgress.lastDayNumber <= 100) {
        currentDayNumber = studyProgress.lastDayNumber;
    } else if (!currentDayNumber || currentDayNumber < 1) {
        currentDayNumber = 1;
    }
    
    loadDayWords(currentDayNumber);
}

// 일일 단어 일차 선택기 설정
function setupSpeedDaySelector() {
    const daySelect = document.getElementById('speed-day-select');
    if (!daySelect || !vocabularyData) return;
    
    daySelect.innerHTML = '';
    
    vocabularyData.days.forEach(day => {
        const option = document.createElement('option');
        option.value = day.day;
        option.textContent = `DAY ${day.day}`;
        daySelect.appendChild(option);
    });
    
    // 저장된 마지막 일차 또는 현재 일차 사용
    const savedDay = studyProgress.lastDayNumber || currentDayNumber || 1;
    daySelect.value = savedDay;
    if (!currentDayNumber || currentDayNumber < 1) {
        currentDayNumber = savedDay;
    }
}

// 일일 단어 일차 적용
function applySpeedDay() {
    const daySelect = document.getElementById('speed-day-select');
    if (!daySelect) return;
    
    const selectedDay = parseInt(daySelect.value);
    if (selectedDay >= 1 && selectedDay <= 100) {
        currentDayNumber = selectedDay;
        studyProgress.lastDayNumber = currentDayNumber;
        saveProgress();
        loadDayWords(currentDayNumber);
    }
}

// 일차별 단어 로드
function loadDayWords(dayNum) {
    const dayData = vocabularyData.days.find(d => d.day === dayNum);
    
    if (!dayData) {
        alert('해당 일차를 찾을 수 없습니다.');
        return;
    }
    
    currentDayWords = [...dayData.words];
    currentWordIndex = 0;
    currentDayNumber = dayNum;
    
    // 일차 선택기 업데이트
    const daySelect = document.getElementById('speed-day-select');
    if (daySelect) {
        daySelect.value = dayNum;
    }
    
    // UI 업데이트
    document.getElementById('current-day').textContent = dayNum;
    document.getElementById('day-total').textContent = currentDayWords.length;
    updateDayProgress();
    
    showSpeedWord();
}

// 일차 진행률 업데이트
function updateDayProgress() {
    document.getElementById('day-progress').textContent = currentWordIndex;
}

// 일일 단어 표시
function showSpeedWord() {
    if (currentWordIndex >= currentDayWords.length) {
        // 현재 일차 완료
        const dayKey = `day-${currentDayNumber}`;
        studyProgress.daysProgress[dayKey] = 'completed';
        studyProgress.completedDays = Object.values(studyProgress.daysProgress).filter(s => s === 'completed').length;
        
        // 다음 일차로 자동 이동
        currentDayNumber++;
        if (currentDayNumber > 100) {
            currentDayNumber = 1;
        }
        
        // 마지막 일차 저장
        studyProgress.lastDayNumber = currentDayNumber;
        saveProgress();
        
        // 완료 메시지
        alert(`DAY ${currentDayNumber - 1} 완료! 🎉\n다음 일차(DAY ${currentDayNumber})로 이동합니다.`);
        
        loadDayWords(currentDayNumber);
        return;
    }
    
    const word = currentDayWords[currentWordIndex];
    document.getElementById('speed-word').textContent = word.word;
    
    // 뜻 가리기
    speedMeaningRevealed = false;
    document.getElementById('speed-meaning-hidden').style.display = 'block';
    document.getElementById('speed-meaning').style.display = 'none';
    document.getElementById('speed-meaning').textContent = word.meaning;
    document.getElementById('speed-result').textContent = '';
    
    updateDayProgress();
}

function revealSpeedMeaning() {
    if (speedMeaningRevealed) return;
    
    speedMeaningRevealed = true;
    document.getElementById('speed-meaning-hidden').style.display = 'none';
    document.getElementById('speed-meaning').style.display = 'block';
}

// 일일 단어 답변
function speedAnswer(isCorrect) {
    // 뜻이 아직 안 보이면 먼저 보여주기
    if (!speedMeaningRevealed) {
        revealSpeedMeaning();
        return;
    }
    
    const word = currentDayWords[currentWordIndex];
    const wordKey = `${currentDayNumber}-${word.id}`;
    
    // 학습 상태 저장
    if (isCorrect) {
        studyProgress.wordStatus[wordKey] = 'correct';
        studyProgress.studiedWords++;
    } else {
        studyProgress.wordStatus[wordKey] = 'wrong';
        studyProgress.studiedWords++;
    }
    
    saveProgress();
    
    const resultDiv = document.getElementById('speed-result');
    
    if (isCorrect) {
        resultDiv.textContent = '✅';
        resultDiv.style.color = '#10b981';
    } else {
        resultDiv.textContent = '❌';
        resultDiv.style.color = '#ef4444';
    }
    
    setTimeout(() => {
        currentWordIndex++;
        showSpeedWord();
    }, 500);
}

// 일일 단어 일차 적용 (전역 함수)
window.applySpeedDay = applySpeedDay;

// 통계 업데이트
function updateStats() {
    document.getElementById('stat-total-days').textContent = studyProgress.completedDays || 0;
    document.getElementById('stat-studied').textContent = studyProgress.studiedWords || 0;
    document.getElementById('stat-mastered').textContent = studyProgress.masteredWords || 0;
    
    const accuracy = studyProgress.studiedWords > 0 
        ? Math.round((studyProgress.masteredWords / studyProgress.studiedWords) * 100)
        : 0;
    document.getElementById('stat-accuracy').textContent = accuracy + '%';
    
    // 일차별 진행 상황
    const progressList = document.getElementById('day-progress-list');
    progressList.innerHTML = '';
    
    vocabularyData.days.forEach(day => {
        const dayKey = `day-${day.day}`;
        const status = studyProgress.daysProgress[dayKey] || '미시작';
        const statusText = {
            'completed': '✅ 완료',
            'in-progress': '🔄 진행중',
            'not_started': '⏸ 미시작'
        }[status] || '⏸ 미시작';
        
        const item = document.createElement('div');
        item.className = 'day-progress-item';
        item.innerHTML = `
            <span class="day-progress-item-title">${day.day}일차</span>
            <span class="day-progress-item-status">${statusText}</span>
        `;
        progressList.appendChild(item);
    });
}

// 전체 진행률 업데이트
function updateOverallProgress() {
    const totalWords = vocabularyData.metadata.total_words;
    const studiedWords = Object.keys(studyProgress.wordStatus).length;
    const progress = Math.round((studiedWords / totalWords) * 100);
    
    document.getElementById('overall-progress').textContent = progress + '%';
    document.getElementById('overall-progress-bar').style.width = progress + '%';
}

// 타이핑 연습으로 이동
function goToTypingPractice() {
    const daySelect = document.getElementById('day-select');
    const selectedDay = daySelect ? daySelect.value : '';
    
    if (selectedDay) {
        // 선택된 일차의 범위 설정
        const typingStartSelect = document.getElementById('typing-day-start');
        const typingEndSelect = document.getElementById('typing-day-end');
        
        if (typingStartSelect && typingEndSelect) {
            typingStartSelect.value = selectedDay;
            typingEndSelect.value = selectedDay;
        }
    }
    
    // 타이핑 모드로 전환
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.mode === 'typing') {
            item.classList.add('active');
        }
    });
    
    showMode('typing');
}

// 학습 완료 체크
function checkStudyComplete() {
    const daySelect = document.getElementById('day-select');
    const selectedDay = daySelect ? daySelect.value : '';
    
    if (!selectedDay) {
        const section = document.getElementById('study-complete-section');
        if (section) {
            section.style.display = 'none';
        }
        return;
    }
    
    if (!vocabularyData || !vocabularyData.days) {
        return;
    }
    
    const dayData = vocabularyData.days.find(d => d.day == selectedDay);
    if (!dayData) {
        const section = document.getElementById('study-complete-section');
        if (section) {
            section.style.display = 'none';
        }
        return;
    }
    
    // 해당 일차의 모든 단어가 암기 완료되었는지 확인
    let masteredCount = 0;
    dayData.words.forEach(word => {
        const wordKey = `${dayData.day}-${word.id}`;
        if (studyProgress.wordStatus[wordKey] === 'mastered') {
            masteredCount++;
        }
    });
    
    // 모든 단어가 완벽히 암기되었으면 완료 메시지 표시
    const section = document.getElementById('study-complete-section');
    if (section) {
        if (masteredCount === dayData.words.length && dayData.words.length > 0) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    }
}

// 카드 뜻 보기 함수
function revealCardMeaning(element) {
    const meaningHidden = element.querySelector('.speed-style-meaning-hidden');
    const meaning = element.querySelector('.speed-style-meaning');
    
    if (meaningHidden && meaning) {
        if (meaningHidden.style.display !== 'none') {
            meaningHidden.style.display = 'none';
            meaning.style.display = 'block';
        } else {
            meaningHidden.style.display = 'block';
            meaning.style.display = 'none';
        }
    }
}

// 전역 함수
window.nextTypingWord = nextTypingWord;
window.startMatchingGame = startMatchingGame;
window.applyTypingRange = applyTypingRange;
window.applyMatchingRange = applyMatchingRange;
window.checkTypingAnswer = checkTypingAnswer;
window.showTypingHint = showTypingHint;
window.showTypingAnswer = showTypingAnswer;
window.goToTypingPractice = goToTypingPractice;
window.revealCardMeaning = revealCardMeaning;
window.speedAnswer = speedAnswer;
window.revealSpeedMeaning = revealSpeedMeaning;
window.showUserModal = showUserModal;
window.closeUserModal = closeUserModal;
window.setUserName = setUserName;
window.switchUser = switchUser;
window.deleteUser = deleteUser;

// 모바일 메뉴 토글
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('mobile-menu-btn');
    
    sidebar.classList.toggle('mobile-open');
    menuBtn.classList.toggle('active');
}

// 사이드바 외부 클릭 시 메뉴 닫기
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('mobile-menu-btn');
    
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
            menuBtn.classList.remove('active');
        }
    }
});

// 네비게이션 클릭 시 모바일에서 메뉴 닫기
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                const menuBtn = document.getElementById('mobile-menu-btn');
                sidebar.classList.remove('mobile-open');
                menuBtn.classList.remove('active');
            }
        });
    });
});

window.toggleMobileMenu = toggleMobileMenu;

// QR 코드 표시
function showQRCode() {
    const container = document.getElementById('qr-code-container');
    const canvasContainer = document.getElementById('qr-code-canvas');
    const urlElement = document.getElementById('qr-url');
    
    // 기존 QR 코드 제거
    canvasContainer.innerHTML = '';
    
    // 현재 URL 가져오기
    let currentURL = window.location.href;
    let displayURL = currentURL;
    
    // 로컬 파일인 경우 (file:// 프로토콜)
    if (currentURL.startsWith('file://')) {
        // 사용자에게 서버 실행 안내
        urlElement.innerHTML = `
            <strong>⚠️ 웹 서버를 실행해야 합니다</strong><br><br>
            <strong>1단계:</strong> 터미널에서 다음 명령어 실행:<br>
            <code style="background: #f4f4f4; padding: 5px; border-radius: 4px; display: block; margin: 10px 0;">
            cd "/Users/ma2206/Desktop/어플만들기/vocabulary-app"<br>
            python3 -m http.server 8000
            </code><br>
            <strong>2단계:</strong> 컴퓨터의 IP 주소 확인 (예: 192.168.0.100)<br>
            <strong>3단계:</strong> 모바일 브라우저에서 <code>http://[IP주소]:8000</code> 접속<br><br>
            <small>또는 GitHub Pages/Netlify에 배포하여 사용하세요.</small>
        `;
        container.style.display = 'flex';
        return;
    }
    
    // HTTP 서버로 실행 중인 경우
    displayURL = currentURL.split('/').slice(0, 3).join('/'); // 프로토콜 + 호스트 + 포트
    
    container.style.display = 'flex';
    urlElement.textContent = displayURL;
    
    // QR 코드 생성
    if (typeof QRCode !== 'undefined') {
        try {
            // Canvas 요소 생성
            const canvas = document.createElement('canvas');
            canvasContainer.appendChild(canvas);
            
            // QR 코드 생성
            QRCode.toCanvas(canvas, displayURL, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'H'
            }, function (error) {
                if (error) {
                    console.error('QR 코드 생성 실패:', error);
                    canvasContainer.innerHTML = `
                        <div style="padding: 20px; text-align: center;">
                            <p style="color: red; margin-bottom: 15px;">QR 코드 생성 실패</p>
                            <p><strong>URL을 직접 입력하세요:</strong></p>
                            <code style="background: #f4f4f4; padding: 10px; border-radius: 4px; display: block; margin: 10px 0; word-break: break-all;">${displayURL}</code>
                        </div>
                    `;
                }
            });
        } catch (error) {
            console.error('QR 코드 생성 오류:', error);
            canvasContainer.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <p style="color: red; margin-bottom: 15px;">QR 코드 생성 실패</p>
                    <p><strong>URL을 직접 입력하세요:</strong></p>
                    <code style="background: #f4f4f4; padding: 10px; border-radius: 4px; display: block; margin: 10px 0; word-break: break-all;">${displayURL}</code>
                </div>
            `;
        }
    } else {
        // 라이브러리가 로드되지 않은 경우
        canvasContainer.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <p>QR 코드 라이브러리 로딩 중...</p>
                <p style="margin-top: 20px;"><strong>잠시 후 다시 시도하거나 URL을 직접 입력하세요:</strong></p>
                <code style="background: #f4f4f4; padding: 10px; border-radius: 4px; display: block; margin: 10px 0; word-break: break-all;">${displayURL}</code>
            </div>
        `;
        
        // 라이브러리 로드 대기 후 재시도
        let retryCount = 0;
        const checkLibrary = setInterval(() => {
            retryCount++;
            if (typeof QRCode !== 'undefined') {
                clearInterval(checkLibrary);
                showQRCode();
            } else if (retryCount > 10) {
                clearInterval(checkLibrary);
                canvasContainer.innerHTML = `
                    <div style="padding: 20px; text-align: center;">
                        <p style="color: red;">QR 코드 라이브러리를 로드할 수 없습니다.</p>
                        <p style="margin-top: 15px;"><strong>URL을 직접 입력하세요:</strong></p>
                        <code style="background: #f4f4f4; padding: 10px; border-radius: 4px; display: block; margin: 10px 0; word-break: break-all;">${displayURL}</code>
                    </div>
                `;
            }
        }, 500);
    }
}

// QR 코드 닫기
function closeQRCode() {
    document.getElementById('qr-code-container').style.display = 'none';
}

window.showQRCode = showQRCode;
window.closeQRCode = closeQRCode;

// 앱 시작
loadData();
