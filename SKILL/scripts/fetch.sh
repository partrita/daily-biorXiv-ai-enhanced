#!/bin/bash

# 매개변수 1: URL, 매개변수 2: 타임아웃(밀리초), 기본값 60000(1분)
url=${1:-"https://dw-dengwei.github.io/daily-arXiv-ai-enhanced/?category=cs.CV"}
timeout=${2:-60000}

# node 설치 여부 확인
if ! command -v node &> /dev/null; then
    echo "오류: Node.js가 설치되어 있지 않습니다"
    echo "먼저 Node.js를 설치하세요: https://nodejs.org/"
    exit 1
fi

# puppeteer 설치 여부 확인
if ! node -e "require('puppeteer')" &> /dev/null; then
    echo "경고: puppeteer가 설치되어 있지 않습니다"
    echo "puppeteer 설치 중..."
    npm install puppeteer
    if [ $? -ne 0 ]; then
        echo "오류: puppeteer 설치 실패"
        exit 1
    fi
    echo "puppeteer 설치 성공"
fi

# 크롤링 실행
node -e "
const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    await page.goto('$url', {
      waitUntil: 'networkidle0',
      timeout: $timeout
    });

    const content = await page.evaluate(() => document.body.innerText);

    console.log(content);

    await browser.close();
  } catch (err) {
    console.error('❌ Puppeteer 실행 실패:');
    console.error(err);
    process.exit(1);
  }
})();
"