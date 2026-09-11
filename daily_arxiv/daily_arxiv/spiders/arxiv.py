import html
import json
import os
import re
import urllib.parse
from datetime import datetime, timedelta, timezone
import scrapy


class ArxivSpider(scrapy.Spider):
    name = "arxiv"
    allowed_domains = ["biorxiv.org", "ebi.ac.uk", "arxiv.org"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        raw_query = os.environ.get("SEARCH_QUERY", "") or os.environ.get("CATEGORIES", "de novo design")
        queries = [q.strip() for q in raw_query.split(",") if q.strip()]
        self.search_queries = queries if queries else ["de novo design"]

        # 무료 Quota 절약을 위해 날짜 범위를 최근 2~3일로 엄격히 제한
        now = datetime.now(timezone.utc)
        self.end_date = now.strftime("%Y-%m-%d")
        days_back = int(os.environ.get("DAYS_BACK", "3"))
        self.start_date = (now - timedelta(days=days_back)).strftime("%Y-%m-%d")
        self.max_papers_per_query = int(os.environ.get("MAX_PAPERS", "5"))

        self.logger.info(
            f"bioRxiv 검색 시작 - 키워드: {self.search_queries}, "
            f"기간: {self.start_date} ~ {self.end_date}, 키워드당 최대: {self.max_papers_per_query}건"
        )

    def start_requests(self):
        for query in self.search_queries:
            # 최근 날짜 범위(FIRST_PDATE)로 필터링하여 오래된 논문 대량 수집 방지
            epmc_query = f"(\"{query}\") AND (PUBLISHER:bioRxiv OR SRC:PPR) AND FIRST_PDATE:[{self.start_date} TO {self.end_date}]"
            url = (
                f"https://www.ebi.ac.uk/europepmc/webservices/rest/search"
                f"?query={urllib.parse.quote(epmc_query)}"
                f"&resultType=core&format=json&pageSize={self.max_papers_per_query}&sort=P_PDATE_D%20desc"
            )
            yield scrapy.Request(
                url=url,
                callback=self.parse_epmc_json,
                headers={"User-Agent": "daily-arxiv-ai-enhanced/1.0"},
                meta={"query": query},
                dont_filter=True,
            )

    def parse_epmc_json(self, response):
        query = response.meta.get("query", "de novo design")
        try:
            data = json.loads(response.text)
        except Exception as e:
            self.logger.error(f"JSON 파싱 실패 ({response.url}): {e}")
            return

        results = data.get("resultList", {}).get("result", [])
        self.logger.info(f"bioRxiv 검색어 '{query}' ({self.start_date} ~ {self.end_date}) 결과: {len(results)}건 발견")

        for r in results[: self.max_papers_per_query]:
            doi = r.get("doi", "")
            title = r.get("title", "")
            title = re.sub(r"<[^>]+>", "", title).strip().rstrip(".")
            abstract = r.get("abstractText", "")
            abstract = re.sub(r"<[^>]+>", "", abstract).strip()

            if not title or not abstract:
                continue

            authors = [
                a.get("fullName")
                for a in r.get("authorList", {}).get("author", [])
                if a.get("fullName")
            ]
            if not authors and r.get("authorString"):
                authors = [a.strip() for a in r.get("authorString").split(",") if a.strip()]

            pub_date = r.get("firstPublicationDate") or r.get("dateOfCreation") or ""

            if doi:
                abs_url = f"https://www.biorxiv.org/content/{doi}v1"
                pdf_url = f"https://www.biorxiv.org/content/{doi}v1.full.pdf"
            else:
                full_urls = r.get("fullTextUrlList", {}).get("fullTextUrl", [])
                abs_url = full_urls[0].get("url", "") if full_urls else ""
                pdf_url = abs_url

            paper_id = doi or r.get("id", "")

            yield {
                "id": paper_id,
                "title": title,
                "authors": authors,
                "categories": ["bioRxiv", query],
                "comment": f"bioRxiv preprint ({pub_date})" if pub_date else "bioRxiv preprint",
                "summary": abstract,
                "abs": abs_url,
                "pdf": pdf_url,
            }
