let currentDate = '';
let availableDates = [];
let currentView = 'grid'; // 'grid' 또는 'list'
let currentCategory = 'all';
let urlCategoryParam = null; // URL 파라미터에서 가져온 category
let urlJsonParam = null; // URL 파라미터에서 가져온 json (API 모드)
let urlAuthorParam = null; // URL 파라미터에서 가져온 author
let urlKeywordsParam = null; // URL 파라미터에서 가져온 keywords
let paperData = {};
let flatpickrInstance = null;
let isRangeMode = false;
let activeKeywords = []; // 활성화된 키워드 저장
let userKeywords = []; // 사용자 키워드 저장
let activeAuthors = []; // 활성화된 저자 저장
let userAuthors = []; // 사용자 저자 저장
let currentPaperIndex = 0; // 현재 조회 중인 논문 인덱스
let currentFilteredPapers = []; // 현재 필터링된 논문 목록
let textSearchQuery = ''; // 실시간 텍스트 검색 쿼리
let previousActiveKeywords = null; // 텍스트 검색 활성화 시 이전 키워드 활성 집합 임시 저장
let previousActiveAuthors = null; // 텍스트 검색 활성화 시 이전 저자 활성 집합 임시 저장

// 사용자 키워드 설정 로드
function loadUserKeywords() {
  const savedKeywords = localStorage.getItem('preferredKeywords');
  if (savedKeywords) {
    try {
      userKeywords = JSON.parse(savedKeywords);
      // 기본적으로 모든 키워드 활성화
      activeKeywords = [...userKeywords];
    } catch (error) {
      console.error('키워드 파싱 실패:', error);
      userKeywords = [];
      activeKeywords = [];
    }
  } else {
    userKeywords = ['antibody', 'antigen', 'nanobody', 'CDR', 'immunoglobulin'];
    activeKeywords = [...userKeywords];
  }
  
  // renderKeywordTags();
  renderFilterTags();
}

// 사용자 저자 설정 로드
function loadUserAuthors() {
  const savedAuthors = localStorage.getItem('preferredAuthors');
  if (savedAuthors) {
    try {
      userAuthors = JSON.parse(savedAuthors);
      // 기본적으로 모든 저자 활성화
      activeAuthors = [...userAuthors];
    } catch (error) {
      console.error('저자 파싱 실패:', error);
      userAuthors = [];
      activeAuthors = [];
    }
  } else {
    userAuthors = [];
    activeAuthors = [];
  }
  
  renderFilterTags();
}

// 필터 태그 렌더링 (저자 및 키워드)
function renderFilterTags() {
  const filterTagsElement = document.getElementById('filterTags');
  const filterContainer = document.querySelector('.filter-label-container');
  
  // 저자와 키워드가 없으면 태그 영역만 숨기고 컨테이너는 유지 (검색 버튼 표시용)
  if ((!userAuthors || userAuthors.length === 0) && (!userKeywords || userKeywords.length === 0)) {
    filterContainer.style.display = 'flex';
    if (filterTagsElement) {
      filterTagsElement.style.display = 'none';
      filterTagsElement.innerHTML = '';
    }
    return;
  }
  
  filterContainer.style.display = 'flex';
  if (filterTagsElement) {
    filterTagsElement.style.display = 'flex';
  }
  filterTagsElement.innerHTML = '';
  
  // 먼저 저자 태그 추가
  if (userAuthors && userAuthors.length > 0) {
    userAuthors.forEach(author => {
      const tagElement = document.createElement('span');
      tagElement.className = `category-button author-button ${activeAuthors.includes(author) ? 'active' : ''}`;
      tagElement.textContent = author;
      tagElement.dataset.author = author;
      tagElement.title = "저자 이름 일치";
      
      tagElement.addEventListener('click', () => {
        toggleAuthorFilter(author);
      });
      
      filterTagsElement.appendChild(tagElement);
      
      // 등장 애니메이션 추가 후 애니메이션 클래스 제거
      if (!activeAuthors.includes(author)) {
        tagElement.classList.add('tag-appear');
        setTimeout(() => {
          tagElement.classList.remove('tag-appear');
        }, 300);
      }
    });
  }
  
  // 다음으로 키워드 태그 추가
  if (userKeywords && userKeywords.length > 0) {
    userKeywords.forEach(keyword => {
      const tagElement = document.createElement('span');
      tagElement.className = `category-button keyword-button ${activeKeywords.includes(keyword) ? 'active' : ''}`;
      tagElement.textContent = keyword;
      tagElement.dataset.keyword = keyword;
      tagElement.title = "제목 및 초록의 키워드 일치";
      
      tagElement.addEventListener('click', () => {
        toggleKeywordFilter(keyword);
      });
      
      filterTagsElement.appendChild(tagElement);
      
      // 등장 애니메이션 추가 후 애니메이션 클래스 제거
      if (!activeKeywords.includes(keyword)) {
        tagElement.classList.add('tag-appear');
        setTimeout(() => {
          tagElement.classList.remove('tag-appear');
        }, 300);
      }
    });
  }
}

// 키워드 필터 전환
function toggleKeywordFilter(keyword) {
  const index = activeKeywords.indexOf(keyword);
  
  if (index === -1) {
    // 해당 키워드 활성화
    activeKeywords.push(keyword);
  } else {
    // 해당 키워드 비활성화
    activeKeywords.splice(index, 1);
  }
  
  // 키워드 태그 UI 업데이트
  const keywordTags = document.querySelectorAll('[data-keyword]');
  keywordTags.forEach(tag => {
    if (tag.dataset.keyword === keyword) {
      // 이전의 하이라이트 애니메이션 제거
      tag.classList.remove('tag-highlight');
      
      // 활성 상태 추가/제거
      tag.classList.toggle('active', activeKeywords.includes(keyword));
      
      // 하이라이트 애니메이션 추가
      setTimeout(() => {
        tag.classList.add('tag-highlight');
      }, 10);
      
      // 하이라이트 애니메이션 제거
      setTimeout(() => {
        tag.classList.remove('tag-highlight');
      }, 1000);
    }
  });
  
  // 논문 목록 다시 렌더링
  renderPapers();
}


// 저자 필터 전환
function toggleAuthorFilter(author) {
  const index = activeAuthors.indexOf(author);
  
  if (index === -1) {
    // 해당 저자 활성화
    activeAuthors.push(author);
  } else {
    // 해당 저자 비활성화
    activeAuthors.splice(index, 1);
  }
  
  // 저자 태그 UI 업데이트
  const authorTags = document.querySelectorAll('[data-author]');
  authorTags.forEach(tag => {
    if (tag.dataset.author === author) {
      // 이전의 하이라이트 애니메이션 제거
      tag.classList.remove('tag-highlight');
      
      // 활성 상태 추가/제거
      tag.classList.toggle('active', activeAuthors.includes(author));
      
      // 하이라이트 애니메이션 추가
      setTimeout(() => {
        tag.classList.add('tag-highlight');
      }, 10);
      
      // 하이라이트 애니메이션 제거
      setTimeout(() => {
        tag.classList.remove('tag-highlight');
      }, 1000);
    }
  });
  
  // 논문 목록 다시 렌더링
  renderPapers();
}

// URL 파라미터에서 category 가져오기
function getUrlCategory() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  return category ? decodeURIComponent(category) : null;
}

// URL 파라미터에서 json(API 모드) 가져오기
function getJsonParam() {
  const params = new URLSearchParams(window.location.search);
  const json = params.get('json');
  return json ? decodeURIComponent(json) : null;
}

// URL 파라미터에서 author 가져오기
function getUrlAuthor() {
  const params = new URLSearchParams(window.location.search);
  const author = params.get('author');
  return author ? decodeURIComponent(author).split(',').map(k => k.trim()).filter(k => k) : null;
}

