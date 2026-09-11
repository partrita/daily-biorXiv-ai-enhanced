import scrapy
import os
import re


class ArxivSpider(scrapy.Spider):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        categories = os.environ.get("CATEGORIES", "q-bio.BM, q-bio.CB, q-bio.QM, cs.CV")
        categories = categories.split(",")
        # 대상 카테고리 목록 저장 (후속 검증용)
        self.target_categories = set(map(str.strip, categories))
        self.start_urls = [
            f"https://arxiv.org/list/{cat}/new" for cat in self.target_categories
        ]  # 시작 URL (대상 카테고리의 최신 논문)

    name = "arxiv"  # 스파이더 이름
    allowed_domains = ["arxiv.org"]  # 크롤링 허용 도메인

    def parse(self, response):
        # 각 논문 정보 추출
        anchors = []
        for li in response.css("div[id=dlpage] ul li"):
            href = li.css("a::attr(href)").get()
            if href and "item" in href:
                anchors.append(int(href.split("item")[-1]))

        # 각 논문의 상세 정보 순회
        for paper in response.css("dl dt"):
            paper_anchor = paper.css("a[name^='item']::attr(name)").get()
            if not paper_anchor:
                continue
                
            paper_id = int(paper_anchor.split("item")[-1])
            if anchors and paper_id >= anchors[-1]:
                continue

            # 논문 ID 가져오기
            abstract_link = paper.css("a[title='Abstract']::attr(href)").get()
            if not abstract_link:
                continue
                
            arxiv_id = abstract_link.split("/")[-1]
            
            # 해당 논문 설명 부분(dd 태그) 가져오기
            paper_dd = paper.xpath("following-sibling::dd[1]")
            if not paper_dd:
                continue
            
            # 논문 카테고리 정보 추출 - subjects 영역
            subjects_text = paper_dd.css(".list-subjects .primary-subject::text").get()
            if not subjects_text:
                # 기본 카테고리가 없으면 다른 방법으로 카테고리 추출 시도
                subjects_text = paper_dd.css(".list-subjects::text").get()
            
            if subjects_text:
                # 카테고리 정보 파싱 (예: "Biomolecules (q-bio.BM)")
                # 괄호 안의 카테고리 코드 추출
                categories_in_paper = re.findall(r'\(([^)]+)\)', subjects_text)
                
                # 논문 카테고리가 대상 카테고리에 포함되는지 확인
                paper_categories = set(categories_in_paper)
                if paper_categories.intersection(self.target_categories):
                    yield {
                        "id": arxiv_id,
                        "categories": list(paper_categories),  # 디버깅용 카테고리 정보 추가
                    }
                    self.logger.info(f"Found paper {arxiv_id} with categories {paper_categories}")
                else:
                    self.logger.debug(f"Skipped paper {arxiv_id} with categories {paper_categories} (not in target {self.target_categories})")
            else:
                # 카테고리 정보를 가져올 수 없는 경우 경고 기록 후 논문 반환 (하위 호환성 유지)
                self.logger.warning(f"Could not extract categories for paper {arxiv_id}, including anyway")
                yield {
                    "id": arxiv_id,
                    "categories": [],
                }
