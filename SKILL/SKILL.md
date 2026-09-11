---
name: daily-arxiv-ai-enhanced
version: 0.1
description: URL 요청을 통해 daily-arxiv-ai-enhanced 프로젝트에서 논문 JSON 데이터를 가져옵니다
---

# arXiv 논문 데이터 API

## 트리거 조건
사용자가 daily-arXiv-ai-enhanced 프로젝트의 데이터를 가져오고자 할 때

## 기능 설명
URL 매개변수를 통해 JSON 형식의 arXiv 논문 데이터를 반환합니다.

## 기본 저장소 URL
https://dw-dengwei.github.io/daily-arXiv-ai-enhanced/

## URL 매개변수

| 매개변수 | 설명 | 예시 |
|------|------|------|
| `category` | arXiv 카테고리 | `cs.CV`, `q-bio.BM`, etc. |
| `author` | 저자 이름 | `Smith` |
| `keywords` | 키워드 (쉼표 구분) | `antibody,binding` |

## 예시
```
bash scripts/fetch.sh "https://dw-dengwei.github.io/daily-arXiv-ai-enhanced/?category=cs.CV&author=Smith&keywords=deep"
```
여기에서는 `fetch.sh` 스크립트를 사용하여 요청을 보내고 응답 데이터를 처리합니다. 이 스크립트는 Node.js 및 puppeteer 환경 기반이며, 설치되어 있지 않은 경우 자동 설치됩니다. JavaScript를 실행하여 최종 JSON 응답을 생성해야 하므로 wget이나 curl을 직접 사용할 수 없습니다.

## 필터링 로직

```
category AND (keywords OR author)
```

- category: 필수 필터, 지정된 카테고리만 반환
- keywords: 제목 및 요약에서 검색
- author: 저자 필드에서 검색
- keywords와 author는 "OR(또는)" 관계

## JSON 응답 구조

```json
{
  "category": "cs.CV",
  "author": "Smith",
  "keywords": ["deep"],
  "count": 10,
  "papers": [
    {
      "id": "2401.00001",
      "title": "제목",
      "authors": "저자1, 저자2",
      "categories": ["cs.CV"],
      "summary": "tldr",
      "date": "2024-01-01",
      "url": "https://arxiv.org/abs/2401.00001"
    }
  ]
}
```