// URL 파라미터에서 keywords 가져오기
function getUrlKeywords() {
  const params = new URLSearchParams(window.location.search);
  const keywords = params.get('keywords');
  return keywords ? decodeURIComponent(keywords).split(',').map(k => k.trim()).filter(k => k) : null;
}

// JSON 모드로 실행 중인지 확인
function isJsonMode() {
  return getUrlCategory() !== null || getJsonParam() !== null || getUrlAuthor() !== null || getUrlKeywords() !== null;
}

// JSON 형식의 논문 데이터 출력
function outputJsonData(papers, category) {
  const jsonData = {
    category: category,
    author: urlAuthorParam || null,
    keywords: urlKeywordsParam || null,
    count: papers.length,
    papers: papers.map(p => ({
      id: p.id,
      title: p.title,
      authors: p.authors,
      categories: p.category,
      summary: p.summary,
      date: p.date,
      url: p.url,
      reason: p.matchReason
    }))
  };

  // 페이지 내용 비우기
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  // JSON 내용 설정
  document.body.textContent = JSON.stringify(jsonData, null, 2);
}

// category에 따라 논문 가져오기 (기존 로직 재사용)
function getPapersByCategory(paperData, category) {
  let papers = [];
  if (category === 'all') {
    const { sortedCategories } = getAllCategories(paperData);
    sortedCategories.forEach(cat => {
      if (paperData[cat]) {
        papers = papers.concat(paperData[cat]);
      }
    });
  } else if (paperData[category]) {
    papers = paperData[category];
  }
  return papers;
}

// keywords에 따라 논문 일치 확인 (기존 로직 재사용: 키워드 간 "OR" 관계)
function matchPapersByKeywords(papers, keywords) {
  if (!keywords || keywords.length === 0) return papers.map(p => ({ ...p, isMatched: false, matchReason: null }));

  return papers.map(paper => {
    const matches = keywords.some(keyword => {
      const searchText = `${paper.title} ${paper.summary}`.toLowerCase();
      return searchText.includes(keyword.toLowerCase());
    });

    if (matches) {
      const matchedKeywords = keywords.filter(keyword => {
        const searchText = `${paper.title} ${paper.summary}`.toLowerCase();
        return searchText.includes(keyword.toLowerCase());
      });
      return {
        ...paper,
        isMatched: true,
        matchReason: matchedKeywords.length > 0 ? `키워드: ${matchedKeywords.join(', ')}` : null
      };
    }
    return { ...paper, isMatched: false, matchReason: null };
  });
}

// author에 따라 논문 일치 확인 (기존 로직 재사용)
function matchPapersByAuthor(papers, query_authors) {
  if (!query_authors) return papers.map(p => ({ ...p, isMatched: false, matchReason: null }));

  return papers.map(paper => {
    const matches = query_authors.some(author => {
      const searchText = `${paper.authors}`.toLowerCase();
      return searchText.includes(author.toLowerCase());
    });

    if (matches) {
      const matchedAuthors = query_authors.filter(author => {
        const searchText = `${paper.authors}`.toLowerCase();
        return searchText.includes(author.toLowerCase());
      });
      return {
        ...paper,
        isMatched: true,
        matchReason: matchedAuthors.length > 0 ? `저자: ${matchedAuthors.join(', ')}` : null
      };
    }
    return { ...paper, isMatched: false, matchReason: null };
  });
}

