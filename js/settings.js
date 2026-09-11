document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  initEventListeners();
  fetchGitHubStats();
});

// 설정 초기화, localStorage에서 저장된 설정 로드
function initSettings() {
  // 키워드 기본 설정 로드
  loadKeywordPreferences();
  // 저자 기본 설정 로드
  loadAuthorPreferences();
}

// localStorage에서 키워드 설정 로드
function loadKeywordPreferences() {
  const selectedKeywordsContainer = document.getElementById('selectedKeywords');
  selectedKeywordsContainer.innerHTML = '';
  
  // 저장된 키워드 가져오기, 없으면 기본 키워드 사용
  let savedKeywords = localStorage.getItem('preferredKeywords');
  let keywords = ['antibody', 'antigen', 'nanobody', 'CDR', 'immunoglobulin']; // 기본 항체 키워드
  
  if (savedKeywords) {
    try {
      keywords = JSON.parse(savedKeywords);
    } catch (e) {
      console.error('키워드 파싱 실패:', e);
    }
  }
  
  // 저장된 키워드 표시
  if (keywords.length > 0) {
    keywords.forEach(keyword => {
      addKeywordTag(keyword);
    });
  } else {
    // 빈 태그 메시지 표시
    showEmptyTagMessage();
  }
}

// localStorage에서 저자 설정 로드
function loadAuthorPreferences() {
  const selectedAuthorsContainer = document.getElementById('selectedAuthors');
  selectedAuthorsContainer.innerHTML = '';
  
  // 저장된 저자 가져오기, 없으면 빈 배열
  let savedAuthors = localStorage.getItem('preferredAuthors');
  let authors = []; // 기본값: 저자 없음
  
  if (savedAuthors) {
    try {
      authors = JSON.parse(savedAuthors);
    } catch (e) {
      console.error('저자 파싱 실패:', e);
    }
  }
  
  // 저장된 저자 표시
  if (authors.length > 0) {
    authors.forEach(author => {
      addAuthorTag(author);
    });
  } else {
    // 빈 저자 태그 메시지 표시
    showEmptyAuthorMessage();
  }
}

// 빈 태그 메시지 표시
function showEmptyTagMessage() {
  const selectedKeywordsContainer = document.getElementById('selectedKeywords');
  const emptyMessage = document.createElement('div');
  emptyMessage.id = 'emptyTagMessage';
  emptyMessage.className = 'empty-tag-message';
  emptyMessage.textContent = 'No keywords added yet. Add some keywords below.';
  selectedKeywordsContainer.appendChild(emptyMessage);
}

// 빈 저자 메시지 표시
function showEmptyAuthorMessage() {
  const selectedAuthorsContainer = document.getElementById('selectedAuthors');
  const emptyMessage = document.createElement('div');
  emptyMessage.id = 'emptyAuthorMessage';
  emptyMessage.className = 'empty-tag-message';
  emptyMessage.textContent = 'No authors added yet. Add some authors below.';
  selectedAuthorsContainer.appendChild(emptyMessage);
}

// 빈 태그 메시지 숨기기
function hideEmptyTagMessage() {
  const emptyMessage = document.getElementById('emptyTagMessage');
  if (emptyMessage) {
    emptyMessage.remove();
  }
}

// 빈 저자 메시지 숨기기
function hideEmptyAuthorMessage() {
  const emptyMessage = document.getElementById('emptyAuthorMessage');
  if (emptyMessage) {
    emptyMessage.remove();
  }
}

// 키워드 태그 추가
function addKeywordTag(keyword) {
  const selectedKeywordsContainer = document.getElementById('selectedKeywords');
  
  // 빈 태그 메시지 제거
  hideEmptyTagMessage();
  
  // 키워드가 이미 존재하는지 확인
  const existingTags = selectedKeywordsContainer.querySelectorAll('.category-button');
  for (let i = 0; i < existingTags.length; i++) {
    if (existingTags[i].textContent.trim().startsWith(keyword)) {
      // 이미 존재하는 키워드인 경우 깜빡임 애니메이션으로 알림
      existingTags[i].classList.add('tag-highlight');
      setTimeout(() => {
        existingTags[i].classList.remove('tag-highlight');
      }, 1000);
      return; // 이미 존재하므로 추가하지 않음
    }
  }
  
  // 새 키워드 태그 생성
  const tagElement = document.createElement('span');
  tagElement.className = 'category-button tag-appear';
  tagElement.innerHTML = `${keyword} <button class="remove-tag">×</button>`;
  
  // 삭제 버튼 이벤트 추가
  const removeButton = tagElement.querySelector('.remove-tag');
  removeButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 삭제 애니메이션 추가
    tagElement.classList.add('tag-disappear');
    
    // 애니메이션 종료 후 요소 제거
    setTimeout(() => {
      tagElement.remove();
      
      // 태그가 없으면 빈 태그 메시지 표시
      if (selectedKeywordsContainer.querySelectorAll('.category-button').length === 0) {
        showEmptyTagMessage();
      }
    }, 300);
  });
  
  selectedKeywordsContainer.appendChild(tagElement);
  
  // 등장 애니메이션 후 클래스 제거
  setTimeout(() => {
    tagElement.classList.remove('tag-appear');
  }, 300);
}

