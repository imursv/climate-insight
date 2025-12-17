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

    SUMMARY_PROMPT = """당신은 기후변화 전문 과학 저널리스트입니다.
다음 뉴스 기사를 분석하여 핵심 내용을 3가지 관점으로 요약해주세요.

## 요약 구조
1. **현상 (phenomenon)**: 무엇이 일어났는가?
   - 구체적인 수치, 지역, 시점을 포함
   - 핵심 사실만 명확하게 전달

2. **원인 (cause)**: 왜 일어났는가?
   - 과학적 원인이나 배경 설명
   - 인과관계를 명확히 서술

3. **전망 (outlook)**: 앞으로 어떻게 될 것인가?
   - 예상되는 영향이나 후속 조치
   - 가능하다면 전문가 의견이나 전망 포함

## 작성 규칙
- 각 항목은 1~2문장으로 작성 (문장당 80자 내외)
- 원문에 없는 내용은 추측하지 말 것
- 기사에 원인이나 전망이 명시되지 않았다면 "기사에서 언급되지 않음"으로 표기

## 예시
입력: "NASA 발표에 따르면 2024년 전 세계 평균 기온이 산업화 이전 대비 1.54도 상승해 역대 최고치를 기록했다. 과학자들은 화석연료 사용 증가와 엘니뇨 현상이 복합적으로 작용했다고 분석했다. 이 추세가 계속되면 파리협정 1.5도 목표 달성이 더욱 어려워질 전망이다."

출력:
{{"phenomenon": "2024년 전 세계 평균 기온이 산업화 이전 대비 1.54도 상승하며 관측 역사상 가장 더운 해로 기록되었다.", "cause": "화석연료 연소로 인한 온실가스 배출 증가와 엘니뇨 현상이 복합적으로 작용한 결과로 분석된다.", "outlook": "현 추세가 지속될 경우 파리협정의 1.5도 목표 달성이 사실상 불가능해질 것이라는 우려가 제기된다."}}

---

## 분석할 기사
제목: {title}
내용: {content}

반드시 위 JSON 형식으로만 응답하세요:"""

    TRANSLATION_PROMPT = """Translate the following English news article to Korean.
Maintain the journalistic tone and accuracy.

Title: {title}
Content: {content}

Return ONLY JSON format:
{{"title_ko": "한국어 제목", "summary_ko": "한국어 요약 (3문장 이내)"}}"""

    SENTIMENT_PROMPT = """다음 기후 관련 뉴스의 감성을 분석해주세요.

기사 제목: {title}
기사 내용: {content}

판단 기준:
- positive: 기술 발전, 협약 체결, 긍정적 진전
- negative: 재난, 경고, 위기 심화
- neutral: 단순 정보 전달, 객관적 보도

반드시 아래 JSON 형식으로만 응답하세요:
{{"sentiment": "positive|negative|neutral", "confidence": 0.0-1.0, "reasoning": "판단 근거 (1문장)"}}"""

    KEYWORD_PROMPT = """다음 기후 뉴스에서 핵심 키워드를 추출해주세요.

기사: {title}
{content}

반드시 아래 JSON 형식으로만 응답하세요:
{{"keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"], "topics": ["관련 토픽1", "관련 토픽2"]}}"""

    def __init__(self, client: GeminiClient):
        self.client = client

    async def process_article(self, article: NewsArticle) -> ProcessedNews:
        """단일 기사 처리 (키워드 + 감성 + 번역)

        요약은 브리핑 생성 시 일괄 처리됨

        Args:
            article: 뉴스 기사

        Returns:
            처리된 뉴스 데이터
        """
        result = ProcessedNews(article=article)

        try:
            # 1. 키워드 추출
            result.keywords = await self._extract_keywords(article)

            # 2. 감성 분석
            result.sentiment = await self._analyze_sentiment(article)

            # 3. 번역 (영어 기사만 - 제목만 번역)
            if article.language == "en":
                result.translation = await self._translate(article)

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

    async def _summarize(self, article: NewsArticle) -> dict | None:
        """3줄 요약 (현상-원인-전망)"""
        prompt = self.SUMMARY_PROMPT.format(
            title=article.title,
            content=article.summary[:3000]  # 더 많은 컨텍스트 제공
        )

        response = await self.client.generate(prompt, temperature=0.2, max_output_tokens=2000)
        return self._parse_json(response)

    async def _translate(self, article: NewsArticle) -> dict | None:
        """영어 → 한국어 번역"""
        prompt = self.TRANSLATION_PROMPT.format(
            title=article.title,
            content=article.summary[:2000]
        )

        response = await self.client.generate(prompt, temperature=0.2, max_output_tokens=2000)
        return self._parse_json(response)

    async def _analyze_sentiment(self, article: NewsArticle) -> dict | None:
        """감성 분석"""
        prompt = self.SENTIMENT_PROMPT.format(
            title=article.title,
            content=article.summary[:1000]
        )

        response = await self.client.generate(prompt, temperature=0.1, max_output_tokens=1000)
        result = self._parse_json(response)

        # 감성 값 정규화
        if result:
            valid_sentiments = ["positive", "negative", "neutral"]
            if result.get("sentiment") not in valid_sentiments:
                result["sentiment"] = "neutral"

        return result

    async def _extract_keywords(self, article: NewsArticle) -> dict | None:
        """키워드 추출"""
        prompt = self.KEYWORD_PROMPT.format(
            title=article.title,
            content=article.summary[:1000]
        )

        response = await self.client.generate(prompt, temperature=0.2, max_output_tokens=1000)
        return self._parse_json(response)

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