// keywords 및 author 일치 조합 (기존 로직 재사용: 키워드와 저자는 "OR" 관계)
function matchPapersByKeywordsOrAuthor(papers, keywords, author) {
  // 먼저 키워드 일치 결과 가져오기
  const keywordResults = matchPapersByKeywords(papers, keywords);

  // 다음으로 저자 일치 결과 가져오기
  const authorResults = matchPapersByAuthor(papers, author);

  // 병합: 키워드 또는 저자 일치 모두 포함
  return papers.map((paper, index) => {
    const keywordMatch = keywordResults[index];
    const authorMatch = authorResults[index];

    const isMatched = keywordMatch.isMatched || authorMatch.isMatched;
    const matchReasons = [];
    if (keywordMatch.isMatched && keywordMatch.matchReason) {
      matchReasons.push(keywordMatch.matchReason);
    }
    if (authorMatch.isMatched && authorMatch.matchReason) {
      matchReasons.push(authorMatch.matchReason);
    }

    return {
      ...paper,
      isMatched: isMatched,
      matchReason: matchReasons.length > 0 ? matchReasons.join(' | ') : null
    };
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();

  fetchGitHubStats();

  // 사용자 키워드 로드
  loadUserKeywords();

  // 사용자 저자 로드
  loadUserAuthors();

  // URL의 category, json, author, keywords 파라미터 파싱
  urlCategoryParam = getUrlCategory();
  urlJsonParam = getJsonParam();
  urlAuthorParam = getUrlAuthor();
  urlKeywordsParam = getUrlKeywords();

  fetchAvailableDates().then(() => {
    if (availableDates.length > 0) {
      loadPapersByDate(availableDates[0]);
    }
  });
});

async function fetchGitHubStats() {
  try {
    const response = await fetch(`https://api.github.com/repos/${DATA_CONFIG.getRepoOwner()}/${DATA_CONFIG.getRepoName()}`);
    const data = await response.json();
    const starCount = data.stargazers_count;
    const forkCount = data.forks_count;
    
    document.getElementById('starCount').textContent = starCount;
    document.getElementById('forkCount').textContent = forkCount;
  } catch (error) {
    console.error('GitHub 통계 데이터 가져오기 실패:', error);
    document.getElementById('starCount').textContent = '?';
    document.getElementById('forkCount').textContent = '?';
  }
}

function initEventListeners() {
  // 날짜 선택기 관련 이벤트 리스너
  const calendarButton = document.getElementById('calendarButton');
  calendarButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDatePicker();
  });
  
  const datePickerModal = document.querySelector('.date-picker-modal');
  datePickerModal.addEventListener('click', (event) => {
    if (event.target === datePickerModal) {
      toggleDatePicker();
    }
  });
  
  const datePickerContent = document.querySelector('.date-picker-content');
  datePickerContent.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.getElementById('dateRangeMode').addEventListener('change', toggleRangeMode);
  
  // 기타 기존 이벤트 리스너
  document.getElementById('closeModal').addEventListener('click', closeModal);
  
  document.querySelector('.paper-modal').addEventListener('click', (event) => {
    const modal = document.querySelector('.paper-modal');
    const pdfContainer = modal.querySelector('.pdf-container');
    
    // 모달 배경을 클릭한 경우
    if (event.target === modal) {
      // PDF가 확대 상태인지 확인
      if (pdfContainer && pdfContainer.classList.contains('expanded')) {
        // PDF가 확대 상태라면 먼저 보통 크기로 복원
        const expandButton = modal.querySelector('.pdf-expand-btn');
        if (expandButton) {
          togglePdfSize(expandButton);
        }
        // 이벤트 전파를 중지하여 모달 전체가 닫히는 것을 방지
        event.stopPropagation();
      } else {
        // PDF가 확대 상태가 아니면 모달 전체 닫기
        closeModal();
      }
    }
  });
  
  // 키보드 이벤트 리스너 추가 - Esc 키 모달 닫기, 좌우 방향키 논문 전환, R 키 무작위 논문 표시
  document.addEventListener('keydown', (event) => {
    // 입력란 또는 텍스트 영역에 포커스가 있는지 확인
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      activeElement.isContentEditable
    );
    
    if (event.key === 'Escape') {
      const paperModal = document.getElementById('paperModal');
      const datePickerModal = document.getElementById('datePickerModal');
      
      // 논문 모달 닫기
      if (paperModal.classList.contains('active')) {
        closeModal();
      }
      // 날짜 선택기 모달 닫기
      else if (datePickerModal.classList.contains('active')) {
        toggleDatePicker();
      }
    }
    // 좌우 방향키로 논문 내비게이션 (논문 모달이 열려 있을 때만)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const paperModal = document.getElementById('paperModal');
      if (paperModal.classList.contains('active')) {
        event.preventDefault(); // 페이지 스크롤 방지
        
        if (event.key === 'ArrowLeft') {
          navigateToPreviousPaper();
        } else if (event.key === 'ArrowRight') {
          navigateToNextPaper();
        }
      }
    }
    // space 키 무작위 논문 표시 (입력창 포커스 없고 날짜 선택기 닫혀 있을 때)
    else if (event.key === ' ' || event.key === 'Spacebar') {
      const paperModal = document.getElementById('paperModal');
      const datePickerModal = document.getElementById('datePickerModal');
      
      // 입력창 포커스가 없고 날짜 선택기가 열려 있지 않을 때만 트리거
      // 논문 모달이 열려 있을 때도 R 키로 무작위 논문 전환 허용
      if (!isInputFocused && !datePickerModal.classList.contains('active')) {
        event.preventDefault(); // 페이지 새로고침 방지
        event.stopPropagation(); // 이벤트 버블링 방지
        showRandomPaper();
      }
    }
  });
  
  // 마우스 휠 가로 스크롤 지원 추가
  const categoryScroll = document.querySelector('.category-scroll');
  const keywordScroll = document.querySelector('.keyword-scroll');
  const authorScroll = document.querySelector('.author-scroll');
  
  // 카테고리 스크롤용 마우스 휠 이벤트 추가
  if (categoryScroll) {
    categoryScroll.addEventListener('wheel', function(e) {
      if (e.deltaY !== 0) {
        e.preventDefault();
        this.scrollLeft += e.deltaY;
      }
    });
  }
  
  // 키워드 스크롤용 마우스 휠 이벤트 추가
  if (keywordScroll) {
    keywordScroll.addEventListener('wheel', function(e) {
      if (e.deltaY !== 0) {
        e.preventDefault();
        this.scrollLeft += e.deltaY;
      }
    });
  }
  
  // 저자 스크롤용 마우스 휠 이벤트 추가
  if (authorScroll) {
    authorScroll.addEventListener('wheel', function(e) {
      if (e.deltaY !== 0) {
        e.preventDefault();
        this.scrollLeft += e.deltaY;
      }
    });
  }

  // 기타 이벤트 리스너...
  const categoryButtons = document.querySelectorAll('.category-button');
  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      const category = button.dataset.category;
      filterByCategory(category);
    });
  });

  // 맨 위로 가기 버튼: 스크롤 표시/숨김 + 클릭 시 맨 위로 이동
  const backToTopButton = document.getElementById('backToTop');
  if (backToTopButton) {
    const updateBackToTopVisibility = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (scrollTop > 300) {
        backToTopButton.classList.add('visible');
      } else {
        backToTopButton.classList.remove('visible');
      }
    };

    // 초기 1회 판단 (중간에서 새로고침 시 미표시 방지)
    updateBackToTopVisibility();
    window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });

    backToTopButton.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 텍스트 검색: 돋보기 아이콘으로 입력란 표시 전환
  const searchToggle = document.getElementById('textSearchToggle');
  const searchWrapper = document.querySelector('#textSearchContainer .search-input-wrapper');
  const searchInput = document.getElementById('textSearchInput');
  const searchClear = document.getElementById('textSearchClear');

  if (searchToggle && searchWrapper && searchInput && searchClear) {
    searchToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      searchWrapper.style.display = 'flex';
      searchInput.focus();
    });

    // 입력 시 쿼리 업데이트 및 다시 렌더링
    const handleInput = () => {
      const value = searchInput.value.trim();
      textSearchQuery = value;
      // 비어있지 않은 텍스트 입력 시: 토글 함수를 통해 키워드/저자 필터를 비활성화하고 이전 상태 기록
      if (textSearchQuery.length > 0) {
        if (previousActiveKeywords === null) {
          previousActiveKeywords = [...activeKeywords];
        }
        if (previousActiveAuthors === null) {
          previousActiveAuthors = [...activeAuthors];
        }
        // 현재 활성화된 키워드/저자 순차적 비활성화
        // 참고: 순회 중 원본 배열 수정 문제를 방지하기 위해 배열 복사 후 순회
        const keywordsToDisable = [...activeKeywords];
        const authorsToDisable = [...activeAuthors];
        keywordsToDisable.forEach(k => toggleKeywordFilter(k));
        authorsToDisable.forEach(a => toggleAuthorFilter(a));
      } else {
        // 텍스트가 삭제되어 비어있으면 이전에 기록된 키워드/저자 활성 상태 복원
        if (previousActiveKeywords && previousActiveKeywords.length > 0) {
          previousActiveKeywords.forEach(k => {
            // 현재 비활성 상태이면 다시 활성화로 전환
            if (!activeKeywords.includes(k)) toggleKeywordFilter(k);
          });
        }
        if (previousActiveAuthors && previousActiveAuthors.length > 0) {
          previousActiveAuthors.forEach(a => {
            if (!activeAuthors.includes(a)) toggleAuthorFilter(a);
          });
        }
        previousActiveKeywords = null;
        previousActiveAuthors = null;
        // 텍스트가 비어있으면 입력란 자동 숨김
        searchWrapper.style.display = 'none';
      }

      // 지우기 버튼 표시 제어
      searchClear.style.display = textSearchQuery.length > 0 ? 'inline-flex' : 'none';

      renderPapers();
    };

    searchInput.addEventListener('input', handleInput);

    // 지우기 버튼: 텍스트 지우기, 기타 필터 복원
    searchClear.addEventListener('click', (e) => {
      e.stopPropagation();
      searchInput.value = '';
      textSearchQuery = '';
      searchClear.style.display = 'none';
      // 이전 필터 상태 복원 (있는 경우)
      if (previousActiveKeywords && previousActiveKeywords.length > 0) {
        previousActiveKeywords.forEach(k => {
          if (!activeKeywords.includes(k)) toggleKeywordFilter(k);
        });
      }
      if (previousActiveAuthors && previousActiveAuthors.length > 0) {
        previousActiveAuthors.forEach(a => {
          if (!activeAuthors.includes(a)) toggleAuthorFilter(a);
        });
      }
      previousActiveKeywords = null;
      previousActiveAuthors = null;
      renderPapers();
      // 비운 후 입력란 숨기기
      searchWrapper.style.display = 'none';
    });

    // 포커스 해제 시: 텍스트가 비어있으면 입력란 숨김 (텍스트가 있으면 유지)
    searchInput.addEventListener('blur', () => {
      const value = searchInput.value.trim();
      if (value.length === 0) {
        searchWrapper.style.display = 'none';
      }
    });

    // 다른 곳 클릭 시 입력란 숨기지 않음 (blur 숨김 로직 미추가)
  }
}

// Function to detect preferred language based on browser settings
function getPreferredLanguage() {
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang.startsWith('ko')) {
    return 'Korean';
  }
  if (browserLang.startsWith('zh')) {
    return 'Chinese';
  }
  return 'Korean';
}

// Function to select the best available language for a date
function selectLanguageForDate(date, preferredLanguage = null) {
  const availableLanguages = window.dateLanguageMap?.get(date) || [];
  
  if (availableLanguages.length === 0) {
    return 'Korean'; // fallback
  }
  
  // Use provided preference or detect from browser
  const preferred = preferredLanguage || getPreferredLanguage();
  
  // If preferred language is available, use it
  if (availableLanguages.includes(preferred)) {
    return preferred;
  }
  
  // Fallback: prefer Korean if available, otherwise use the first available
  return 'Korean';
}

