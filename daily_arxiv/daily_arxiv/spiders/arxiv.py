import html
import json
import os
import re
import urllib.parse
import scrapy


class ArxivSpider(scrapy.Spider):
    name = "arxiv"
    allowed_domains = ["biorxiv.org", "ebi.ac.uk", "arxiv.org"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 환경 변수에서 검색어 또는 카테고리 설정 가져오기 (기본값: "de novo design")
        raw_query = os.environ.get("SEARCH_QUERY", "") or os.environ.get("CATEGORIES", "de novo design")
        # 여러 키워드가 쉼표로 주어질 경우 처리
        queries = [q.strip() for q in raw_query.split(",") if q.strip()]
        self.search_queries = queries if queries else ["de novo design"]
        self.logger.info(f"bioRxiv 검색어 설정: {self.search_queries}")

    def start_requests(self):
        for query in self.search_queries:
            # Europe PMC API를 통해 bioRxiv 프리프린트 검색
            epmc_query = f"(\"{query}\") AND (PUBLISHER:bioRxiv OR SRC:PPR)"
            url = (
                f"https://www.ebi.ac.uk/europepmc/webservices/rest/search"
                f"?query={urllib.parse.quote(epmc_query)}"
                f"&resultType=core&format=json&pageSize=30&sort=P_PDATE_D%20desc"
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
        self.logger.info(f"bioRxiv 검색어 '{query}' 결과: {len(results)}건 발견")

        for r in results:
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
