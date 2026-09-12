import argparse
import json
import os
import random
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import dotenv
import langchain_core.exceptions
import requests
from content_filter import is_sensitive
from langchain.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
)
from langchain_openai import ChatOpenAI
from runtime import build_chat_openai_kwargs, raise_if_processing_failed
from structure import Structure
from tqdm import tqdm

if os.path.exists(".env"):
    dotenv.load_dotenv()
with open("template.txt", encoding="utf-8") as f:
    template = f.read()
with open("system.txt", encoding="utf-8") as f:
    system = f.read()


def parse_args():
    """명령줄 인수 파싱"""
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, required=True, help="jsonline data file")
    parser.add_argument("--max_workers", type=int, default=1, help="Maximum number of parallel workers")
    return parser.parse_args()


def make_fallback_ai_fields(raw_summary: str) -> dict:
    """API 실패 시 초록 본문 문장을 기반으로 구조화 필드 생성 (초록 참조 등의 플레이스홀더 배제)"""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", raw_summary) if len(s.strip()) > 10]
    if not sentences:
        sentences = [raw_summary.strip() or "요약 내용을 불러올 수 없습니다."]

    tldr_val = sentences[0]
    motivation_val = sentences[1] if len(sentences) > 1 else sentences[0]
    method_val = sentences[2] if len(sentences) > 2 else (sentences[1] if len(sentences) > 1 else sentences[0])
    result_val = sentences[3] if len(sentences) > 3 else (sentences[-1] if len(sentences) > 2 else sentences[0])
    conclusion_val = sentences[-1] if len(sentences) > 4 else (sentences[-1] if len(sentences) > 1 else sentences[0])

    return {
        "tldr": tldr_val,
        "motivation": motivation_val,
        "method": method_val,
        "result": result_val,
        "conclusion": conclusion_val,
    }


def process_single_item(chain, item: dict, language: str, max_retries: int = 2) -> dict | None:
    def check_github_code(content: str) -> dict:
        """GitHub 링크 추출 및 검증"""
        code_info = {}

        github_pattern = r"https?://github\.com/([a-zA-Z0-9-_]+)/([a-zA-Z0-9-_\.]+)"
        match = re.search(github_pattern, content)

        if match:
            owner, repo = match.groups()
            repo = repo.rstrip(".git").rstrip(".,)")
            full_url = f"https://github.com/{owner}/{repo}"
            code_info["code_url"] = full_url

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
            except requests.RequestException:
                pass  # GitHub stars are optional enrichment
            return code_info

        github_io_pattern = r"https?://[a-zA-Z0-9-_]+\.github\.io(?:/[a-zA-Z0-9-_\.]+)*"
        match_io = re.search(github_io_pattern, content)

        if match_io:
            url = match_io.group(0).rstrip(".,)")
            code_info["code_url"] = url

        return code_info

    # summary 필드 민감도 확인
    if is_sensitive(item.get("summary", "")):
        return None

    # 코드 가용성 확인
    code_info = check_github_code(item.get("summary", ""))
    if code_info:
        item.update(code_info)

    raw_summary = item.get("summary", "")
    default_ai_fields = make_fallback_ai_fields(raw_summary)
    paper_id = item.get("id", "unknown")

    for attempt in range(max_retries):
        try:
            response: Structure = chain.invoke({
                "language": language or "Korean",
                "content": item["summary"],
            })
            item["AI"] = response.model_dump()
            break
        except langchain_core.exceptions.OutputParserException as e:
            error_msg = str(e)
            partial_data = {}
            if "Function Structure arguments:" in error_msg:
                try:
                    json_str = error_msg.split("Function Structure arguments:", 1)[1].strip().split("are not valid JSON")[0].strip()
                    json_str = json_str.replace("\\", "\\\\")
                    partial_data = json.loads(json_str)
                except (ValueError, IndexError) as json_e:
                    print(f"Failed to parse JSON for {paper_id}: {json_e}", file=sys.stderr)

            item["AI"] = {**default_ai_fields, **partial_data}
            print(f"Using partial AI data for {paper_id}: {list(partial_data.keys())}", file=sys.stderr)
            break
        except Exception as e:  # noqa: BLE001 - langchain raises varied errors, retry guard must stay broad
            error_str = str(e)
            is_rate_limit = any(term in error_str.lower() for term in ["429", "rate limit", "quota", "resourceexhausted", "503", "high demand", "overloaded", "timeout"])

            if is_rate_limit and attempt < max_retries - 1:
                wait_time = (attempt + 1) * 3 + random.uniform(0.5, 1.5)
                print(f"[RateLimit/503] {paper_id} - 재시도 ({attempt + 1}/{max_retries}). {wait_time:.1f}초 대기 중...", file=sys.stderr)
                time.sleep(wait_time)
                continue
            else:
                print(f"[Warning] {paper_id} AI 분석 실패 (시도 {attempt + 1}회): {e}", file=sys.stderr)
                item["AI"] = default_ai_fields
                break

    # 필수 필드 보장
    if "AI" not in item or not isinstance(item["AI"], dict):
        item["AI"] = default_ai_fields
    for field in default_ai_fields:
        if field not in item["AI"] or not item["AI"][field]:
            item["AI"][field] = default_ai_fields[field]

    # AI가 생성한 모든 필드 민감도 확인
    for v in item.get("AI", {}).values():
        if is_sensitive(str(v)):
            return None

    return item