// 저자 태그 추가
function addAuthorTag(author) {
  const selectedAuthorsContainer = document.getElementById('selectedAuthors');
  
  // 빈 태그 메시지 제거
  hideEmptyAuthorMessage();
  
  // 저자가 이미 존재하는지 확인
  const existingTags = selectedAuthorsContainer.querySelectorAll('.category-button');
  for (let i = 0; i < existingTags.length; i++) {
    if (existingTags[i].textContent.trim().startsWith(author)) {
      // 이미 존재하는 저자인 경우 깜빡임 애니메이션 알림
      existingTags[i].classList.add('tag-highlight');
      setTimeout(() => {
        existingTags[i].classList.remove('tag-highlight');
      }, 1000);
      return; // 이미 존재하므로 추가하지 않음
    }
  }
  
  // 새 저자 태그 생성
  const tagElement = document.createElement('span');
  tagElement.className = 'category-button tag-appear';
  tagElement.innerHTML = `${author} <button class="remove-tag">×</button>`;
  
  // 삭제 버튼 이벤트 추가
  const removeButton = tagElement.querySelector('.remove-tag');
  removeButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 삭제 애니메이션 추가
    tagElement.classList.add('tag-disappear');
    
    // 애니메이션 종료 후 요소 제거
    setTimeout(() => {
      tagElement.remove();
      
      // 태그가 없으면 빈 태그 메시지 표시
      if (selectedAuthorsContainer.querySelectorAll('.category-button').length === 0) {
        showEmptyAuthorMessage();
      }
    }, 300);
  });
  
  selectedAuthorsContainer.appendChild(tagElement);
  
  // 등장 애니메이션 후 클래스 제거
  setTimeout(() => {
    tagElement.classList.remove('tag-appear');
  }, 300);
}

// 이벤트 리스너 초기화
function initEventListeners() {
  // 키워드 추가 버튼
  const addKeywordButton = document.getElementById('addKeyword');
  addKeywordButton.addEventListener('click', () => {
    const keywordInput = document.getElementById('keywordInput');
    const keyword = keywordInput.value.trim();

    if (keyword) {
      // 쉼표 포함 여부 확인 후 분할
      if (keyword.includes(',')) {
        const keywords = keyword.split(',').map(k => k.trim()).filter(k => k);
        keywords.forEach(k => addKeywordTag(k));
      } else {
        addKeywordTag(keyword);
      }
      keywordInput.value = '';
    }
  });

  // 키워드 입력 필드 Enter 이벤트
  const keywordInput = document.getElementById('keywordInput');
  keywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const keyword = keywordInput.value.trim();

      if (keyword) {
        // 쉼표 포함 여부 확인 후 분할
        if (keyword.includes(',')) {
          const keywords = keyword.split(',').map(k => k.trim()).filter(k => k);
          keywords.forEach(k => addKeywordTag(k));
        } else {
          addKeywordTag(keyword);
        }
        keywordInput.value = '';
      }
    }
  });

  // 저자 추가 버튼
  const addAuthorButton = document.getElementById('addAuthor');
  addAuthorButton.addEventListener('click', () => {
    const authorInput = document.getElementById('authorInput');
    const author = authorInput.value.trim();

    if (author) {
      // 쉼표 포함 여부 확인 후 분할
      if (author.includes(',')) {
        const authors = author.split(',').map(a => a.trim()).filter(a => a);
        authors.forEach(a => addAuthorTag(a));
      } else {
        addAuthorTag(author);
      }
      authorInput.value = '';
    }
  });

  // 저자 입력 필드 Enter 이벤트
  const authorInput = document.getElementById('authorInput');
  authorInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const author = authorInput.value.trim();

      if (author) {
        // 쉼표 포함 여부 확인 후 분할
        if (author.includes(',')) {
          const authors = author.split(',').map(a => a.trim()).filter(a => a);
          authors.forEach(a => addAuthorTag(a));
        } else {
          addAuthorTag(author);
        }
        authorInput.value = '';
      }
    }
  });

  // 키워드 복사 버튼
  const copyKeywordsButton = document.getElementById('copyKeywords');
  copyKeywordsButton.addEventListener('click', copyKeywords);

  // 저자 복사 버튼
  const copyAuthorsButton = document.getElementById('copyAuthors');
  copyAuthorsButton.addEventListener('click', copyAuthors);

  // 설정 저장 버튼
  const saveSettingsButton = document.getElementById('saveSettings');
  saveSettingsButton.addEventListener('click', saveSettings);

  // 설정 초기화 버튼
  const resetSettingsButton = document.getElementById('resetSettings');
  resetSettingsButton.addEventListener('click', resetSettings);
}

