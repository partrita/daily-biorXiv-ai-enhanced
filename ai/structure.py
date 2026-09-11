from pydantic import BaseModel, Field

class Structure(BaseModel):
    tldr: str = Field(description="논문의 1-2문장 핵심 요약 (한국어)")
    motivation: str = Field(description="연구 배경 및 해결하고자 하는 문제점/동기 (한국어)")
    method: str = Field(description="제안 방법론 및 핵심 연구 모델 (한국어)")
    result: str = Field(description="주요 실험 결과 및 성과 (한국어)")
    conclusion: str = Field(description="결론 및 향후 시사점 (한국어)")
