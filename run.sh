#!/bin/bash

# 로컬 테스트 스크립트 / Local testing script
# 메인 워크플로는 GitHub Actions (.github/workflows/run.yml)로 이전되었습니다
# Main workflow has been migrated to GitHub Actions (.github/workflows/run.yml)

# 환경 변수 확인 및 안내 / Environment variables check and prompt
echo "=== 로컬 디버그 환경 확인 / Local Debug Environment Check ==="
if [ -z "$TOKEN_GITHUB" ]; then
    echo "⚠️  알림: TOKEN_GITHUB 미설정 / Warning: TOKEN_GITHUB not set"
    echo "GitHub 관련 기능이 제한될 수 있습니다 / May limit GitHub related functionalities"
fi
    echo "✅ TOKEN_GITHUB 설정됨 / TOKEN_GITHUB is set"

# 필수 환경 변수 확인 / Check required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  알림: OPENAI_API_KEY 미설정 / Warning: OPENAI_API_KEY not set"
    echo "📝 전체 로컬 디버깅을 위해 다음 환경 변수를 설정하세요 / For complete local debugging, please set the following environment variables:"
    echo ""
    echo "🔑 필수 변수 / Required variables:"
    echo "   export OPENAI_API_KEY=\"your-api-key-here\""
    echo ""
    echo "🔧 선택 변수 / Optional variables:"
    echo "   export OPENAI_BASE_URL=\"https://generativelanguage.googleapis.com/v1beta/openai\"  # API 기본 URL / API base URL"
    echo "   export LANGUAGE=\"Korean\"                            # 언어 설정 / Language setting"
    echo "   export CATEGORIES=\"de novo design, antibody design\"    # 관심 카테고리 / Categories of interest"
    echo "   export MODEL_NAME=\"gemini-3.7-flash\"                # 모델 이름 / Model name"
    echo ""
    echo "💡 설정 후 이 스크립트를 다시 실행하여 전체 테스트를 진행하세요 / After setting, rerun this script for complete testing"
    echo "🚀 또는 일부 프로세스(크롤링 + 중복 확인)만 계속 실행합니다 / Or continue with partial workflow (crawl + dedup check)"
    echo ""
    read -p "일부 프로세스를 계속 진행하시겠습니까? (y/N) / Continue with partial workflow? (y/N): " continue_partial
    if [[ ! $continue_partial =~ ^[Yy]$ ]]; then
        echo "스크립트 종료 / Exiting script"
        exit 0
    fi
    PARTIAL_MODE=true
else
    echo "✅ OPENAI_API_KEY 설정됨 / OPENAI_API_KEY is set"
    PARTIAL_MODE=false
    
    # 기본값 설정 / Set default values
    export LANGUAGE="${LANGUAGE:-Korean}"
    export CATEGORIES="${CATEGORIES:-de novo design, antibody design}"
    export MODEL_NAME="${MODEL_NAME:-gemini-3.7-flash}"
    export OPENAI_BASE_URL="${OPENAI_BASE_URL:-https://generativelanguage.googleapis.com/v1beta/openai}"
    
    echo "🔧 현재 설정 / Current configuration:"
    echo "   LANGUAGE: $LANGUAGE"
    echo "   CATEGORIES: $CATEGORIES"
    echo "   MODEL_NAME: $MODEL_NAME"
    echo "   OPENAI_BASE_URL: $OPENAI_BASE_URL"
fi

echo ""
echo "=== 로컬 디버그 프로세스 시작 / Starting Local Debug Workflow ==="

# 현재 날짜 가져오기 / Get current date
today=`date -u "+%Y-%m-%d"`

echo "로컬 테스트: $today 의 arXiv 논문 크롤링 중... / Local test: Crawling $today arXiv papers..."

# 1단계: 데이터 크롤링 / Step 1: Crawl data
echo "1단계: 크롤링 시작... / Step 1: Starting crawl..."

# 오늘 파일이 이미 존재하는지 확인 후 삭제 / Check if today's file exists, delete if found
if [ -f "data/${today}.jsonl" ]; then
    echo "🗑️ 오늘의 기존 파일이 발견되어 새로 생성하기 위해 삭제합니다... / Found existing today's file, deleting for fresh start..."
    rm "data/${today}.jsonl"
    echo "✅ 기존 파일 삭제 완료: data/${today}.jsonl / Deleted existing file: data/${today}.jsonl"
else
    echo "📝 오늘 파일이 없어 새로 생성 준비 중... / Today's file doesn't exist, ready to create new one..."
fi

cd daily_arxiv
scrapy crawl arxiv -o ../data/${today}.jsonl