def process_all_items(data: list[dict], model_name: str, language: str, max_workers: int) -> list[dict]:
    """모든 데이터 항목 처리 (속도 제한 및 지수 백오프 적용)"""
    base_url = os.environ.get("OPENAI_BASE_URL", "")
    api_key = os.environ.get("OPENAI_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")
    
    llm = ChatOpenAI(
        **build_chat_openai_kwargs(
            model_name=model_name,
            base_url=base_url,
            api_key=api_key,
        )
    ).with_structured_output(Structure, method="function_calling")

    print(f"Connect to: {model_name} (Total papers: {len(data)}, Language: {language})", file=sys.stderr)

    prompt_template = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(system),
        HumanMessagePromptTemplate.from_template(template=template),
    ])

    chain = prompt_template | llm

    processed_data = [None] * len(data)
    processing_errors = []

    if max_workers <= 1:
        for idx, item in enumerate(tqdm(data, desc="Processing papers")):
            try:
                res = process_single_item(chain, item, language, max_retries=2)
                processed_data[idx] = res
            except Exception as e:  # noqa: BLE001 - worker isolation, one item must not kill the batch
                print(f"Item {idx} failed: {e}", file=sys.stderr)
                processing_errors.append(str(e))
            time.sleep(1.5)
    else:
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_idx = {
                executor.submit(process_single_item, chain, item, language, 2): idx
                for idx, item in enumerate(data)
            }
            for future in tqdm(as_completed(future_to_idx), total=len(data), desc="Processing items"):
                idx = future_to_idx[future]
                try:
                    result = future.result()
                    processed_data[idx] = result
                except Exception as e:  # noqa: BLE001 - worker isolation, one item must not kill the batch
                    print(f"Item at index {idx} generated an exception: {e}", file=sys.stderr)
                    processing_errors.append(str(e))

    if len(processing_errors) == len(data) and len(data) > 0:
        raise_if_processing_failed(processing_errors)

    return [item for item in processed_data if item is not None]


def main():
    args = parse_args()
    model_name = os.environ.get("MODEL_NAME", "gemini-3.7-flash")
    language = os.environ.get("LANGUAGE", "Korean")

    target_file = args.data.replace(".jsonl", f"_AI_enhanced_{language}.jsonl")
    if os.path.exists(target_file):
        os.remove(target_file)
        print(f"Removed existing file: {target_file}", file=sys.stderr)

    data = []
    with open(args.data, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))

    seen_ids = set()
    unique_data = []
    for item in data:
        if item["id"] not in seen_ids:
            seen_ids.add(item["id"])
            unique_data.append(item)

    max_daily_limit = int(os.environ.get("MAX_DAILY_PAPERS", "10"))
    if len(unique_data) > max_daily_limit:
        print(f"Limiting papers to latest {max_daily_limit} (from {len(unique_data)}) to save API quota", file=sys.stderr)
        unique_data = unique_data[:max_daily_limit]

    data = unique_data
    print(f"Open: {args.data} (Processing items: {len(data)})", file=sys.stderr)

    processed_data = process_all_items(
        data,
        model_name,
        language,
        args.max_workers,
    )

    with open(target_file, "w", encoding="utf-8") as f:
        for item in processed_data:
            if item is not None:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")

    print(f"Successfully saved {len(processed_data)} enhanced papers to {target_file}")


if __name__ == "__main__":
    main()
