"""뉴스 AI 처리 모듈

Gemini를 사용하여 뉴스 기사를 분석합니다:
- 3줄 요약 (현상-원인-전망)
- 영어 기사 번역
- 감성 분석
- 키워드 추출
"""
import json
import re
from dataclasses import dataclass
from typing import Literal

from .gemini_client import GeminiClient
from ..collectors.news.rss_collector import NewsArticle
from ..utils.logger import get_logger

logger = get_logger(__name__)

Sentiment = Literal["positive", "negative", "neutral"]


@dataclass
class ProcessedNews:
    """처리된 뉴스 데이터"""
    article: NewsArticle
    summary: dict | None = None        # {phenomenon, cause, outlook}
    translation: dict | None = None    # {title_ko, content_ko}
    sentiment: dict | None = None      # {label, confidence, reasoning}
    keywords: dict | None = None       # {keywords, topics}
    error: str | None = None


class NewsProcessor:
    """뉴스 AI 처리기"""

    # 통합 프롬프트 (한국어 기사용) - 키워드 + 감성 한번에 처리
    ANALYZE_PROMPT_KO = """다음 기후 관련 뉴스를 분석해주세요.

## 기사
제목: {title}
내용: {content}

## 분석 항목
1. **keywords**: 핵심 키워드 5개
2. **sentiment**: 감성 분석 (positive/negative/neutral)
   - positive: 기술 발전, 협약 체결, 긍정적 진전
   - negative: 재난, 경고, 위기 심화
   - neutral: 단순 정보 전달, 객관적 보도

반드시 아래 JSON 형식으로만 응답하세요:
{{"keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"], "sentiment": "positive|negative|neutral"}}"""

    # 통합 프롬프트 (영어 기사용) - 키워드 + 감성 + 번역 한번에 처리
    ANALYZE_PROMPT_EN = """Analyze the following climate news article.

## Article
Title: {title}
Content: {content}

## Tasks
1. **keywords**: Extract 5 key keywords (in Korean)
2. **sentiment**: Analyze sentiment (positive/negative/neutral)
   - positive: technological progress, agreements, positive developments
   - negative: disasters, warnings, worsening crisis
   - neutral: factual reporting, objective news
3. **title_ko**: Translate the title to Korean

Return ONLY this JSON format:
{{"keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"], "sentiment": "positive|negative|neutral", "title_ko": "한국어 제목"}}"""

    def __init__(self, client: GeminiClient):
        self.client = client

    async def process_article(self, article: NewsArticle) -> ProcessedNews:
        """단일 기사 처리 (키워드 + 감성 + 번역을 1회 API 호출로 처리)

        요약은 브리핑 생성 시 일괄 처리됨

        Args:
            article: 뉴스 기사

        Returns:
            처리된 뉴스 데이터
        """
        result = ProcessedNews(article=article)

        try:
            # 언어에 따라 통합 프롬프트 선택
            if article.language == "en":
                prompt = self.ANALYZE_PROMPT_EN.format(
                    title=article.title,
                    content=article.summary[:1500]
                )
            else:
                prompt = self.ANALYZE_PROMPT_KO.format(
                    title=article.title,
                    content=article.summary[:1500]
                )

            # 단일 API 호출로 모든 분석 수행
            response = await self.client.generate(prompt, temperature=0.2, max_output_tokens=1000)
            data = self._parse_json(response)

            if data:
                # 키워드 추출
                if "keywords" in data:
                    result.keywords = {"keywords": data["keywords"]}

                # 감성 분석
                if "sentiment" in data:
                    sentiment = data["sentiment"]
                    if sentiment not in ["positive", "negative", "neutral"]:
                        sentiment = "neutral"
                    result.sentiment = {"sentiment": sentiment}

                # 번역 (영어 기사만)
                if article.language == "en" and "title_ko" in data:
                    result.translation = {"title_ko": data["title_ko"]}

            logger.debug(f"기사 처리 완료: {article.id}")

        except Exception as e:
            result.error = str(e)
            logger.error(f"기사 처리 실패 [{article.id}]: {e}")

        return result

    async def process_batch(
        self,
        articles: list[NewsArticle],
        concurrency: int = 1
    ) -> list[ProcessedNews]:
        """배치 처리

        Args:
            articles: 기사 리스트
            concurrency: 동시 처리 수

        Returns:
            처리된 뉴스 리스트
        """
        import asyncio

        semaphore = asyncio.Semaphore(concurrency)

        async def process_with_limit(article):
            async with semaphore:
                return await self.process_article(article)

        tasks = [process_with_limit(a) for a in articles]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        processed = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"배치 처리 오류: {result}")
                processed.append(ProcessedNews(
                    article=articles[i],
                    error=str(result)
                ))
            else:
                processed.append(result)

        logger.info(f"배치 처리 완료: {len(processed)}개 기사")
        return processed

    def _parse_json(self, text: str | None) -> dict | None:
        """JSON 응답 파싱

        Args:
            text: Gemini 응답 텍스트

        Returns:
            파싱된 딕셔너리 또는 None
        """
        if not text:
            return None

        try:
            # ```json ... ``` 형식 처리
            if "```" in text:
                match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
                if match:
                    text = match.group(1)

            # JSON 부분만 추출
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                text = match.group(0)

            return json.loads(text)

        except json.JSONDecodeError as e:
            logger.debug(f"JSON 파싱 실패: {e}")
            return None