async function fetchAvailableDates() {
  try {
    // data 브랜치에서 파일 목록 가져오기
    const fileListUrl = DATA_CONFIG.getDataUrl('assets/file-list.txt');
    const response = await fetch(fileListUrl);
    if (!response.ok) {
      console.error('Error fetching file list:', response.status);
      return [];
    }
    const text = await response.text();
    const files = text.trim().split('\n');

    const dateRegex = /(\d{4}-\d{2}-\d{2})_AI_enhanced_([a-zA-Z]+)\.jsonl/;
    const dateLanguageMap = new Map(); // Store date -> available languages
    const dates = [];
    
    files.forEach(file => {
      const match = file.match(dateRegex);
      if (match && match[1] && match[2]) {
        const date = match[1];
        const language = match[2];
        
        if (!dateLanguageMap.has(date)) {
          dateLanguageMap.set(date, []);
          dates.push(date);
        }
        dateLanguageMap.get(date).push(language);
      }
    });
    
    // Store the language mapping globally for later use
    window.dateLanguageMap = dateLanguageMap;
    availableDates = [...new Set(dates)];
    availableDates.sort((a, b) => new Date(b) - new Date(a));

    initDatePicker(); // Assuming this function uses availableDates

    return availableDates;
  } catch (error) {
    console.error('사용 가능한 날짜 가져오기 실패:', error);
  }
}

function initDatePicker() {
  const datepickerInput = document.getElementById('datepicker');
  
  if (flatpickrInstance) {
    flatpickrInstance.destroy();
  }
  
  // 유효하지 않은 날짜 비활성화를 위한 사용 가능한 날짜 매핑 생성
  const enabledDatesMap = {};
  availableDates.forEach(date => {
    enabledDatesMap[date] = true;
  });
  
  // Flatpickr 설정
  flatpickrInstance = flatpickr(datepickerInput, {
    inline: true,
    dateFormat: "Y-m-d",
    defaultDate: availableDates[0],
    enable: [
      function(date) {
        // 유효한 날짜만 활성화
        const dateStr = date.getFullYear() + "-" +
                        String(date.getMonth() + 1).padStart(2, '0') + "-" +
                        String(date.getDate()).padStart(2, '0');
        // availableDates[0] 이후 날짜는 모두 false 반환, 그 외에는 true 반환
        return dateStr <= availableDates[0];
      }
    ],
    onChange: function(selectedDates, dateStr) {
      if (isRangeMode && selectedDates.length === 2) {
        // 날짜 범위 선택 처리
        const startDate = formatDateForAPI(selectedDates[0]);
        const endDate = formatDateForAPI(selectedDates[1]);
        loadPapersByDateRange(startDate, endDate);
        toggleDatePicker();
      } else if (!isRangeMode && selectedDates.length === 1) {
        // 단일 날짜 선택 처리
        const selectedDate = formatDateForAPI(selectedDates[0]);
        // if (availableDates.includes(selectedDate)) {
          loadPapersByDate(selectedDate);
          toggleDatePicker();
        // }
      }
    }
  });
  
  // 날짜 입력란 숨기기
  const inputElement = document.querySelector('.flatpickr-input');
  if (inputElement) {
    inputElement.style.display = 'none';
  }
}

function formatDateForAPI(date) {
  return date.getFullYear() + "-" + 
         String(date.getMonth() + 1).padStart(2, '0') + "-" + 
         String(date.getDate()).padStart(2, '0');
}

function toggleRangeMode() {
  isRangeMode = document.getElementById('dateRangeMode').checked;
  
  if (flatpickrInstance) {
    flatpickrInstance.set('mode', isRangeMode ? 'range' : 'single');
  }
}

async function loadPapersByDate(date) {
  currentDate = date;
  document.getElementById('currentDate').textContent = formatDate(date);
  
  // 날짜 선택기에서 선택된 날짜 업데이트
  if (flatpickrInstance) {
    flatpickrInstance.setDate(date, false);
  }
  
  // 활성화된 키워드 및 저자를 재설정하지 않음
  // 대신 현재 선택 상태 유지
  
  const container = document.getElementById('paperContainer');
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>논문 데이터를 불러오는 중...</p>
    </div>
  `;
  
  try {
    const selectedLanguage = selectLanguageForDate(date);
    // data 브랜치에서 데이터 파일 가져오기
    const dataUrl = DATA_CONFIG.getDataUrl(`data/${date}_AI_enhanced_${selectedLanguage}.jsonl`);
    const response = await fetch(dataUrl);
    // 파일이 존재하지 않는 경우 (예: 404 반환), 논문 표시 영역에 논문 없음 안내
    if (!response.ok) {
      if (response.status === 404) {
        container.innerHTML = `
          <div class="loading-container">
            <p>해당 날짜에 수집된 논문이 없습니다.</p>
          </div>
        `;
        paperData = {};
        renderCategoryFilter({ sortedCategories: [], categoryCounts: {} });
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    // 빈 파일인 경우에도 논문 없음 안내
    if (!text || text.trim() === '') {
      container.innerHTML = `
        <div class="loading-container">
          <p>해당 날짜에 수집된 논문이 없습니다.</p>
        </div>
      `;
      paperData = {};
      renderCategoryFilter({ sortedCategories: [], categoryCounts: {} });
      return;
    }
    
    paperData = parseJsonlData(text, date);

    const categories = getAllCategories(paperData);

    renderCategoryFilter(categories);

    // URL에 category, json, author, keywords 파라미터가 있으면 즉시 JSON 반환
    const hasJsonParams = urlCategoryParam !== null || urlJsonParam !== null || urlAuthorParam !== null || urlKeywordsParam !== null;
    if (hasJsonParams) {
      // 기본 논문 목록 가져오기 (category 또는 all 기준)
      const targetCategory = urlCategoryParam || urlJsonParam || 'all';
      let papers = getPapersByCategory(paperData, targetCategory);

      // keywords 및 author 일치 적용 ("OR" 관계)
      if (urlKeywordsParam || urlAuthorParam) {
        papers = matchPapersByKeywordsOrAuthor(papers, urlKeywordsParam, urlAuthorParam);
      }

      // JSON 모드: 일치하는 논문만 반환
      papers = papers.filter(p => p.isMatched);

      outputJsonData(papers, targetCategory);
      return;
    }

    renderPapers();
  } catch (error) {
    console.error('논문 데이터 로드 실패:', error);
    container.innerHTML = `
      <div class="loading-container">
        <p>Loading data fails. Please retry.</p>
        <p>Error messages: ${error.message}</p>
      </div>
    `;
  }
}

function parseJsonlData(jsonlText, date) {
  const result = {};
  
  const lines = jsonlText.trim().split('\n');
  
  lines.forEach(line => {
    try {
      const paper = JSON.parse(line);
      
      if (!paper.categories) {
        return;
      }
      
      let allCategories = Array.isArray(paper.categories) ? paper.categories : [paper.categories];
      
      const primaryCategory = allCategories[0];
      
      if (!result[primaryCategory]) {
        result[primaryCategory] = [];
      }
      
      const summary = paper.AI && paper.AI.tldr ? paper.AI.tldr : paper.summary;
      
      result[primaryCategory].push({
        title: paper.title,
        url: paper.abs || paper.pdf || `https://arxiv.org/abs/${paper.id}`,
        abs: paper.abs || paper.url || `https://arxiv.org/abs/${paper.id}`,
        pdf: paper.pdf || (paper.abs ? paper.abs + '.full.pdf' : `https://arxiv.org/pdf/${paper.id}`),
        authors: Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors,
        category: allCategories,
        summary: summary,
        details: paper.summary || '',
        date: date,
        id: paper.id,
        motivation: paper.AI && paper.AI.motivation ? paper.AI.motivation : '',
        method: paper.AI && paper.AI.method ? paper.AI.method : '',
        result: paper.AI && paper.AI.result ? paper.AI.result : '',
        conclusion: paper.AI && paper.AI.conclusion ? paper.AI.conclusion : '',
        code_url: paper.code_url || '',
        code_stars: paper.code_stars || 0,
        code_last_update: paper.code_last_update || ''
      });
    } catch (error) {
      console.error('JSON 라인 파싱 실패:', error, line);
    }
  });
  
  return result;
}

