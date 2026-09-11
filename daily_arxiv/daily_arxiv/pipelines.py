# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html

import arxiv
import json
import os
import sys
from datetime import datetime, timedelta


class DailyArxivPipeline:
    def __init__(self):
        self.page_size = 100
        self.client = None

    def process_item(self, item: dict, spider):
        # 이미 필요한 필드(title, summary 등)가 채워져 있는 경우 그대로 반환
        if item.get("title") and item.get("summary"):
            if not item.get("pdf") and item.get("id"):
                item["pdf"] = f"https://arxiv.org/pdf/{item['id']}"
            if not item.get("abs") and item.get("id"):
                item["abs"] = f"https://arxiv.org/abs/{item['id']}"
            return item

        # arXiv ID만 제공된 레거시 크롤링의 경우에만 arxiv 클라이언트를 사용하여 메타데이터 조회
        if self.client is None:
            self.client = arxiv.Client(self.page_size)

        item["pdf"] = f"https://arxiv.org/pdf/{item['id']}"
        item["abs"] = f"https://arxiv.org/abs/{item['id']}"
        search = arxiv.Search(
            id_list=[item["id"]],
        )
        try:
            paper = next(self.client.results(search))
            item["authors"] = [a.name for a in paper.authors]
            item["title"] = paper.title
            item["categories"] = paper.categories
            item["comment"] = paper.comment
            item["summary"] = paper.summary
        except Exception as e:
            spider.logger.warning(f"Failed to fetch metadata from arXiv API for {item['id']}: {e}")

        return item
