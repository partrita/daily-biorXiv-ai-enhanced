let currentDate = '';
let availableDates = [];
let paperData = {};
let flatpickrInstance = null;
let isRangeMode = false;
let allPapersData = [];

document.addEventListener('DOMContentLoaded', () => {
  // Check screen size
  const checkScreenSize = () => {
    if (window.innerWidth < 768) {
      const warningModal = document.createElement('div');
      warningModal.className = 'screen-size-warning';
      warningModal.innerHTML = `
        <div class="warning-content">
          <h3>⚠️ Screen Size Notice</h3>
          <p>We've detected that you're using a device with a small screen. For the best data visualization experience, we recommend viewing this statistics page on a larger screen device (such as a tablet or computer).</p>
          <button onclick="this.parentElement.parentElement.remove()">Got it</button>
        </div>
      `;
      document.body.appendChild(warningModal);
    }
  };

  checkScreenSize();
  // Recheck on window resize
  window.addEventListener('resize', checkScreenSize);

  initEventListeners();
  fetchGitHubStats();
  
  fetchAvailableDates().then(() => {
    if (availableDates.length > 0) {
      loadPapersByDateRange(availableDates[0], availableDates[0]);
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

function initEventListeners() {
  // 캘린더 버튼을 통해서만 날짜 선택기 열기 허용
  const calendarButton = document.getElementById('calendarButton');
  calendarButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDatePicker();
  });
  
  // 모달 배경 클릭 시 닫기
  const datePickerModal = document.querySelector('.date-picker-modal');
  datePickerModal.addEventListener('click', (event) => {
    if (event.target === datePickerModal) {
      toggleDatePicker();
    }
  });
  
  // 날짜 선택기 콘텐츠 영역의 클릭 이벤트 전파 방지
  const datePickerContent = document.querySelector('.date-picker-content');
  datePickerContent.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  document.getElementById('dateRangeMode').addEventListener('change', toggleRangeMode);
  
  // 사이드바 닫기 버튼 이벤트 추가
  const closeButton = document.querySelector('.close-sidebar');
  if (closeButton) {
    closeButton.addEventListener('click', closeSidebar);
  }
  
  // 사이드바 외부 클릭 시 사이드바 닫기
  document.addEventListener('click', (event) => {
    const sidebar = document.getElementById('paperSidebar');
    const isClickInside = sidebar.contains(event.target);
    const isClickOnKeyword = event.target.closest('.keyword-item') || 
                            event.target.closest('.keyword-cloud text');
    
    if (!isClickInside && !isClickOnKeyword && sidebar.classList.contains('active')) {
      closeSidebar();
    }
  });
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
  return availableLanguages.includes('Korean') ? 'Korean' : availableLanguages[0];
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
        return !!enabledDatesMap[dateStr];
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
        if (availableDates.includes(selectedDate)) {
          loadPapersByDateRange(selectedDate, selectedDate);
          toggleDatePicker();
        }
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

async function loadPapersByDateRange(startDate, endDate) {
  // 날짜 범위 내의 모든 유효한 날짜 가져오기
  const validDatesInRange = availableDates.filter(date => {
    return date >= startDate && date <= endDate;
  });
  
  if (validDatesInRange.length === 0) {
    alert('No available papers in the selected date range.');
    return;
  }
  
  if (startDate === endDate) {  
    currentDate = startDate;
    document.getElementById('currentDate').textContent = formatDate(startDate);
  } else {
    currentDate = `${startDate} - ${endDate}`;
    document.getElementById('currentDate').textContent = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  
  const container = document.getElementById('papersList');
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading papers from ${formatDate(startDate)} to ${formatDate(endDate)}...</p>
    </div>
  `;
  
  try {
    // 모든 날짜의 논문 데이터 로드
    const allPaperData = {};
    allPapersData = []; // 전역 논문 데이터 초기화
    
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
        // 논문을 전역 배열에 추가
        allPapersData = allPapersData.concat(dataPapers[category]);
      });
    }
    
    paperData = allPaperData;

    // 모든 논문 제목 추출
    const allTitle = [];
    Object.keys(paperData).forEach(category => {
      paperData[category].forEach(paper => {
        allTitle.push(paper.title);
      });
    });

    // 키워드 추출 및 요약
    const extractKeywords = (text) => {
      // 특수 문자 및 불필요한 공백 제거
      const cleanText = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      
      // compromise 라이브러리를 사용한 텍스트 처리
      const doc = nlp(cleanText);
      
      // 명사구 및 중요 어휘 추출
      const terms = new Set();
      
      // 명사구 추출
      doc.match('#Noun+').forEach(match => {
        const phrase = match.text().toLowerCase();
        if (phrase.split(' ').length <= 3) { // 최대 3단어 구문
          terms.add(phrase);
        }
      });
      
      // 형용사+명사 조합 추출
      doc.match('(#Adjective+ #Noun+)').forEach(match => {
        const phrase = match.text().toLowerCase();
        if (phrase.split(' ').length <= 3) {
          terms.add(phrase);
        }
      });
      
      // 불용어(Stopwords) 정의
      const stopWords = new Set([
        'the', 'is', 'at', 'which', 'and', 'or', 'in', 'to', 'for', 'of', 
        'with', 'by', 'on', 'this', 'that', 'our', 'method', 'based', 
        'towards', 'via', 'multi', 'text', 'using', 'aware', 'data', 'from',
        'paper', 'propose', 'proposed', 'approach', 'model', 'system', 
        'framework', 'results', 'show', 'demonstrates', 'experimental', 
        'experiments', 'evaluation', 'performance', 'state', 'art', 'sota',
        'dataset', 'datasets', 'task', 'tasks', 'learning', 'neural', 
        'network', 'networks', 'deep', 'machine', 'artificial', 'intelligence', 
        'ai', 'ml', 'dl'
      ]);
      
      // 불용어 및 짧은 단어 필터링
      const filteredTerms = Array.from(terms).filter(term => {
        const words = term.split(' ');
        return words.every(word => word.length > 2) && 
               !words.every(word => stopWords.has(word));
      });
      
      // 단어 빈도 집계
      const termFreq = {};
      filteredTerms.forEach(term => {
        termFreq[term] = (termFreq[term] || 0) + 1;
        // 다중 단어 구문에 더 높은 가중치 부여
        if (term.includes(' ')) {
          termFreq[term] *= 1.5;
        }
      });
      
      // TF 값(단어 빈도) 계산
      const tfScores = {};
      const totalTerms = Object.values(termFreq).reduce((a, b) => a + b, 0);
      Object.entries(termFreq).forEach(([term, freq]) => {
        tfScores[term] = freq / totalTerms;
      });
      
      // TF 값 기준으로 정렬하여 상위 10개 키워드/구문 반환
      return Object.entries(tfScores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([term]) => term);
    };

    // 모든 요약문 처리
    const allKeywords = new Map();
    const keywordTrends = new Map(); // 키워드 트렌드 데이터 구조 추가
    
    // 날짜 데이터 구조 초기화
    validDatesInRange.forEach(date => {
      keywordTrends.set(date, new Map());
    });
    
    // 날짜별 키워드 집계
    allTitle.forEach((abstract, index) => {
      const date = validDatesInRange[Math.floor(index / (allTitle.length / validDatesInRange.length))];
      const keywords = extractKeywords(abstract);
      
      keywords.forEach(keyword => {
        // 전체 통계 업데이트
        allKeywords.set(keyword, (allKeywords.get(keyword) || 0) + 1);
        
        // 날짜별 차원 통계 업데이트
        const dateStats = keywordTrends.get(date);
        dateStats.set(keyword, (dateStats.get(keyword) || 0) + 1);
      });
    });

    // 키워드 클라우드 데이터 생성
    const keywordCloudData = Array.from(allKeywords.entries())
      .filter(([, count]) => count > 1)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 30)
      .map(([keyword, count]) => ({
        text: keyword,
        size: Math.max(12, Math.min(50, count * 3))
      }));

    // 꺾은선형 차트 데이터 준비
    const top10Keywords = keywordCloudData.slice(0, 10).map(d => d.text);
    const trendData = top10Keywords.map(keyword => {
      return {
        keyword: keyword,
        values: Array.from(keywordTrends.entries()).map(([date, stats]) => ({
          date: new Date(date + 'T00:00:00Z'),  // 날짜가 올바르게 파싱되도록 시간 부분 추가
          count: stats.get(keyword) || 0
        })).sort((a, b) => a.date - b.date)  // 데이터가 날짜순으로 정렬되도록 보장
      };
    });

    // 시각화 생성
    container.innerHTML = `
      <div class="statistics-section">
        <h2>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.41 11.58L12.41 2.58C12.05 2.22 11.55 2 11 2H4C2.9 2 2 2.9 2 4V11C2 11.55 2.22 12.05 2.59 12.42L11.59 21.42C11.95 21.78 12.45 22 13 22C13.55 22 14.05 21.78 14.41 21.41L21.41 14.41C21.78 14.05 22 13.55 22 13C22 12.45 21.77 11.94 21.41 11.58ZM5.5 7C4.67 7 4 6.33 4 5.5C4 4.67 4.67 4 5.5 4C6.33 4 7 4.67 7 5.5C7 6.33 6.33 7 5.5 7Z" fill="currentColor"/>
          </svg>
          Popular Keywords
        </h2>
        <div class="statistics-card">
          <div class="keyword-list">
            ${keywordCloudData.map((item, index) => `
              <div class="keyword-item" onclick="showRelatedPapers('${item.text}')">
                <span class="keyword-rank">${index + 1}</span>
                <span class="keyword-text">${item.text}</span>
                <span class="keyword-count">${allKeywords.get(item.text)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        ${startDate !== endDate ? `
        <h2 class="trend-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.5 18.5L9.5 12.5L13.5 16.5L22 6.92L20.59 5.5L13.5 13.5L9.5 9.5L2 17L3.5 18.5Z" fill="currentColor"/>
          </svg>
          Keywords Trend
        </h2>
        <div class="statistics-card">
          <div id="trendChart" style="width: 100%; height: 400px;"></div>
        </div>
        ` : ''}
      </div>
    `;

    // 날짜 범위 모드에서만 트렌드 차트 생성
    if (startDate !== endDate) {
      // 꺾은선형 차트 생성
      const margin = {top: 20, right: 180, bottom: 80, left: 60}; // 더 긴 날짜 라벨을 수용하기 위해 하단 여백 증가
      const width = document.getElementById('trendChart').offsetWidth - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      const svg = d3.select('#trendChart')
        .append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
        .append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`);

      // 스케일(척도) 설정
      const x = d3.scaleTime()
        .domain(d3.extent(validDatesInRange, d => new Date(d)))
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(trendData, d => d3.max(d.values, v => v.count))])
        .range([height, 0]);

      // 더 부드러운 색상을 사용하는 색상 스케일 생성
      const color = d3.scaleOrdinal()
        .range(['#4e79a7', '#f28e2c', '#59a14f', '#e15759', '#76b7b2', 
                '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab']);

      // X축 격자선 추가
      svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.1)
        .call(d3.axisBottom(x)
          .ticks(8)
          .tickSize(-height)
          .tickFormat(''));

      // Y축 격자선 추가
      svg.append('g')
        .attr('class', 'grid')
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.1)
        .call(d3.axisLeft(y)
          .tickSize(-width)
          .tickFormat(''));

      // 적절한 날짜 형식을 결정하는 함수 추가
      function determineDateFormat(dates) {
        const startDate = new Date(dates[0]);
        const endDate = new Date(dates[dates.length - 1]);
        
        // 연도가 바뀌는지 확인
        const sameYear = startDate.getFullYear() === endDate.getFullYear();
        // 같은 달인지 확인
        const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();
        
        if (sameMonth) {
          return d3.timeFormat("%d"); // 일만 표시
        } else if (sameYear) {
          return d3.timeFormat("%m-%d"); // 월-일 표시
        } else {
          return d3.timeFormat("%Y-%m-%d"); // 전체 날짜 표시
        }
      }

      // 날짜 포맷 함수 가져오기
      const dateFormat = determineDateFormat(validDatesInRange);
      
      // X축 추가
      svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x)
          .ticks(Math.min(validDatesInRange.length, 8))
          .tickFormat(dateFormat))
        .selectAll("text")
        .style("text-anchor", "end")
        .style("font-size", "12px")
        .style("fill", "var(--text-secondary)")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

      // Y축 추가
      svg.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y)
          .ticks(5))
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", "var(--text-secondary)");

      // Y축 제목 추가
      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill", "var(--text-secondary)")
        .style("font-size", "12px")
        .text("Frequency");

      // X축 제목 추가, 연도 및 월 표시(생략된 경우)
      const startDate = new Date(validDatesInRange[0]);
      const endDate = new Date(validDatesInRange[validDatesInRange.length - 1]);
      let xAxisTitle = "";
      
      if (startDate.getFullYear() === endDate.getFullYear()) {
        if (startDate.getMonth() === endDate.getMonth()) {
          xAxisTitle = `${startDate.getFullYear()}/${String(startDate.getMonth() + 1).padStart(2, '0')}`;
        } else {
          xAxisTitle = `${startDate.getFullYear()}`;
        }
      }
      
      if (xAxisTitle) {
        svg.append("text")
          .attr("transform", `translate(${width/2}, ${height + margin.bottom - 5})`)
          .style("text-anchor", "middle")
          .style("fill", "var(--text-secondary)")
          .style("font-size", "12px")
          .text(xAxisTitle);
      }

      // 좌표축 선 굵게 설정
      svg.selectAll('.x-axis path, .y-axis path, .x-axis line, .y-axis line')
        .style('stroke', 'var(--text-secondary)')
        .style('stroke-width', '1.5px');

      // 영역(Area) 생성기 정의
      const area = d3.area()
        .x(d => x(d.date))
        .y0(height)
        .y1(d => y(d.count))
        .curve(d3.curveBasis); // 더 부드러운 곡선 사용

      // 선(Line) 생성기 정의
      const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.count))
        .curve(d3.curveBasis); // 동일한 부드러운 곡선 사용

      // 그라데이션 정의 추가
      const gradient = svg.append("defs")
        .selectAll("linearGradient")
        .data(trendData)
        .enter()
        .append("linearGradient")
        .attr("id", (d, i) => `gradient-${i}`)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d => color(d.keyword))
        .attr("stop-opacity", 0.3);

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d => color(d.keyword))
        .attr("stop-opacity", 0.05);

      // 영역 그리기
      const areas = svg.selectAll('.area')
        .data(trendData)
        .enter()
        .append('path')
          .attr('class', 'area')
          .attr('d', d => area(d.values))
          .style('fill', (d, i) => `url(#gradient-${i})`)
          .style('opacity', 0.7);

      // 꺾은선 그리기
      const paths = svg.selectAll('.line')
        .data(trendData)
        .enter()
        .append('path')
          .attr('class', 'line')
          .attr('d', d => line(d.values))
          .style('stroke', d => color(d.keyword))
          .style('fill', 'none')
          .style('stroke-width', 2)
          .style('opacity', 0.8);

      // 범례 추가
      const legend = svg.selectAll('.legend')
        .data(trendData)
        .enter()
        .append('g')
          .attr('class', 'legend')
          .attr('transform', (d, i) => `translate(${width + 20},${i * 25})`);

      legend.append('rect')
        .attr('x', 0)
        .attr('width', 18)
        .attr('height', 18)
        .style('fill', d => color(d.keyword))
        .style('opacity', 0.7);

      legend.append('text')
        .attr('x', 28)
        .attr('y', 13)
        .text(d => d.keyword)
        .style('font-size', '12px')
        .style('alignment-baseline', 'middle');

      // 인터랙션 효과 추가
      legend.style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          const keyword = d.keyword;
          
          // 다른 선과 영역의 투명도 낮추기
          areas.style('opacity', 0.1);
          paths.style('opacity', 0.1);
          
          // 현재 선택된 선과 영역 강조
          svg.selectAll('.area')
            .filter(p => p.keyword === keyword)
            .style('opacity', 0.9);
          
          svg.selectAll('.line')
            .filter(p => p.keyword === keyword)
            .style('opacity', 1)
            .style('stroke-width', 3);
        })
        .on('mouseout', function() {
          // 원래 상태 복원
          areas.style('opacity', 0.7);
          paths.style('opacity', 0.8)
            .style('stroke-width', 2);
        });
    }
    
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
        authors: Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors,
        category: allCategories,
        summary: summary,
        details: paper.summary || '',
        date: date,
        id: paper.id,
        motivation: paper.AI && paper.AI.motivation ? paper.AI.motivation : '',
        method: paper.AI && paper.AI.method ? paper.AI.method : '',
        result: paper.AI && paper.AI.result ? paper.AI.result : '',
        conclusion: paper.AI && paper.AI.conclusion ? paper.AI.conclusion : ''
      });
    } catch (error) {
      console.error('JSON 라인 파싱 실패:', error, line);
    }
  });
  
  return result;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
}

// showRelatedPapers 함수에서 논문 카드 생성 부분 수정
function showRelatedPapers(keyword) {
    const sidebar = document.getElementById('paperSidebar');
    const selectedKeywordElement = document.getElementById('selectedKeyword');
    const relatedPapersContainer = document.getElementById('relatedPapers');
    
    // 키워드 표시 업데이트
    selectedKeywordElement.textContent = 'Keyword: ' + keyword;
    
    // 키워드를 포함하는 논문 검색
    const relatedPapers = allPapersData.filter(paper => {
        const searchText = (paper.title + ' ' + paper.summary).toLowerCase();
        return searchText.includes(keyword.toLowerCase());
    });
    
    // 관련 논문 HTML 생성
    const papersHTML = relatedPapers.map((paper, index) => `
        <div class="paper-card">
            <div class="paper-number">${index + 1}</div>
            <a href="${paper.url}" target="_blank" class="paper-title">${paper.title}</a>
            <div class="paper-authors">${paper.authors}</div>
            <div class="paper-categories">
                ${paper.category.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
            </div>
            <div class="paper-summary">${paper.summary}</div>
        </div>
    `).join('');
    
    // 사이드바 내용 업데이트
    relatedPapersContainer.innerHTML = relatedPapers.length > 0 
        ? papersHTML 
        : '<p>No related papers found.</p>';
    
    // 사이드바 표시
    sidebar.classList.add('active');
}

// 새 함수 추가: 사이드바 닫기
function closeSidebar() {
  const sidebar = document.getElementById('paperSidebar');
  sidebar.classList.remove('active');
}