// 모든 카테고리 가져오기 및 환경설정에 따라 정렬
function getAllCategories(data) {
  const categories = Object.keys(data);
  const catePaperCount = {};
  
  categories.forEach(category => {
    catePaperCount[category] = data[category] ? data[category].length : 0;
  });
  
  return {
    sortedCategories: categories.sort((a, b) => {
      return a.localeCompare(b);
    }),
    categoryCounts: catePaperCount
  };
}

function renderCategoryFilter(categories) {
  const container = document.querySelector('.category-scroll');
  const { sortedCategories, categoryCounts } = categories;
  
  let totalPapers = 0;
  Object.values(categoryCounts).forEach(count => {
    totalPapers += count;
  });
  
  container.innerHTML = `
    <button class="category-button ${currentCategory === 'all' ? 'active' : ''}" data-category="all">All<span class="category-count">${totalPapers}</span></button>
  `;
  
  sortedCategories.forEach(category => {
    const count = categoryCounts[category];
    const button = document.createElement('button');
    button.className = `category-button ${category === currentCategory ? 'active' : ''}`;
    button.innerHTML = `${category}<span class="category-count">${count}</span>`;
    button.dataset.category = category;
    button.addEventListener('click', () => {
      filterByCategory(category);
    });
    
    container.appendChild(button);
  });
  
  document.querySelector('.category-button[data-category="all"]').addEventListener('click', () => {
    filterByCategory('all');
  });
}

function filterByCategory(category) {
  currentCategory = category;

  // JSON 모드가 아닌 경우에만 URL 파라미터 업데이트
  if (!isJsonMode()) {
    const url = new URL(window.location);
    if (category === 'all') {
      url.searchParams.delete('category');
    } else {
      url.searchParams.set('category', category);
    }
    // 페이지 새로고침 없이 replaceState로 URL 업데이트
    window.history.replaceState({}, '', url);
  }

  document.querySelectorAll('.category-button').forEach(button => {
    button.classList.toggle('active', button.dataset.category === category);
  });

  // 현재 활성화된 필터 태그 유지
  renderFilterTags();

  // 페이지 스크롤 맨 위로 초기화
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
  
  renderPapers();
}

// 헬퍼 함수: 텍스트 내 일치 내용 하이라이트
function highlightMatches(text, terms, className = 'highlight-match') {
  if (!terms || terms.length === 0 || !text) {
    return text;
  }
  
  let result = text;
  
  // 키워드를 길이순(긴 순서)으로 정렬하여 짧은 단어 먼저 치환으로 인한 긴 단어 일치 실패 방지
  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
  
  // 각 단어에 대해 정규식 생성, 'gi' 플래그로 전역 및 대소문자 무시 매칭
  sortedTerms.forEach(term => {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(regex, `<span class="${className}">$1</span>`);
  });
  
  return result;
}

// 헬퍼 함수: 저자 목록 서식 지정 (논문 카드 표시용)
// 규칙: 4명 이하 저자는 전체 표시, 4명 초과 시 앞 2명 + 말줄임표 + 뒤 2명 표시
function formatAuthorsForCard(authorsString, authorTerms = []) {
  if (!authorsString) {
    return '';
  }
  
  // 저자 문자열을 배열로 파싱 (쉼표 구분 처리)
  const authorsArray = authorsString.split(',').map(author => author.trim()).filter(author => author.length > 0);
  
  if (authorsArray.length === 0) {
    return '';
  }
  
  // 4명 이하 저자인 경우 전체 표시
  if (authorsArray.length <= 4) {
    return authorsArray.map(author => {
      // 각 저자에 하이라이트 적용
      const highlightedAuthor = authorTerms.length > 0 
        ? highlightMatches(author, authorTerms, 'author-highlight')
        : author;
      return `<span class="author-item">${highlightedAuthor}</span>`;
    }).join(', ');
  }
  
  // 4명 초과 저자: 앞 2명, 말줄임표, 뒤 2명 표시
  const firstTwo = authorsArray.slice(0, 2);
  const lastTwo = authorsArray.slice(-2);
  
  const result = [];
  
  // 앞 2명 저자
  firstTwo.forEach(author => {
    const highlightedAuthor = authorTerms.length > 0 
      ? highlightMatches(author, authorTerms, 'author-highlight')
      : author;
    result.push(`<span class="author-item">${highlightedAuthor}</span>`);
  });
  
  // 말줄임표
  result.push('<span class="author-ellipsis">...</span>');
  
  // 뒤 2명 저자
  lastTwo.forEach(author => {
    const highlightedAuthor = authorTerms.length > 0 
      ? highlightMatches(author, authorTerms, 'author-highlight')
      : author;
    result.push(`<span class="author-item">${highlightedAuthor}</span>`);
  });
  
  return result.join(', ');
}

