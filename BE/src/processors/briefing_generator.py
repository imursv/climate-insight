"""AI 브리핑 생성 모듈

Gemini를 사용하여 수집된 뉴스들을 종합하여
대변인 스타일의 브리핑을 생성합니다.

2단계 처리 방식:
1. 배치별 기사 요약 (10개씩)
2. 요약 기반 종합 브리핑 생성
"""
import json
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from .gemini_client import GeminiClient
from .news_processor import ProcessedNews
from ..utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class BriefingSection:
    """브리핑 섹션"""
    title: str
    content: str  # 인용 번호 [1], [2] 포함
    tone: Literal["urgent", "positive", "neutral"]


@dataclass
class BriefingContent:
    """AI 생성 브리핑 내용"""
    opening: str
    sections: list[BriefingSection]
    closing: str


@dataclass
class DailyBriefing:
    """일일 브리핑 데이터"""
    date: str
    generated_at: str
    briefing: BriefingContent
    articles: list[dict]  # 모든 기사 (번호순)
    summary: dict


class BriefingGenerator:
    """대변인 스타일 브리핑 생성기 (2단계 처리)"""

    # 배치당 기사 수
    BATCH_SIZE = 10

    # Phase 1: 배치별 기사 요약 프롬프트
    SUMMARY_BATCH_PROMPT = """당신은 기후변화 전문 과학 저널리스트입니다.
다음 뉴스 기사들을 분석하여 각각 요약해주세요.

## 요약 규칙
- phenomenon: 무엇이 일어났는가? (구체적 수치, 지역, 시점 포함, 1-2문장)
- cause: 왜 일어났는가? (과학적 원인/배경, 1-2문장)
- outlook: 앞으로 어떻게 될 것인가? (영향/전망, 1-2문장)
- **원문에 명시되지 않은 내용은 절대 추측하지 마세요. "기사에서 언급되지 않음"으로 표기**

## 기사 목록
{articles}

## 응답 형식 (반드시 JSON)
{{
  "summaries": {{
    "{start_id}": {{"phenomenon": "...", "cause": "...", "outlook": "..."}},
    "{next_id}": {{"phenomenon": "...", "cause": "...", "outlook": "..."}}
  }}
}}"""

    # Phase 2: 종합 브리핑 프롬프트
    BRIEFING_PROMPT = """당신은 기후변화 전문 대변인이자 과학 저널리스트입니다.
오늘({date}) 수집된 기후 관련 뉴스를 바탕으로 격식있는 데일리 브리핑을 작성하세요.

## 오늘의 주요 뉴스 요약 (총 {total_count}건)
{summaries}

## 브리핑 작성 규칙

### 1. opening (오프닝)
- 격식있는 인사말로 시작
- 예: "안녕하십니까. {date} 기후 브리핑을 시작하겠습니다."

### 2. sections (본문 섹션)
- **4-5개 주제별 섹션**으로 구성
- 각 섹션은 **3-5문장**으로 충실하게 작성
- **반드시 [번호] 형식으로 출처 인용** (예: [1], [3, 5])
- 관련 뉴스들을 연결하여 맥락과 흐름 제공
- title에 이모지 포함:
  - 🔴 긴급/위기 상황
  - 🌍 국제 동향
  - 🇰🇷 국내 소식
  - ⚠️ 경고/주의
  - 🌱 긍정적 진전
- tone 값: "urgent"(긴급), "positive"(긍정), "neutral"(중립)

### 3. closing (마무리)
- 요약 및 전망 1-2문장
- 예: "이상으로 오늘의 기후 브리핑을 마치겠습니다."

## 중요 사항
- **위 뉴스 요약에 있는 내용만 사용**하세요
- 요약에 없는 수치, 날짜, 기관명 등을 임의로 추가하지 마세요
- 모든 정보는 반드시 [번호] 인용과 함께 작성

## 응답 형식 (반드시 JSON)
{{
  "opening": "격식있는 오프닝 인사",
  "sections": [
    {{
      "title": "🔴 섹션 제목",
      "content": "본문 내용을 3-5문장으로 작성합니다 [1]. 관련된 다른 뉴스와 연결하여 맥락을 제공합니다 [3, 5]. 추가 설명을 덧붙입니다.",
      "tone": "urgent"
    }}
  ],
  "closing": "마무리 인사"
}}"""

    def __init__(self, client: GeminiClient):
        self.client = client

    async def generate_briefing(
        self,
        processed_news: list[ProcessedNews],
        date: str | None = None
    ) -> DailyBriefing | None:
        """일일 브리핑 생성 (2단계 처리)

        Args:
            processed_news: 처리된 뉴스 리스트
            date: 날짜 (YYYY-MM-DD), None이면 오늘

        Returns:
            생성된 브리핑 또는 None
        """
        if not processed_news:
            logger.warning("브리핑 생성할 뉴스가 없습니다")
            return None

        date = date or datetime.now().strftime("%Y-%m-%d")
        logger.info(f"=== 브리핑 생성 시작: {date}, {len(processed_news)}개 기사 ===")

        # Phase 1: 배치별 기사 요약
        logger.info("Phase 1: 배치별 기사 요약 시작")
        article_summaries = await self._summarize_in_batches(processed_news)
        logger.info(f"Phase 1 완료: {len(article_summaries)}개 기사 요약됨")

        # Phase 2: 종합 브리핑 생성
        logger.info("Phase 2: 종합 브리핑 생성 시작")
        briefing_content = await self._generate_daily_briefing(
            processed_news, article_summaries, date
        )

        if not briefing_content:
            logger.error("Phase 2 실패: 브리핑 생성 실패")
            return None

        logger.info("Phase 2 완료: 브리핑 생성됨")

        # 기사 목록 구성 (프론트엔드 형식)
        articles = self._format_articles_for_frontend(processed_news, article_summaries)

        # 통계 요약
        summary = self._generate_summary(processed_news)

        return DailyBriefing(
            date=date,
            generated_at=datetime.now().isoformat(),
            briefing=briefing_content,
            articles=articles,
            summary=summary
        )

    async def _summarize_in_batches(
        self,
        news_list: list[ProcessedNews]
    ) -> dict[str, dict]:
        """배치별로 기사 요약 생성

        Args:
            news_list: 전체 뉴스 리스트

        Returns:
            {기사번호: {phenomenon, cause, outlook}} 딕셔너리
        """
        all_summaries = {}
        total_batches = (len(news_list) + self.BATCH_SIZE - 1) // self.BATCH_SIZE

        for batch_idx in range(total_batches):
            start_idx = batch_idx * self.BATCH_SIZE
            end_idx = min(start_idx + self.BATCH_SIZE, len(news_list))
            batch = news_list[start_idx:end_idx]

            logger.info(f"배치 {batch_idx + 1}/{total_batches} 처리 중 (기사 {start_idx + 1}-{end_idx})")

            # 배치용 기사 목록 생성
            articles_text = self._format_batch_articles(batch, start_idx + 1)

            # 프롬프트 생성
            prompt = self.SUMMARY_BATCH_PROMPT.format(
                articles=articles_text,
                start_id=start_idx + 1,
                next_id=start_idx + 2
            )

            # Gemini 호출
            response = await self.client.generate(
                prompt,
                temperature=0.2,  # 정확성을 위해 낮게
                max_output_tokens=4000
            )

            if not response:
                logger.warning(f"배치 {batch_idx + 1} 요약 실패: 응답 없음")
                # 실패한 기사들에 대해 기본 요약 생성
                for i, news in enumerate(batch):
                    article_id = str(start_idx + i + 1)
                    all_summaries[article_id] = self._get_default_summary(news)
                continue

            # JSON 파싱
            batch_data = self._parse_json(response)
            if batch_data and "summaries" in batch_data:
                all_summaries.update(batch_data["summaries"])
                logger.debug(f"배치 {batch_idx + 1}: {len(batch_data['summaries'])}개 요약 추가")
            else:
                logger.warning(f"배치 {batch_idx + 1} JSON 파싱 실패")
                # 실패한 기사들에 대해 기본 요약 생성
                for i, news in enumerate(batch):
                    article_id = str(start_idx + i + 1)
                    all_summaries[article_id] = self._get_default_summary(news)

        return all_summaries

    async def _generate_daily_briefing(
        self,
        news_list: list[ProcessedNews],
        article_summaries: dict[str, dict],
        date: str
    ) -> BriefingContent | None:
        """요약을 바탕으로 종합 브리핑 생성

        Args:
            news_list: 전체 뉴스 리스트
            article_summaries: 기사별 요약
            date: 브리핑 날짜

        Returns:
            BriefingContent 또는 None
        """
        # 요약 목록 생성 (전체 기사 사용)
        summaries_text = self._format_summaries_for_briefing(news_list, article_summaries)

        # 프롬프트 생성
        prompt = self.BRIEFING_PROMPT.format(
            date=date,
            total_count=len(news_list),
            summaries=summaries_text
        )

        # Gemini 호출 (출력 토큰 충분히 확보 - Gemini 2.5 Flash는 65K까지 지원)
        response = await self.client.generate(
            prompt,
            temperature=0.7,  # 창의성을 위해 약간 높게
            max_output_tokens=32000  # 충분한 출력 토큰
        )

        if not response:
            logger.error("종합 브리핑 생성 실패: 응답 없음")
            return None

        # JSON 파싱
        briefing_data = self._parse_json(response)
        if not briefing_data:
            logger.error(f"종합 브리핑 JSON 파싱 실패. 응답 시작: {response[:500]}")
            return None

        # BriefingContent 구성
        try:
            sections = [
                BriefingSection(
                    title=s.get("title", ""),
                    content=s.get("content", ""),
                    tone=s.get("tone", "neutral")
                )
                for s in briefing_data.get("sections", [])
            ]

            return BriefingContent(
                opening=briefing_data.get("opening", ""),
                sections=sections,
                closing=briefing_data.get("closing", "")
            )
        except Exception as e:
            logger.error(f"브리핑 구조화 실패: {e}")
            return None

    def _format_batch_articles(self, batch: list[ProcessedNews], start_id: int) -> str:
        """배치용 기사 목록 포맷팅"""
        lines = []
        for i, news in enumerate(batch):
            article_id = start_id + i
            article = news.article

            # 번역된 제목 사용
            title = article.title
            if news.translation and news.translation.get("title_ko"):
                title = news.translation["title_ko"]

            # 본문 (요약용)
            content = article.summary[:2000] if article.summary else ""

            lines.append(
                f"[{article_id}] 제목: {title}\n"
                f"    출처: {article.source} | 언어: {article.language}\n"
                f"    내용: {content}"
            )

        return "\n\n".join(lines)

    def _format_summaries_for_briefing(
        self,
        news_list: list[ProcessedNews],
        article_summaries: dict[str, dict]
    ) -> str:
        """브리핑 생성용 요약 목록 포맷팅 (간결하게)"""
        lines = []
        for i, news in enumerate(news_list, 1):
            article = news.article
            summary = article_summaries.get(str(i), {})

            # 번역된 제목 사용
            title = article.title
            if news.translation and news.translation.get("title_ko"):
                title = news.translation["title_ko"]

            # 감성
            sentiment = news.sentiment.get("sentiment", "neutral") if news.sentiment else "neutral"
            sentiment_emoji = {"positive": "🌱", "negative": "⚠️", "neutral": "📰"}.get(sentiment, "📰")

            # 카테고리
            category = "국내" if article.language == "ko" else "국제"

            # 현상만 사용 (간결하게)
            phenomenon = summary.get('phenomenon', '요약 없음')
            # 너무 길면 자르기
            if len(phenomenon) > 150:
                phenomenon = phenomenon[:147] + "..."

            lines.append(f"[{i}] {sentiment_emoji}[{category}] {title}: {phenomenon}")

        return "\n".join(lines)

    def _get_default_summary(self, news: ProcessedNews) -> dict:
        """기본 요약 생성 (API 실패 시)"""
        article = news.article
        return {
            "phenomenon": article.summary[:150] if article.summary else "요약 없음",
            "cause": "기사에서 언급되지 않음",
            "outlook": "기사에서 언급되지 않음"
        }

    def _format_articles_for_frontend(
        self,
        news_list: list[ProcessedNews],
        article_summaries: dict[str, dict]
    ) -> list[dict]:
        """프론트엔드용 기사 형식으로 변환"""
        articles = []
        for i, news in enumerate(news_list, 1):
            article = news.article
            sentiment = news.sentiment.get("sentiment", "neutral") if news.sentiment else "neutral"

            # 번역된 제목 사용
            title = article.title
            original_title = None
            if news.translation and news.translation.get("title_ko"):
                original_title = article.title
                title = news.translation["title_ko"]

            # 요약 데이터
            summary_data = article_summaries.get(str(i), self._get_default_summary(news))

            # 키워드
            keywords = []
            if news.keywords and news.keywords.get("keywords"):
                keywords = news.keywords["keywords"][:5]

            articles.append({
                "id": str(i),
                "title": title,
                "original_title": original_title,
                "url": article.link,
                "source": article.source,
                "published_at": article.published_at.isoformat() if article.published_at else "",
                "summary": summary_data,
                "sentiment": sentiment,
                "keywords": keywords,
                "language": article.language,
                "category": "domestic" if article.language == "ko" else "international"
            })

        return articles

    def _generate_summary(self, news_list: list[ProcessedNews]) -> dict:
        """통계 요약 생성"""
        total = len(news_list)
        domestic = sum(1 for n in news_list if n.article.language == "ko")
        international = total - domestic

        sentiments = {"positive": 0, "negative": 0, "neutral": 0}
        all_keywords = []

        for news in news_list:
            if news.sentiment:
                s = news.sentiment.get("sentiment", "neutral")
                if s in sentiments:
                    sentiments[s] += 1

            if news.keywords and news.keywords.get("keywords"):
                all_keywords.extend(news.keywords["keywords"])

        # 상위 키워드 추출
        keyword_counts = {}
        for kw in all_keywords:
            keyword_counts[kw] = keyword_counts.get(kw, 0) + 1
        top_keywords = sorted(keyword_counts.keys(), key=lambda k: keyword_counts[k], reverse=True)[:5]

        return {
            "total_count": total,
            "domestic_count": domestic,
            "international_count": international,
            "top_keywords": top_keywords,
            "sentiment_breakdown": sentiments
        }

    def _parse_json(self, text: str | None) -> dict | None:
        """JSON 응답 파싱 (잘린 JSON 복구 시도 포함)"""
        if not text:
            return None

        try:
            # ```json ... ``` 형식 처리 (닫히지 않은 경우도 처리)
            if "```json" in text:
                # 시작 태그 이후 내용 추출
                start_idx = text.find("```json") + 7
                end_idx = text.find("```", start_idx)
                if end_idx > start_idx:
                    text = text[start_idx:end_idx]
                else:
                    text = text[start_idx:]  # 닫히지 않은 경우 끝까지
            elif "```" in text:
                match = re.search(r"```\s*([\s\S]*?)(?:```|$)", text)
                if match:
                    text = match.group(1)

            # JSON 부분만 추출
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                text = match.group(0)

            # 먼저 정상 파싱 시도
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                pass

            # 잘린 JSON 복구 시도
            repaired = self._repair_truncated_json(text)
            if repaired:
                return json.loads(repaired)

            return None

        except json.JSONDecodeError as e:
            logger.debug(f"JSON 파싱 실패: {e}")
            logger.debug(f"원본 텍스트: {text[:500]}")
            return None

    def _repair_truncated_json(self, text: str) -> str | None:
        """잘린 JSON 복구 시도"""
        if not text or not text.strip().startswith("{"):
            return None

        # 열린 괄호 카운트
        open_braces = text.count("{") - text.count("}")
        open_brackets = text.count("[") - text.count("]")

        # 마지막 완전한 객체/배열까지 자르기
        # 잘린 문자열 부분 제거 (마지막 미완성 값)
        repaired = text.rstrip()

        # 미완성 문자열 제거 (홀수 개의 따옴표)
        quote_count = repaired.count('"') - repaired.count('\\"')
        if quote_count % 2 == 1:
            # 마지막 따옴표 이전까지 자르기
            last_quote = repaired.rfind('"')
            if last_quote > 0:
                repaired = repaired[:last_quote]
                # 마지막 키-값 쌍 제거
                last_colon = repaired.rfind(':')
                last_comma = repaired.rfind(',')
                cut_point = max(last_colon, last_comma)
                if cut_point > 0:
                    repaired = repaired[:cut_point]

        # 닫는 괄호 추가
        repaired = repaired.rstrip(',: \n\t')
        repaired += "]" * open_brackets
        repaired += "}" * open_braces

        try:
            # 복구된 JSON 검증
            json.loads(repaired)
            logger.info("잘린 JSON 복구 성공")
            return repaired
        except json.JSONDecodeError:
            logger.debug("JSON 복구 실패")
            return None

    def to_dict(self, briefing: DailyBriefing) -> dict:
        """DailyBriefing을 JSON 직렬화 가능한 dict로 변환"""
        return {
            "date": briefing.date,
            "generated_at": briefing.generated_at,
            "briefing": {
                "opening": briefing.briefing.opening,
                "sections": [
                    {
                        "title": s.title,
                        "content": s.content,
                        "tone": s.tone
                    }
                    for s in briefing.briefing.sections
                ],
                "closing": briefing.briefing.closing
            },
            "articles": briefing.articles,
            "summary": briefing.summary
        }
