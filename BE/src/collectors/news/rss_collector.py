"""RSS 피드 기반 뉴스 수집 모듈"""
import asyncio
import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from html import unescape

import feedparser
import aiohttp

from ...utils.logger import get_logger
from ...config.rss_sources import get_climate_keywords

logger = get_logger(__name__)


@dataclass
class NewsArticle:
    """뉴스 기사 데이터 구조"""
    id: str                                    # 고유 ID (URL 해시)
    title: str                                 # 제목
    link: str                                  # 원문 URL
    summary: str                               # 요약/본문 미리보기
    source: str                                # RSS 소스 이름
    language: str                              # 언어 ('ko' / 'en')
    published_at: Optional[datetime] = None   # 발행일
    collected_at: datetime = field(default_factory=datetime.utcnow)
    keywords_matched: list = field(default_factory=list)  # 매칭된 키워드


class RSSCollector:
    """RSS 피드 뉴스 수집기"""

    def __init__(
        self,
        feeds: dict[str, str],
        language: str = "ko",
        max_articles_per_feed: int = 20
    ):
        """
        Args:
            feeds: {소스명: RSS URL} 딕셔너리
            language: 'ko' 또는 'en'
            max_articles_per_feed: 피드당 최대 수집 기사 수
        """
        self.feeds = feeds
        self.language = language
        self.max_articles_per_feed = max_articles_per_feed
        self.keywords = get_climate_keywords(language)

    async def collect(self) -> list[NewsArticle]:
        """모든 RSS 피드에서 뉴스 수집

        Returns:
            수집된 뉴스 기사 리스트
        """
        all_articles = []

        # 병렬 수집 (최대 5개 동시)
        semaphore = asyncio.Semaphore(5)

        async def fetch_with_limit(source: str, url: str):
            async with semaphore:
                return await self._fetch_feed(source, url)

        tasks = [
            fetch_with_limit(source, url)
            for source, url in self.feeds.items()
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                logger.error(f"피드 수집 실패: {result}")
                continue
            all_articles.extend(result)

        logger.info(f"총 {len(all_articles)}개 기사 수집 완료 (언어: {self.language})")
        return all_articles

    async def _fetch_feed(self, source: str, url: str) -> list[NewsArticle]:
        """단일 RSS 피드 파싱

        Args:
            source: 소스 이름
            url: RSS 피드 URL

        Returns:
            파싱된 뉴스 기사 리스트
        """
        try:
            # aiohttp로 피드 다운로드
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status != 200:
                        logger.warning(f"[{source}] HTTP {response.status}")
                        return []
                    content = await response.text()

            # feedparser로 파싱
            feed = feedparser.parse(content)

            if feed.bozo and feed.bozo_exception:
                logger.warning(f"[{source}] 파싱 경고: {feed.bozo_exception}")

            articles = []
            entries = feed.entries if self.max_articles_per_feed == 0 else feed.entries[:self.max_articles_per_feed]
            for entry in entries:
                article = self._parse_entry(entry, source)
                if article:
                    articles.append(article)

            logger.info(f"[{source}] {len(articles)}개 기사 수집")
            return articles

        except asyncio.TimeoutError:
            logger.error(f"[{source}] 타임아웃")
            return []
        except Exception as e:
            logger.error(f"[{source}] 수집 실패: {e}")
            return []

    def _parse_entry(self, entry, source: str) -> Optional[NewsArticle]:
        """RSS 엔트리를 NewsArticle로 변환

        Args:
            entry: feedparser 엔트리
            source: 소스 이름

        Returns:
            NewsArticle 또는 None
        """
        try:
            # 필수 필드 확인
            link = entry.get("link", "")
            title = entry.get("title", "")

            if not link or not title:
                return None

            # ID 생성 (URL 해시)
            article_id = hashlib.md5(link.encode()).hexdigest()[:16]

            # 제목 정제
            title = self._clean_text(title)
            if len(title) < 5:
                return None

            # 요약 추출
            summary = ""
            if "summary" in entry:
                summary = self._clean_text(entry.summary)
            elif "description" in entry:
                summary = self._clean_text(entry.description)
            summary = summary[:500]  # 500자 제한

            # 발행일 파싱
            published_at = None
            if "published_parsed" in entry and entry.published_parsed:
                try:
                    published_at = datetime(*entry.published_parsed[:6])
                except (TypeError, ValueError):
                    pass
            elif "updated_parsed" in entry and entry.updated_parsed:
                try:
                    published_at = datetime(*entry.updated_parsed[:6])
                except (TypeError, ValueError):
                    pass

            # 기후 키워드 매칭
            text = f"{title} {summary}".lower()
            keywords_matched = [
                kw for kw in self.keywords
                if kw.lower() in text
            ]

            # 키워드가 하나도 매칭되지 않으면 제외 (옵션)
            # 단, 기후 전문 피드(nasa_climate 등)는 모두 포함
            climate_specific_sources = ["nasa_climate", "guardian_climate", "carbonbrief", "hani_environment"]
            if not keywords_matched and source not in climate_specific_sources:
                return None

            return NewsArticle(
                id=article_id,
                title=title,
                link=link,
                summary=summary,
                source=source,
                language=self.language,
                published_at=published_at,
                keywords_matched=keywords_matched
            )

        except Exception as e:
            logger.debug(f"엔트리 파싱 실패: {e}")
            return None

    def _clean_text(self, text: str) -> str:
        """텍스트 정제 (HTML 태그 제거, 공백 정리)

        Args:
            text: 원본 텍스트

        Returns:
            정제된 텍스트
        """
        if not text:
            return ""

        # HTML 엔티티 디코딩
        text = unescape(text)

        # HTML 태그 제거
        text = re.sub(r"<[^>]+>", "", text)

        # 연속 공백 정리
        text = re.sub(r"\s+", " ", text)

        return text.strip()