if [ ! -f "../data/${today}.jsonl" ]; then
    echo "크롤링 실패, 데이터 파일이 생성되지 않았습니다 / Crawling failed, no data file generated"
    exit 1
fi

# 2단계: 중복 확인 / Step 2: Check duplicates  
echo "2단계: 중복 확인 실행... / Step 2: Performing intelligent deduplication check..."
python daily_arxiv/check_stats.py
dedup_exit_code=$?

case $dedup_exit_code in
    0)
        # check_stats.py에서 성공 정보를 출력했으므로 계속 진행 / check_stats.py already output success info, continue processing
        ;;
    1)
        # check_stats.py에서 신규 내용 없음 정보를 출력했으므로 중단 / check_stats.py already output no new content info, stop processing
        exit 1
        ;;
    2)
        # check_stats.py에서 오류 정보를 출력했으므로 중단 / check_stats.py already output error info, stop processing
        exit 2
        ;;
    *)
        echo "❌ 알 수 없는 종료 코드, 처리 중단... / Unknown exit code, stopping..."
        exit 1
        ;;
esac

cd ..

# 3단계: AI 처리 / Step 3: AI processing
if [ "$PARTIAL_MODE" = "false" ]; then
    echo "3단계: AI 요약/강화 처리 중... / Step 3: AI enhancement processing..."
    cd ai
    python enhance.py --data ../data/${today}.jsonl
    
    if [ $? -ne 0 ]; then
        echo "❌ AI 처리 실패 / AI processing failed"
        exit 1
    fi
    echo "✅ AI 요약/강화 처리 완료 / AI enhancement processing completed"
    cd ..
else
    echo "⏭️  AI 처리 건너뜀 (부분 모드) / Skipping AI processing (partial mode)"
fi

# 4단계: Markdown 변환 / Step 4: Convert to Markdown
echo "4단계: Markdown 변환 중... / Step 4: Converting to Markdown..."
cd to_md

if [ "$PARTIAL_MODE" = "false" ] && [ -f "../data/${today}_AI_enhanced_${LANGUAGE}.jsonl" ]; then
    echo "📄 AI 강화 데이터를 사용하여 변환 중... / Using AI enhanced data for conversion..."
    python convert.py --data ../data/${today}_AI_enhanced_${LANGUAGE}.jsonl
    
    if [ $? -ne 0 ]; then
        echo "❌ Markdown 변환 실패 / Markdown conversion failed"
        exit 1
    fi
    echo "✅ AI 강화 Markdown 변환 완료 / AI enhanced Markdown conversion completed"
    
else
    if [ "$PARTIAL_MODE" = "true" ]; then
        echo "⏭️  Markdown 변환 건너뜀 (부분 모드, AI 강화 데이터 필요) / Skipping Markdown conversion (partial mode, requires AI enhanced data)"
    else
        echo "❌ 오류: AI 강화 파일을 찾을 수 없습니다 / Error: AI enhanced file not found"
        echo "AI 파일: ../data/${today}_AI_enhanced_${LANGUAGE}.jsonl"
        exit 1
    fi
fi

cd ..

# 5단계: 파일 목록 업데이트 / Step 5: Update file list
echo "5단계: 파일 목록 업데이트 중... / Step 5: Updating file list..."
ls data/*.jsonl | sed 's|data/||' > assets/file-list.txt
echo "✅ 파일 목록 업데이트 완료 / File list updated"

# 완료 요약 / Completion summary
echo ""
echo "=== 로컬 디버그 완료 / Local Debug Completed ==="
if [ "$PARTIAL_MODE" = "false" ]; then
    echo "🎉 전체 프로세스 완료 / Complete workflow finished:"
    echo "   ✅ 데이터 크롤링 / Data crawling"
    echo "   ✅ 중복 확인 / Smart duplicate check"
    echo "   ✅ AI 요약/강화 처리 / AI enhancement"
    echo "   ✅ Markdown 변환 / Markdown conversion"
    echo "   ✅ 파일 목록 업데이트 / File list update"
else
    echo "🔄 일부 프로세스 완료 / Partial workflow finished:"
    echo "   ✅ 데이터 크롤링 / Data crawling"
    echo "   ✅ 중복 확인 / Smart duplicate check"
    echo "   ⏭️  AI 요약 및 Markdown 변환 건너뜀 / Skipped AI enhancement and Markdown conversion"
    echo "   ✅ 파일 목록 업데이트 / File list update"
    echo ""
    echo "💡 안내: OPENAI_API_KEY를 설정하면 전체 기능이 활성화됩니다 / Tip: Set OPENAI_API_KEY to enable full functionality"
fi