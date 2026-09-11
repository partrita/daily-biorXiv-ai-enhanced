import os
import json
import sys
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict
from queue import Queue
from threading import Lock
import dotenv
import argparse
from tqdm import tqdm

import langchain_core.exceptions
from langchain_openai import ChatOpenAI
from langchain.prompts import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from structure import Structure
from content_filter import is_sensitive
from runtime import build_chat_openai_kwargs, raise_if_processing_failed

if os.path.exists('.env'):
    dotenv.load_dotenv()
template = open("template.txt", "r").read()
system = open("system.txt", "r").read()

def parse_args():
    """명령줄 인수 파싱"""
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, required=True, help="jsonline data file")
    parser.add_argument("--max_workers", type=int, default=1, help="Maximum number of parallel workers")
    return parser.parse_args()

def process_single_item(chain, item: Dict, language: str) -> Dict:
    def check_github_code(content: str) -> Dict:
        """GitHub 링크 추출 및 검증"""
        code_info = {}

        # 1. github.com/owner/repo 형식 우선 매칭
        github_pattern = r"https?://github\.com/([a-zA-Z0-9-_]+)/([a-zA-Z0-9-_\.]+)"
        match = re.search(github_pattern, content)
        
        if match:
            owner, repo = match.groups()
            # repo 이름 정리, 끝의 .git 확장자나 문장 부호 제거
            repo = repo.rstrip(".git").rstrip(".,)")
            
            full_url = f"https://github.com/{owner}/{repo}"
            code_info["code_url"] = full_url
            
            # GitHub API를 호출하여 정보 가져오기 시도
            github_token = os.environ.get("TOKEN_GITHUB")
            headers = {"Accept": "application/vnd.github.v3+json"}
            if github_token:
                headers["Authorization"] = f"token {github_token}"
            
            try:
                api_url = f"https://api.github.com/repos/{owner}/{repo}"
                resp = requests.get(api_url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    code_info["code_stars"] = data.get("stargazers_count", 0)
                    code_info["code_last_update"] = data.get("pushed_at", "")[:10]
            except Exception:
                # API 호출 실패가 메인 흐름에 영향을 주지 않음
                pass
            return code_info

        # 2. github.com이 없으면 github.io 매칭 시도
        github_io_pattern = r"https?://[a-zA-Z0-9-_]+\.github\.io(?:/[a-zA-Z0-9-_\.]+)*"
        match_io = re.search(github_io_pattern, content)
        
        if match_io:
            url = match_io.group(0)
            # 끝 문장 부호 정리
            url = url.rstrip(".,)")
            code_info["code_url"] = url
            # github.io는 star 수 및 업데이트 확인 미수행
                
        return code_info

    # summary 필드 민감도 확인
    if is_sensitive(item.get("summary", "")):
        return None

    # 코드 가용성 확인
    code_info = check_github_code(item.get("summary", ""))
    if code_info:
        item.update(code_info)

    """단일 데이터 항목 처리"""
    # Default structure with meaningful fallback values
    default_ai_fields = {
        "tldr": "Summary generation failed",
        "motivation": "Motivation analysis unavailable",
        "method": "Method extraction failed",
        "result": "Result analysis unavailable",
        "conclusion": "Conclusion extraction failed"
    }
    
    try:
        response: Structure = chain.invoke({
            "language": language,
            "content": item['summary']
        })
        item['AI'] = response.model_dump()
    except langchain_core.exceptions.OutputParserException as e:
        # 오류 메시지에서 JSON 문자열을 추출하여 복구 시도
        error_msg = str(e)
        partial_data = {}
        
        if "Function Structure arguments:" in error_msg:
            try:
                # JSON 문자열 추출
                json_str = error_msg.split("Function Structure arguments:", 1)[1].strip().split('are not valid JSON')[0].strip()
                # LaTeX 수학 기호 전처리 - 올바른 이스케이프 보장
                json_str = json_str.replace('\\', '\\\\')
                # 파싱된 JSON 시도
                partial_data = json.loads(json_str)
            except Exception as json_e:
                print(f"Failed to parse JSON for {item.get('id', 'unknown')}: {json_e}", file=sys.stderr)
        
        # Merge partial data with defaults to ensure all fields exist
        item['AI'] = {**default_ai_fields, **partial_data}
        print(f"Using partial AI data for {item.get('id', 'unknown')}: {list(partial_data.keys())}", file=sys.stderr)
    except Exception as e:
        print(f"Unexpected error for {item.get('id', 'unknown')}: {e}", file=sys.stderr)
        raise RuntimeError(f"AI request failed for {item.get('id', 'unknown')}") from e
    
    # Final validation to ensure all required fields exist
    for field in default_ai_fields.keys():
        if field not in item['AI']:
            item['AI'][field] = default_ai_fields[field]

    # AI가 생성한 모든 필드 민감도 확인
    for v in item.get("AI", {}).values():
        if is_sensitive(str(v)):
            return None
    return item

def process_all_items(data: List[Dict], model_name: str, language: str, max_workers: int) -> List[Dict]:
    """모든 데이터 항목 병렬 처리"""
    llm = ChatOpenAI(
        **build_chat_openai_kwargs(
            model_name=model_name,
            base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            api_key=os.environ.get("OPENAI_API_KEY", ""),
        )
    ).with_structured_output(Structure, method="function_calling")

    print('Connect to:', model_name, file=sys.stderr)
    
    prompt_template = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(system),
        HumanMessagePromptTemplate.from_template(template=template)
    ])

    chain = prompt_template | llm
    
    # 스레드 풀을 사용한 병렬 처리
    processed_data = [None] * len(data)  # 결과 목록 사전 할당
    processing_errors = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # 모든 작업 제출
        future_to_idx = {
            executor.submit(process_single_item, chain, item, language): idx
            for idx, item in enumerate(data)
        }
        
        # tqdm으로 진행률 표시
        for future in tqdm(
            as_completed(future_to_idx),
            total=len(data),
            desc="Processing items"
        ):
            idx = future_to_idx[future]
            try:
                result = future.result()
                processed_data[idx] = result
            except Exception as e:
                print(f"Item at index {idx} generated an exception: {e}", file=sys.stderr)
                processing_errors.append(str(e))

    raise_if_processing_failed(processing_errors)
    
    return processed_data

def main():
    args = parse_args()
    model_name = os.environ.get("MODEL_NAME", "gpt-4o-mini")
    language = os.environ.get("LANGUAGE", 'Korean')

    # 대상 파일 확인 및 삭제
    target_file = args.data.replace('.jsonl', f'_AI_enhanced_{language}.jsonl')
    if os.path.exists(target_file):
        os.remove(target_file)
        print(f'Removed existing file: {target_file}', file=sys.stderr)

    # 데이터 읽기
    data = []
    with open(args.data, "r") as f:
        for line in f:
            data.append(json.loads(line))

    # 중복 제거
    seen_ids = set()
    unique_data = []
    for item in data:
        if item['id'] not in seen_ids:
            seen_ids.add(item['id'])
            unique_data.append(item)

    data = unique_data
    print('Open:', args.data, file=sys.stderr)
    
    # 모든 데이터 병렬 처리
    processed_data = process_all_items(
        data,
        model_name,
        language,
        args.max_workers
    )
    
    # 결과 저장
    with open(target_file, "w") as f:
        for item in processed_data:
            if item is not None:
                f.write(json.dumps(item) + "\n")

if __name__ == "__main__":
    main()
