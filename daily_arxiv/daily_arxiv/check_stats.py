"""
Scrapy 크롤링 통계 확인 스크립트 / Script to check Scrapy crawling statistics
중복 제거 상태 결과 확인용 / Used to get deduplication check status results

기능 설명 / Features:
- 당일 및 과거 논문 데이터 간의 중복 확인 / Check duplication between today's and yesterday's paper data
- 중복 논문 항목 제거 및 신규 논문 유지 / Remove duplicate papers, keep new content
- 중복 제거 결과에 따라 워크플로 계속 진행 여부 결정 / Decide workflow continuation based on deduplication results
"""
import json
import os
import sys
from datetime import UTC, datetime, timedelta


def load_papers_data(file_path):
    """
    jsonl 파일에서 전체 논문 데이터 로드
    Load complete paper data from jsonl file
    
    Args:
        file_path (str): JSONL 파일 경로 / JSONL file path
        
    Returns:
        list: 논문 데이터 목록 / List of paper data
        set: 논문 ID 집합 / Set of paper IDs
    """
    if not os.path.exists(file_path):
        return [], set()
    
    papers = []
    ids = set()
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    data = json.loads(line)
                    papers.append(data)
                    ids.add(data.get('id', ''))
        return papers, ids
    except (OSError, ValueError) as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return [], set()

def save_papers_data(papers, file_path):
    """
    논문 데이터를 jsonl 파일로 저장
    Save paper data to jsonl file
    
    Args:
        papers (list): 논문 데이터 목록 / List of paper data
        file_path (str): 파일 경로 / File path
    """
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(json.dumps(paper, ensure_ascii=False) + '\n' for paper in papers)
        return True
    except OSError as e:
        print(f"Error saving {file_path}: {e}", file=sys.stderr)
        return False

def perform_deduplication():
    """
    다일간 중복 제거 수행: 과거 여러 날의 중복 논문 항목 제거 및 신규 논문 유지
    Perform deduplication over multiple past days
    
    Returns:
        str: 중복 제거 상태 / Deduplication status
             - "has_new_content": 신규 내용 있음 / Has new content
             - "no_new_content": 신규 내용 없음 / No new content  
             - "no_data": 데이터 없음 / No data
             - "error": 처리 오류 / Processing error
    """

    today = datetime.now(UTC).strftime("%Y-%m-%d")
    today_file = f"../data/{today}.jsonl"
    history_days = 7  # 며칠 전 데이터까지 비교할지 설정

    if not os.path.exists(today_file):
        print("오늘 데이터 파일이 존재하지 않습니다 / Today's data file does not exist", file=sys.stderr)
        return "no_data"

    try:
        today_papers, today_ids = load_papers_data(today_file)
        print(f"오늘 수집된 총 논문 수: {len(today_papers)} / Today's total papers: {len(today_papers)}", file=sys.stderr)

        if not today_papers:
            return "no_data"

        # 과거 여러 날의 ID 집합 수집
        history_ids = set()
        for i in range(1, history_days + 1):
            date_str = (datetime.now(UTC) - timedelta(days=i)).strftime("%Y-%m-%d")
            history_file = f"../data/{date_str}.jsonl"
            _, past_ids = load_papers_data(history_file)
            history_ids.update(past_ids)

        print(f"과거 {history_days}일간 중복 확인 DB 크기: {len(history_ids)} / History {history_days} days deduplication library size: {len(history_ids)}", file=sys.stderr)

        duplicate_ids = today_ids & history_ids

        if duplicate_ids:
            print(f"과거 중복 논문 {len(duplicate_ids)}편 발견 / Found {len(duplicate_ids)} historical duplicate papers", file=sys.stderr)
            new_papers = [paper for paper in today_papers if paper.get('id', '') not in duplicate_ids]

            print(f"중복 제거 후 남은 논문 수: {len(new_papers)} / Remaining papers after deduplication: {len(new_papers)}", file=sys.stderr)

            if new_papers:
                if save_papers_data(new_papers, today_file):
                    print(f"오늘 파일 업데이트 완료, 중복 논문 {len(duplicate_ids)}편 제거됨 / Today's file updated, removed {len(duplicate_ids)} duplicate papers", file=sys.stderr)
                    return "has_new_content"
                else:
                    print("중복 제거 데이터 저장 실패 / Failed to save deduplicated data", file=sys.stderr)
                    return "error"
            else:
                try:
                    os.remove(today_file)
                    print("모든 논문이 중복 내용이므로 오늘 파일 삭제됨 / All papers are duplicate content, today's file deleted", file=sys.stderr)
                except OSError as e:
                    print(f"파일 삭제 실패: {e} / Failed to delete file: {e}", file=sys.stderr)
                return "no_new_content"
        else:
            print("모든 내용이 신규 내용입니다 / All content is new", file=sys.stderr)
            return "has_new_content"

    except Exception as e:  # noqa: BLE001 - top-level guard, must return "error" not crash the workflow
        print(f"중복 제거 처리 실패: {e} / Deduplication processing failed: {e}", file=sys.stderr)
        return "error"

def main():
    """
    중복 제거 상태를 확인하고 해당 종료 코드 반환
    Check deduplication status and return corresponding exit code
    
    종료 코드 의미 / Exit code meanings:
    0: 신규 내용 있음, 처리 계속 / Has new content, continue processing
    1: 신규 내용 없음, 워크플로 중단 / No new content, stop workflow
    2: 처리 오류 / Processing error
    """
    
    print("중복 제거 확인 실행 중... / Performing intelligent deduplication check...", file=sys.stderr)
    
    # 중복 제거 처리 수행 / Perform deduplication processing
    dedup_status = perform_deduplication()
    
    if dedup_status == "has_new_content":
        print("✅ 중복 제거 완료, 신규 내용 발견, 워크플로 계속 진행 / Deduplication completed, new content found, continue workflow", file=sys.stderr)
        sys.exit(0)
    elif dedup_status == "no_new_content":
        print("⏹️ 중복 제거 완료, 신규 내용 없음, 워크플로 중단 / Deduplication completed, no new content, stop workflow", file=sys.stderr)
        sys.exit(1)
    elif dedup_status == "no_data":
        print("⏹️ 오늘 데이터 없음, 워크플로 중단 / No data today, stop workflow", file=sys.stderr)
        sys.exit(1)
    elif dedup_status == "error":
        print("❌ 중복 제거 처리 오류, 워크플로 중단 / Deduplication processing error, stop workflow", file=sys.stderr)
        sys.exit(2)
    else:
        # 알 수 없는 상태 / Unexpected case: unknown status
        print("❌ 알 수 없는 중복 제거 상태, 워크플로 중단 / Unknown deduplication status, stop workflow", file=sys.stderr)
        sys.exit(2)

if __name__ == "__main__":
    main() 