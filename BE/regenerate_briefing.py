"""저장된 뉴스 데이터에서 브리핑만 재생성하는 스크립트"""
import asyncio
import json
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass

from src.config.settings import get_settings
from src.processors import GeminiClient, BriefingGenerator
from src.processors.news_processor import ProcessedNews
from src.collectors.news.rss_collector import NewsArticle
from src.storage import JSONHandler
from src.utils.logger import setup_logging, get_logger

logger = get_logger(__name__)


def load_news_from_json(data_dir: Path, date: str) -> list[ProcessedNews]:
    """JSON 파일에서 뉴스 로드하여 ProcessedNews 객체로 변환"""
    news_file = data_dir / "news" / f"{date}.json"

    if not news_file.exists():
        raise FileNotFoundError(f"뉴스 파일 없음: {news_file}")

    with open(news_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    articles = data.get("articles", [])
    processed_list = []

    for article_data in articles:
        # NewsArticle 객체 생성
        published_at = None
        if article_data.get("published_at"):
            try:
                published_at = datetime.fromisoformat(article_data["published_at"])
            except:
                pass

        collected_at = None
        if article_data.get("collected_at"):
            try:
                collected_at = datetime.fromisoformat(article_data["collected_at"])
            except:
                pass

        article = NewsArticle(
            id=article_data.get("id", ""),
            title=article_data.get("title", ""),
            link=article_data.get("link", ""),
            summary=article_data.get("summary") or "",
            source=article_data.get("source", ""),
            language=article_data.get("language", "ko"),
            published_at=published_at,
            collected_at=collected_at,
            keywords_matched=article_data.get("keywords_matched", [])
        )

        # ProcessedNews 객체 생성
        processed = ProcessedNews(
            article=article,
            summary=article_data.get("summary"),
            translation=article_data.get("translation"),
            sentiment=article_data.get("sentiment"),
            keywords=article_data.get("keywords")
        )

        processed_list.append(processed)

    return processed_list


async def regenerate_briefing(date: str = None):
    """브리핑 재생성"""
    setup_logging("INFO")

    settings = get_settings()
    data_dir = Path("data")
    date = date or datetime.now().strftime("%Y-%m-%d")

    logger.info(f"=== 브리핑 재생성 시작: {date} ===")

    # 뉴스 로드
    processed_news = load_news_from_json(data_dir, date)
    logger.info(f"로드된 뉴스: {len(processed_news)}개")

    # Gemini 클라이언트 초기화
    gemini_client = GeminiClient(settings.gemini_api_key)

    # 브리핑 생성
    briefing_generator = BriefingGenerator(gemini_client)
    briefing = await briefing_generator.generate_briefing(processed_news, date)

    if briefing:
        # 저장
        json_handler = JSONHandler(data_dir)
        briefing_dict = briefing_generator.to_dict(briefing)
        json_handler.save_briefing(briefing_dict)

        logger.info(f"브리핑 생성 완료: {len(briefing.articles)}개 기사")
        logger.info(f"섹션: {len(briefing.briefing.sections)}개")

        # API 사용 통계
        stats = gemini_client.get_stats()
        logger.info(f"Gemini API 사용: {stats['total_requests']}회, {stats['total_tokens']} 토큰")
    else:
        logger.error("브리핑 생성 실패")


if __name__ == "__main__":
    import sys
    date = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(regenerate_briefing(date))