function renderPapers() {
  const container = document.getElementById('paperContainer');
  container.innerHTML = '';
  container.className = `paper-container ${currentView === 'list' ? 'list-view' : ''}`;
  
  let papers = [];
  if (currentCategory === 'all') {
    const { sortedCategories } = getAllCategories(paperData);
    sortedCategories.forEach(category => {
      if (paperData[category]) {
        papers = papers.concat(paperData[category]);
      }
    });
  } else if (paperData[currentCategory]) {
    papers = paperData[currentCategory];
  }
  
  // 일치하는 논문 집합 생성
  let filteredPapers = [...papers];

  // 이전 렌더링 잔여물 방지를 위해 모든 논문의 일치 상태 초기화
  filteredPapers.forEach(p => {
    p.isMatched = false;
    p.matchReason = undefined;
  });

  // 텍스트 검색 우선: 텍스트가 있을 때 키워드/저자처럼 숨기지 않고 정렬만 수행
  if (textSearchQuery && textSearchQuery.trim().length > 0) {
    const q = textSearchQuery.toLowerCase();

    // 정렬: 일치하는 항목 우선 배치
    filteredPapers.sort((a, b) => {
      const hayA = [
        a.title,
        a.authors,
        Array.isArray(a.category) ? a.category.join(', ') : a.category,
        a.summary,
        a.details || '',
        a.motivation || '',
        a.method || '',
        a.result || '',
        a.conclusion || ''
      ].join(' ').toLowerCase();
      const hayB = [
        b.title,
        b.authors,
        Array.isArray(b.category) ? b.category.join(', ') : b.category,
        b.summary,
        b.details || '',
        b.motivation || '',
        b.method || '',
        b.result || '',
        b.conclusion || ''
      ].join(' ').toLowerCase();
      const am = hayA.includes(q);
      const bm = hayB.includes(q);
      if (am && !bm) return -1;
      if (!am && bm) return 1;
      return 0;
    });

    // 카드 스타일 및 툴팁을 위한 일치 항목 마킹
    filteredPapers.forEach(p => {
      const hay = [
        p.title,
        p.authors,
        Array.isArray(p.category) ? p.category.join(', ') : p.category,
        p.summary,
        p.details || '',
        p.motivation || '',
        p.method || '',
        p.result || '',
        p.conclusion || ''
      ].join(' ').toLowerCase();
      const matched = hay.includes(q);
      p.isMatched = matched;
      p.matchReason = matched ? [`텍스트: ${textSearchQuery}`] : undefined;
    });
  } else {
    // 키워드 및 저자 일치(필터링 없이 정렬만 수행)
    if (activeKeywords.length > 0 || activeAuthors.length > 0) {
      // 논문 정렬: 일치하는 논문을 앞쪽에 배치
      filteredPapers.sort((a, b) => {
        const aMatchesKeyword = activeKeywords.length > 0 ? 
          activeKeywords.some(keyword => {
            // 제목과 초록에서만 키워드 검색
            const searchText = `${a.title} ${a.summary}`.toLowerCase();
            return searchText.includes(keyword.toLowerCase());
          }) : false;
          
        const aMatchesAuthor = activeAuthors.length > 0 ?
          activeAuthors.some(author => {
            // 저자 목록에서만 저자명 검색
            return a.authors.toLowerCase().includes(author.toLowerCase());
          }) : false;
          
        const bMatchesKeyword = activeKeywords.length > 0 ?
          activeKeywords.some(keyword => {
            // 제목과 초록에서만 키워드 검색
            const searchText = `${b.title} ${b.summary}`.toLowerCase();
            return searchText.includes(keyword.toLowerCase());
          }) : false;
          
        const bMatchesAuthor = activeAuthors.length > 0 ?
          activeAuthors.some(author => {
            // 저자 목록에서만 저자명 검색
            return b.authors.toLowerCase().includes(author.toLowerCase());
          }) : false;
      
        // a와 b의 일치 상태 (키워드 또는 저자 일치 포함)
        const aMatches = aMatchesKeyword || aMatchesAuthor;
        const bMatches = bMatchesKeyword || bMatchesAuthor;
        
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });
      
      // 일치하는 논문 마킹
      filteredPapers.forEach(paper => {
        const matchesKeyword = activeKeywords.length > 0 ?
          activeKeywords.some(keyword => {
            const searchText = `${paper.title} ${paper.summary}`.toLowerCase();
            return searchText.includes(keyword.toLowerCase());
          }) : false;
          
        const matchesAuthor = activeAuthors.length > 0 ?
          activeAuthors.some(author => {
            return paper.authors.toLowerCase().includes(author.toLowerCase());
          }) : false;
          
        // 일치 마크 추가 (전체 논문 카드 하이라이트용)
        paper.isMatched = matchesKeyword || matchesAuthor;
        
        // 일치 사유 추가 (일치 안내 툴팁 표시용)
        if (paper.isMatched) {
          paper.matchReason = [];
          if (matchesKeyword) {
            const matchedKeywords = activeKeywords.filter(keyword => 
              `${paper.title} ${paper.summary}`.toLowerCase().includes(keyword.toLowerCase())
            );
            if (matchedKeywords.length > 0) {
              paper.matchReason.push(`키워드: ${matchedKeywords.join(', ')}`);
            }
          }
          if (matchesAuthor) {
            const matchedAuthors = activeAuthors.filter(author => 
              paper.authors.toLowerCase().includes(author.toLowerCase())
            );
            if (matchedAuthors.length > 0) {
              paper.matchReason.push(`저자: ${matchedAuthors.join(', ')}`);
            }
          }
        }
      });
    }
  }
  
  // 키워드 및 저자 일치(필터링 없이 정렬만 수행)
  if (activeKeywords.length > 0 || activeAuthors.length > 0) {
    // 논문 정렬: 일치하는 논문을 앞쪽에 배치
    filteredPapers.sort((a, b) => {
      const aMatchesKeyword = activeKeywords.length > 0 ? 
        activeKeywords.some(keyword => {
          // 제목과 초록에서만 키워드 검색
          const searchText = `${a.title} ${a.summary}`.toLowerCase();
          return searchText.includes(keyword.toLowerCase());
        }) : false;
        
      const aMatchesAuthor = activeAuthors.length > 0 ?
        activeAuthors.some(author => {
          // 저자 목록에서만 저자명 검색
          return a.authors.toLowerCase().includes(author.toLowerCase());
        }) : false;
        
      const bMatchesKeyword = activeKeywords.length > 0 ?
        activeKeywords.some(keyword => {
          // 제목과 초록에서만 키워드 검색
          const searchText = `${b.title} ${b.summary}`.toLowerCase();
          return searchText.includes(keyword.toLowerCase());
        }) : false;
        
      const bMatchesAuthor = activeAuthors.length > 0 ?
        activeAuthors.some(author => {
          // 저자 목록에서만 저자명 검색
          return b.authors.toLowerCase().includes(author.toLowerCase());
        }) : false;
      
      // a와 b의 일치 상태 (키워드 또는 저자 일치 포함)
      const aMatches = aMatchesKeyword || aMatchesAuthor;
      const bMatches = bMatchesKeyword || bMatchesAuthor;
      
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
    
    // 일치하는 논문 마킹
    filteredPapers.forEach(paper => {
      const matchesKeyword = activeKeywords.length > 0 ?
        activeKeywords.some(keyword => {
          const searchText = `${paper.title} ${paper.summary}`.toLowerCase();
          return searchText.includes(keyword.toLowerCase());
        }) : false;
        
      const matchesAuthor = activeAuthors.length > 0 ?
        activeAuthors.some(author => {
          return paper.authors.toLowerCase().includes(author.toLowerCase());
        }) : false;
        
      // 일치 마크 추가 (전체 논문 카드 하이라이트용)
      paper.isMatched = matchesKeyword || matchesAuthor;
      
      // 일치 사유 추가 (일치 안내 툴팁 표시용)
      if (paper.isMatched) {
        paper.matchReason = [];
        if (matchesKeyword) {
          const matchedKeywords = activeKeywords.filter(keyword => 
            `${paper.title} ${paper.summary}`.toLowerCase().includes(keyword.toLowerCase())
          );
          if (matchedKeywords.length > 0) {
            paper.matchReason.push(`키워드: ${matchedKeywords.join(', ')}`);
          }
        }
        if (matchesAuthor) {
          const matchedAuthors = activeAuthors.filter(author => 
            paper.authors.toLowerCase().includes(author.toLowerCase())
          );
          if (matchedAuthors.length > 0) {
            paper.matchReason.push(`저자: ${matchedAuthors.join(', ')}`);
          }
        }
      }
    });
  }
  
  // 방향키 내비게이션용 현재 필터링된 논문 목록 저장
  currentFilteredPapers = [...filteredPapers];
  
  if (filteredPapers.length === 0) {
    container.innerHTML = `
      <div class="loading-container">
        <p>No paper found.</p>
      </div>
    `;
    return;
  }
  
  filteredPapers.forEach((paper, index) => {
    const paperCard = document.createElement('div');
    // 일치 하이라이트 클래스 추가
    paperCard.className = `paper-card ${paper.isMatched ? 'matched-paper' : ''}`;
    paperCard.dataset.id = paper.id || paper.url;
    
    if (paper.isMatched) {
      // 일치 사유 툴팁 추가
      paperCard.title = `일치: ${paper.matchReason.join(' | ')}`;
    }
    
    const categoryTags = paper.allCategories ? 
      paper.allCategories.map(cat => `<span class="category-tag">${cat}</span>`).join('') : 
      `<span class="category-tag">${paper.category}</span>`;
    
    // 하이라이트할 단어 조합: 키워드 + 텍스트 검색
    const titleSummaryTerms = [];
    if (activeKeywords.length > 0) {
      titleSummaryTerms.push(...activeKeywords);
    }
    if (textSearchQuery && textSearchQuery.trim().length > 0) {
      titleSummaryTerms.push(textSearchQuery.trim());
    }

    // 제목 및 초록 하이라이트 (키워드 및 텍스트 검색)
    const highlightedTitle = titleSummaryTerms.length > 0 
      ? highlightMatches(paper.title, titleSummaryTerms, 'keyword-highlight') 
      : paper.title;
    const highlightedSummary = titleSummaryTerms.length > 0 
      ? highlightMatches(paper.summary, titleSummaryTerms, 'keyword-highlight') 
      : paper.summary;

    // 저자 하이라이트 (저자 필터 + 텍스트 검색)
    const authorTerms = [];
    if (activeAuthors.length > 0) authorTerms.push(...activeAuthors);
    if (textSearchQuery && textSearchQuery.trim().length > 0) authorTerms.push(textSearchQuery.trim());
    
    // 저자 목록 서식 지정 (생략 규칙 및 하이라이트 적용)
    const formattedAuthors = formatAuthorsForCard(paper.authors, authorTerms);
    
    // GitHub 버튼 HTML 생성
    // let githubHtml = '';
    // if (paper.code_url) {
    //   const stars = paper.code_stars ? `<span class="github-stars">★ ${paper.code_stars}</span>` : '';
    //   const isHot = paper.code_stars > 100;
      
    //   githubHtml = `
    //     <a href="${paper.code_url}" target="_blank" class="github-link" title="View Code" onclick="event.stopPropagation()">
    //       <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;">
    //         <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
    //       </svg>
    //       Code ${stars}
    //       ${isHot ? '<span class="hot-icon">🔥</span>' : ''}
    //     </a>
    //   `;
    // }

    paperCard.innerHTML = `
      <div class="paper-card-index">${index + 1}</div>
      ${paper.isMatched ? '<div class="match-badge" title="검색 조건과 일치함"></div>' : ''}
      <div class="paper-card-header">
        <h3 class="paper-card-title">${highlightedTitle}</h3>
        <p class="paper-card-authors">${formattedAuthors}</p>
        <div class="paper-card-categories">
          ${categoryTags}
        </div>
      </div>
      <div class="paper-card-body">
        <p class="paper-card-summary">${highlightedSummary}</p>
        <div class="paper-card-footer">
          <div class="footer-left">
            <span class="paper-card-date">${formatDate(paper.date)}</span>
          </div>
          <span class="paper-card-link">Details</span>
        </div>
      </div>
    `;
    
    paperCard.addEventListener('click', () => {
      currentPaperIndex = index; // 현재 클릭한 논문 인덱스 기록
      showPaperDetails(paper, index + 1);
    });
    
    container.appendChild(paperCard);
  });
}

function showPaperDetails(paper, paperIndex) {
  const modal = document.getElementById('paperModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const paperLink = document.getElementById('paperLink');
  const pdfLink = document.getElementById('pdfLink');
  const htmlLink = document.getElementById('htmlLink');
  
  // 모달 스크롤 위치 초기화
  modalBody.scrollTop = 0;
  
  // 하이라이트 단어 조합: 키워드 + 텍스트 검색
  const modalTitleTerms = [];
  if (activeKeywords.length > 0) modalTitleTerms.push(...activeKeywords);
  if (textSearchQuery && textSearchQuery.trim().length > 0) modalTitleTerms.push(textSearchQuery.trim());
  // 제목 하이라이트
  const highlightedTitle = modalTitleTerms.length > 0 
    ? highlightMatches(paper.title, modalTitleTerms, 'keyword-highlight') 
    : paper.title;
  
  // 제목 앞에 인덱스 번호 추가
  modalTitle.innerHTML = paperIndex ? `<span class="paper-index-badge">${paperIndex}</span> ${highlightedTitle}` : highlightedTitle;
  
  const abstractText = paper.details || '';
  
  const categoryDisplay = paper.allCategories ? 
    paper.allCategories.join(', ') : 
    paper.category;
  
  // 저자 하이라이트 (저자 필터 + 텍스트 검색)
  const modalAuthorTerms = [];
  if (activeAuthors.length > 0) modalAuthorTerms.push(...activeAuthors);
  if (textSearchQuery && textSearchQuery.trim().length > 0) modalAuthorTerms.push(textSearchQuery.trim());
  const highlightedAuthors = modalAuthorTerms.length > 0 
    ? highlightMatches(paper.authors, modalAuthorTerms, 'author-highlight') 
    : paper.authors;
  
  // 초록 하이라이트 (키워드 + 텍스트 검색)
  const highlightedSummary = modalTitleTerms.length > 0 
    ? highlightMatches(paper.summary, modalTitleTerms, 'keyword-highlight') 
    : paper.summary;
  
  // 상세 내용 하이라이트 (Abstract/details)
  const highlightedAbstract = modalTitleTerms.length > 0 
    ? highlightMatches(abstractText, modalTitleTerms, 'keyword-highlight') 
    : abstractText;
  
  // 기타 부분 하이라이트 (존재하고 초록의 일부인 경우)
  const highlightedMotivation = paper.motivation && modalTitleTerms.length > 0 
    ? highlightMatches(paper.motivation, modalTitleTerms, 'keyword-highlight') 
    : paper.motivation;
  
  const highlightedMethod = paper.method && modalTitleTerms.length > 0 
    ? highlightMatches(paper.method, modalTitleTerms, 'keyword-highlight') 
    : paper.method;
  
  const highlightedResult = paper.result && modalTitleTerms.length > 0 
    ? highlightMatches(paper.result, modalTitleTerms, 'keyword-highlight') 
    : paper.result;
  
  const highlightedConclusion = paper.conclusion && modalTitleTerms.length > 0 
    ? highlightMatches(paper.conclusion, modalTitleTerms, 'keyword-highlight') 
    : paper.conclusion;
  
  // 하이라이트 설명 표시 여부 판단
  const showHighlightLegend = activeKeywords.length > 0 || activeAuthors.length > 0;
  
  // 일치 마크 추가
  const matchedPaperClass = paper.isMatched ? 'matched-paper-details' : '';
  
  const modalContent = `
    <div class="paper-details ${matchedPaperClass}">
      <p><strong>Authors: </strong>${highlightedAuthors}</p>
      <p><strong>Categories: </strong>${categoryDisplay}</p>
      <p><strong>Date: </strong>${formatDate(paper.date)}</p>
      
      
      <h3>TL;DR</h3>
      <p>${highlightedSummary}</p>
      
      <div class="paper-sections">
        ${paper.motivation ? `<div class="paper-section"><h4>Motivation</h4><p>${highlightedMotivation}</p></div>` : ''}
        ${paper.method ? `<div class="paper-section"><h4>Method</h4><p>${highlightedMethod}</p></div>` : ''}
        ${paper.result ? `<div class="paper-section"><h4>Result</h4><p>${highlightedResult}</p></div>` : ''}
        ${paper.conclusion ? `<div class="paper-section"><h4>Conclusion</h4><p>${highlightedConclusion}</p></div>` : ''}
      </div>
      
      ${highlightedAbstract ? `<h3>Abstract</h3><p class="original-abstract">${highlightedAbstract}</p>` : ''}
      
      <div class="pdf-preview-section">
        <div class="pdf-header">
          <h3>PDF Preview</h3>
          <button class="pdf-expand-btn" onclick="togglePdfSize(this)">
            <svg class="expand-icon" viewBox="0 0 24 24" width="24" height="24">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
            <svg class="collapse-icon" viewBox="0 0 24 24" width="24" height="24" style="display: none;">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            </svg>
          </button>
        </div>
        <div class="pdf-container">
          <iframe src="${paper.url.replace('abs', 'pdf')}" width="100%" height="800px" frameborder="0"></iframe>
        </div>
      </div>
    </div>
  `;
  
  // Update modal content
  document.getElementById('modalBody').innerHTML = modalContent;
  document.getElementById('paperLink').href = paper.url;
  document.getElementById('pdfLink').href = paper.url.replace('abs', 'pdf');
  document.getElementById('htmlLink').href = paper.url.replace('abs', 'html');
  
  // --- GitHub Button Logic ---
  const githubLink = document.getElementById('githubLink');
  
  if (paper.code_url) {
    githubLink.href = paper.code_url;
    githubLink.style.display = 'flex'; 
    githubLink.title = "View Code on GitHub";
  } else {
    githubLink.style.display = 'none';
  }
  // ---------------------------
  
  // 논문 위치 정보 업데이트
  const paperPosition = document.getElementById('paperPosition');
  if (paperPosition && currentFilteredPapers.length > 0) {
    paperPosition.textContent = `${currentPaperIndex + 1} / ${currentFilteredPapers.length}`;
  }
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('paperModal');
  const modalBody = document.getElementById('modalBody');
  
  // 모달 스크롤 위치 초기화
  modalBody.scrollTop = 0;
  
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// 이전 논문으로 이동
function navigateToPreviousPaper() {
  if (currentFilteredPapers.length === 0) return;
  
  currentPaperIndex = currentPaperIndex > 0 ? currentPaperIndex - 1 : currentFilteredPapers.length - 1;
  const paper = currentFilteredPapers[currentPaperIndex];
  showPaperDetails(paper, currentPaperIndex + 1);
}

// 다음 논문으로 이동
function navigateToNextPaper() {
  if (currentFilteredPapers.length === 0) return;
  
  currentPaperIndex = currentPaperIndex < currentFilteredPapers.length - 1 ? currentPaperIndex + 1 : 0;
  const paper = currentFilteredPapers[currentPaperIndex];
  showPaperDetails(paper, currentPaperIndex + 1);
}

// 무작위 논문 표시
function showRandomPaper() {
  // 사용 가능한 논문이 있는지 확인
  if (currentFilteredPapers.length === 0) {
    console.log('No papers available to show random paper');
    return;
  }
  
  // 무작위 인덱스 생성
  const randomIndex = Math.floor(Math.random() * currentFilteredPapers.length);
  const randomPaper = currentFilteredPapers[randomIndex];
  
  // 현재 논문 인덱스 업데이트
  currentPaperIndex = randomIndex;
  
  // 무작위 논문 표시
  showPaperDetails(randomPaper, currentPaperIndex + 1);
  
  // 무작위 논문 인디케이터 표시
  showRandomPaperIndicator();
  
  console.log(`Showing random paper: ${randomIndex + 1}/${currentFilteredPapers.length}`);
}

// 무작위 논문 인디케이터 표시
function showRandomPaperIndicator() {
  // 기존 인디케이터 제거
  const existingIndicator = document.querySelector('.random-paper-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // 새 인디케이터 생성
  const indicator = document.createElement('div');
  indicator.className = 'random-paper-indicator';
  indicator.textContent = 'Random Paper';
  
  // 페이지에 추가
  document.body.appendChild(indicator);
  
  // 3초 후 자동 제거
  setTimeout(() => {
    if (indicator && indicator.parentNode) {
      indicator.remove();
    }
  }, 3000);
}

function toggleDatePicker() {
  const datePicker = document.getElementById('datePickerModal');
  datePicker.classList.toggle('active');
  
  if (datePicker.classList.contains('active')) {
    document.body.style.overflow = 'hidden';
    
    // 최신 사용 가능한 날짜를 반영하도록 날짜 선택기 재초기화
    if (flatpickrInstance) {
      flatpickrInstance.setDate(currentDate, false);
    }
  } else {
    document.body.style.overflow = '';
  }
}

function toggleView() {
  currentView = currentView === 'grid' ? 'list' : 'grid';
  document.getElementById('paperContainer').classList.toggle('list-view', currentView === 'list');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
}

async function loadPapersByDateRange(startDate, endDate) {
  // 사용자가 날짜를 역순으로 클릭한 경우(종료일 먼저 클릭 후 시작일 클릭) 호환 처리
  const normalizedStartDate = startDate <= endDate ? startDate : endDate;
  const normalizedEndDate = startDate <= endDate ? endDate : startDate;

  // 날짜 범위 내의 모든 유효한 날짜 가져오기
  const validDatesInRange = availableDates.filter(date => {
    return date >= normalizedStartDate && date <= normalizedEndDate;
  });
  
  if (validDatesInRange.length === 0) {
    alert('No available papers in the selected date range.');
    return;
  }
  
  currentDate = `${normalizedStartDate} to ${normalizedEndDate}`;
  document.getElementById('currentDate').textContent = `${formatDate(normalizedStartDate)} - ${formatDate(normalizedEndDate)}`;
  
  // 활성화된 키워드 및 저자를 재설정하지 않음
  // 대신 현재 선택 상태 유지
  
  const container = document.getElementById('paperContainer');
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading papers from ${formatDate(normalizedStartDate)} to ${formatDate(normalizedEndDate)}...</p>
    </div>
  `;
  
  try {
    // 모든 날짜의 논문 데이터 로드
    const allPaperData = {};
    
    for (const date of validDatesInRange) {
      const selectedLanguage = selectLanguageForDate(date);
      // data 브랜치에서 데이터 파일 가져오기
      const dataUrl = DATA_CONFIG.getDataUrl(`data/${date}_AI_enhanced_${selectedLanguage}.jsonl`);
      const response = await fetch(dataUrl);
      const text = await response.text();
      const dataPapers = parseJsonlData(text, date);
      
      // 데이터 병합
      Object.keys(dataPapers).forEach(category => {
        if (!allPaperData[category]) {
          allPaperData[category] = [];
        }
        allPaperData[category] = allPaperData[category].concat(dataPapers[category]);
      });
    }
    
    paperData = allPaperData;

    const categories = getAllCategories(paperData);

    renderCategoryFilter(categories);

    // URL에 category, json, author, keywords 파라미터가 있으면 즉시 JSON 반환
    const hasJsonParams = urlCategoryParam !== null || urlJsonParam !== null || urlAuthorParam !== null || urlKeywordsParam !== null;
    if (hasJsonParams) {
      // 기본 논문 목록 가져오기 (category 또는 all 기준)
      const targetCategory = urlCategoryParam || urlJsonParam || 'all';
      let papers = getPapersByCategory(paperData, targetCategory);

      // keywords 및 author 일치 적용 ("OR" 관계)
      if (urlKeywordsParam || urlAuthorParam) {
        papers = matchPapersByKeywordsOrAuthor(papers, urlKeywordsParam, urlAuthorParam);
      }

      // JSON 모드: 일치하는 논문만 반환
      papers = papers.filter(p => p.isMatched);

      outputJsonData(papers, targetCategory);
      return;
    }

    renderPapers();
  } catch (error) {
    console.error('논문 데이터 로드 실패:', error);
    container.innerHTML = `
      <div class="loading-container">
        <p>Loading data fails. Please retry.</p>
        <p>Error messages: ${error.message}</p>
      </div>
    `;
  }
}

// 모든 활성 키워드 지우기
function clearAllKeywords() {
  activeKeywords = [];
  // renderKeywordTags();
  // 논문 목록 다시 렌더링, 키워드 일치 하이라이트 및 우선 정렬 제거
  renderPapers();
}

// 모든 저자 필터 지우기
function clearAllAuthors() {
  activeAuthors = [];
  renderFilterTags();
  // 논문 목록 다시 렌더링, 저자 일치 하이라이트 및 우선 정렬 제거
  renderPapers();
}