// 키워드 클립보드 복사
function copyKeywords() {
  const keywordTags = document.getElementById('selectedKeywords').querySelectorAll('.category-button');
  const keywords = [];
  keywordTags.forEach(tag => {
    const keywordName = tag.textContent.trim().replace('×', '').trim();
    keywords.push(keywordName);
  });

  if (keywords.length === 0) {
    showNotification('No keywords to copy!', 'info');
    return;
  }

  const keywordsString = keywords.join(',');
  copyToClipboard(keywordsString, 'Keywords copied to clipboard!');
}

// 저자 클립보드 복사
function copyAuthors() {
  const authorTags = document.getElementById('selectedAuthors').querySelectorAll('.category-button');
  const authors = [];
  authorTags.forEach(tag => {
    const authorName = tag.textContent.trim().replace('×', '').trim();
    authors.push(authorName);
  });

  if (authors.length === 0) {
    showNotification('No authors to copy!', 'info');
    return;
  }

  const authorsString = authors.join(',');
  copyToClipboard(authorsString, 'Authors copied to clipboard!');
}

// 클립보드 복사 공통 함수
function copyToClipboard(text, successMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showNotification(successMessage, 'success');
    }).catch(err => {
      console.error('복사 실패:', err);
      fallbackCopyText(text, successMessage);
    });
  } else {
    fallbackCopyText(text, successMessage);
  }
}

// 대체 복사 방법 (clipboard API 미지원 브라우저용)
function fallbackCopyText(text, successMessage) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();

  try {
    document.execCommand('copy');
    showNotification(successMessage, 'success');
  } catch (err) {
    console.error('복사 실패:', err);
    showNotification('Failed to copy to clipboard', 'info');
  }

  document.body.removeChild(textArea);
}

// 설정 저장
function saveSettings() {
  // 선택된 모든 키워드 가져오기
  const keywordTags = document.getElementById('selectedKeywords').querySelectorAll('.category-button');
  const keywords = [];
  keywordTags.forEach(tag => {
    const keywordName = tag.textContent.trim().replace('×', '').trim();
    keywords.push(keywordName);
  });
  
  // 선택된 모든 저자 가져오기
  const authorTags = document.getElementById('selectedAuthors').querySelectorAll('.category-button');
  const authors = [];
  authorTags.forEach(tag => {
    const authorName = tag.textContent.trim().replace('×', '').trim();
    authors.push(authorName);
  });
  
  // 설정을 localStorage에 저장
  localStorage.setItem('preferredKeywords', JSON.stringify(keywords));
  localStorage.setItem('preferredAuthors', JSON.stringify(authors));
  
  // 저장 성공 알림 표시
  showNotification('Settings saved successfully!', 'success');
}

// 설정 초기화
function resetSettings() {
  // 키워드 초기화
  const selectedKeywordsContainer = document.getElementById('selectedKeywords');
  selectedKeywordsContainer.innerHTML = '';
  
  // 저자 초기화
  const selectedAuthorsContainer = document.getElementById('selectedAuthors');
  selectedAuthorsContainer.innerHTML = '';
  
  // 빈 태그 메시지 표시
  showEmptyTagMessage();
  showEmptyAuthorMessage();
  
  // 초기화 완료 알림
  showNotification('Settings reset to default!', 'info');
}

// 알림 표시
function showNotification(message, type = 'success') {
  // 기존 알림 요소 확인
  let notification = document.querySelector('.settings-notification');
  
  if (!notification) {
    // 알림 요소 생성
    notification = document.createElement('div');
    notification.className = 'settings-notification';
    document.body.appendChild(notification);
  }
  
  // 유형별 아이콘 설정
  let icon = '';
  let bgColor = 'var(--primary-color)';
  
  if (type === 'success') {
    icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>';
  } else if (type === 'info') {
    icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z" fill="currentColor"/></svg>';
    bgColor = '#3b82f6';
  }
  
  // 알림 내용 및 스타일 설정
  notification.innerHTML = `${icon}<span>${message}</span>`;
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.gap = '8px';
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = bgColor;
  notification.style.color = 'white';
  notification.style.padding = '12px 20px';
  notification.style.borderRadius = 'var(--radius-sm)';
  notification.style.boxShadow = 'var(--shadow-md)';
  notification.style.zIndex = '1000';
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(20px)';
  notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  
  // 알림 표시
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // 3초 후 알림 숨김
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // 애니메이션 종료 후 요소 제거
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// GitHub 통계 데이터 조회
async function fetchGitHubStats() {
  try {
    const response = await fetch('https://api.github.com/repos/dw-dengwei/daily-arXiv-ai-enhanced');
    const data = await response.json();
    const starCount = data.stargazers_count;
    const forkCount = data.forks_count;
    
    document.getElementById('starCount').textContent = starCount;
    document.getElementById('forkCount').textContent = forkCount;
  } catch (error) {
    console.error('GitHub 통계 데이터 조회 실패:', error);
    document.getElementById('starCount').textContent = '?';
    document.getElementById('forkCount').textContent = '?';
  }
} 