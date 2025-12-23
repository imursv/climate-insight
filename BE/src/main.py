"""Climate Insight 데이터 파이프라인 메인 모듈

매일 실행되어 기후 관련 뉴스와 데이터를 수집하고 처리합니다.
"""
import asyncio
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dataclasses import asdict

# 한국 시간대 (UTC+9)
KST = timezone(timedelta(hours=9))

from .config.settings import get_settings
from .config.rss_sources import get_korean_feeds, get_international_feeds
from .collectors.news import RSSCollector
from .collectors.climate import (
    NOAACO2Collector,
    BerkeleyEarthCollector,
    SeaLevelCollector,
    ENSOCollector,
)
from .processors import GeminiClient, NewsProcessor, BriefingGenerator
from .processors.news_processor import ProcessedNews
from .storage import JSONHandler, ArticleDeduplicator
from .utils.logger import setup_logging, get_logger

logger = get_logger(__name__)


async def collect_news(deduplicator: ArticleDeduplicator) -> tuple[list, list]:
    """뉴스 수집

    Returns:
        (국내 뉴스, 해외 뉴스) 튜플
    """
    logger.info("=== 뉴스 수집 시작 ===")

    settings = get_settings()

    # 국내 뉴스 수집
    korean_collector = RSSCollector(
        feeds=get_korean_feeds(),
        language="ko",
        max_articles_per_feed=settings.max_articles_per_source
    )
    korean_articles = await korean_collector.collect()

    # 해외 뉴스 수집
    intl_collector = RSSCollector(
        feeds=get_international_feeds(),
        language="en",
        max_articles_per_feed=settings.max_articles_per_source
    )
    intl_articles = await intl_collector.collect()

    # 중복 필터링
    korean_new = deduplicator.filter_new_articles(korean_articles)
    intl_new = deduplicator.filter_new_articles(intl_articles)

    logger.info(f"뉴스 수집 완료: 국내 {len(korean_new)}개, 해외 {len(intl_new)}개")

    return korean_new, intl_new


async def collect_climate_data() -> dict:
    """기후 데이터 수집

    Returns:
        {타입: 데이터} 딕셔너리
    """
    logger.info("=== 기후 데이터 수집 시작 ===")

    collectors = [
        # 지도 시각화용 (연도별 변화)
        NOAACO2Collector(),       # CO2 농도
        # 연간 지표 (1년에 1개)
        BerkeleyEarthCollector(), # 전지구 기온 (NASA GISS 대체)
        SeaLevelCollector(),      # 해수면 상승
        ENSOCollector(),          # 엘니뇨/라니냐
    ]

    climate_data = {}

    for collector in collectors:
        try:
            data = await collector.collect()
            if data:
                climate_data[data["type"]] = data
        except Exception as e:
            logger.error(f"기후 데이터 수집 실패 [{collector.source_name}]: {e}")

    logger.info(f"기후 데이터 수집 완료: {list(climate_data.keys())}")

    return climate_data


async def process_news(
    korean_articles: list,
    intl_articles: list,
    processor: NewsProcessor,
    gemini_limit: int = 0
) -> tuple[list[ProcessedNews], list[dict]]:
    """뉴스 AI 처리

    Args:
        korean_articles: 국내 뉴스 리스트
        intl_articles: 해외 뉴스 리스트
        processor: 뉴스 처리기
        gemini_limit: Gemini 처리할 최대 기사 수 (0=전체)

    Returns:
        (ProcessedNews 리스트, 딕셔너리 리스트) 튜플
    """
    logger.info("=== 뉴스 AI 처리 시작 ===")

    all_articles = korean_articles + intl_articles

    if not all_articles:
        logger.info("처리할 뉴스 없음")
        return [], []

    # Gemini 처리할 기사와 스킵할 기사 분리
    if gemini_limit > 0 and len(all_articles) > gemini_limit:
        to_process = all_articles[:gemini_limit]
        to_skip = all_articles[gemini_limit:]
        logger.info(f"Gemini 처리: {len(to_process)}개, 스킵: {len(to_skip)}개")
    else:
        to_process = all_articles
        to_skip = []

    # 배치 처리 (Gemini)
    processed = await processor.process_batch(to_process, concurrency=1)

    # 딕셔너리로 변환 (Gemini 처리된 기사)
    result = []
    for p in processed:
        article_dict = asdict(p.article)
        article_dict["summary"] = p.summary
        article_dict["translation"] = p.translation
        article_dict["sentiment"] = p.sentiment
        article_dict["keywords"] = p.keywords

        if p.error:
            article_dict["processing_error"] = p.error

        # datetime을 문자열로 변환
        if article_dict.get("published_at"):
            article_dict["published_at"] = article_dict["published_at"].isoformat()
        if article_dict.get("collected_at"):
            article_dict["collected_at"] = article_dict["collected_at"].isoformat()

        result.append(article_dict)

    # 스킵된 기사도 추가 (Gemini 처리 없이)
    for article in to_skip:
        article_dict = asdict(article)
        if article_dict.get("published_at"):
            article_dict["published_at"] = article_dict["published_at"].isoformat()
        if article_dict.get("collected_at"):
            article_dict["collected_at"] = article_dict["collected_at"].isoformat()
        result.append(article_dict)

    logger.info(f"뉴스 AI 처리 완료: {len(processed)}개 (Gemini), {len(to_skip)}개 (스킵)")

    return processed, result


async def run_pipeline(data_dir: Path, skip_gemini: bool = False, gemini_limit: int = 0):
    """전체 파이프라인 실행

    Args:
        data_dir: 데이터 저장 디렉토리
        skip_gemini: Gemini 처리 스킵 여부
    """
    logger.info("=" * 50)
    logger.info("Climate Insight 파이프라인 시작")
    logger.info(f"시간: {datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')} KST")
    logger.info("=" * 50)

    # 핸들러 초기화
    json_handler = JSONHandler(data_dir)
    deduplicator = ArticleDeduplicator(
        cache_file=data_dir / "cache" / "processed_ids.json"
    )

    try:
        # 1. 뉴스 수집
        korean_articles, intl_articles = await collect_news(deduplicator)

        # 2. 기후 데이터 수집
        climate_data = await collect_climate_data()

        # 3. 뉴스 AI 처리
        processed_news_objects: list[ProcessedNews] = []
        processed_news_dicts: list[dict] = []

        if not skip_gemini and (korean_articles or intl_articles):
            settings = get_settings()
            gemini_client = GeminiClient(settings.gemini_api_key)
            processor = NewsProcessor(gemini_client)

            processed_news_objects, processed_news_dicts = await process_news(
                korean_articles,
                intl_articles,
                processor,
                gemini_limit=gemini_limit
            )

            # 4. AI 브리핑 생성
            if processed_news_objects:
                logger.info("=== AI 브리핑 생성 시작 ===")
                briefing_generator = BriefingGenerator(gemini_client)
                briefing = await briefing_generator.generate_briefing(processed_news_objects)

                if briefing:
                    briefing_dict = briefing_generator.to_dict(briefing)
                    json_handler.save_briefing(briefing_dict)
                    logger.info("AI 브리핑 생성 완료")
                else:
                    logger.warning("AI 브리핑 생성 실패")

            # API 사용 통계 로깅
            stats = gemini_client.get_stats()
            logger.info(f"Gemini API 사용: {stats['total_requests']}회, {stats['total_tokens']} 토큰")
        else:
            # Gemini 스킵 시 기본 처리
            for article in korean_articles + intl_articles:
                article_dict = asdict(article)
                if article_dict.get("published_at"):
                    article_dict["published_at"] = article_dict["published_at"].isoformat()
                if article_dict.get("collected_at"):
                    article_dict["collected_at"] = article_dict["collected_at"].isoformat()
                processed_news_dicts.append(article_dict)

        # 5. 데이터 저장
        today = datetime.now(KST).strftime("%Y-%m-%d")

        if processed_news_dicts:
            json_handler.save_news(processed_news_dicts, today)

        if climate_data:
            json_handler.save_climate(climate_data)

        # 6. 인덱스 업데이트
        json_handler.update_news_index()
        json_handler.update_briefing_index()

        # 7. 캐시 저장
        deduplicator.save()

        logger.info("=" * 50)
        logger.info("파이프라인 완료")
        logger.info(f"처리된 뉴스: {len(processed_news_dicts)}개")
        logger.info(f"기후 데이터: {list(climate_data.keys())}")
        logger.info("=" * 50)

    except Exception as e:
        logger.error(f"파이프라인 오류: {e}")
        raise


def main():
    """CLI 엔트리포인트"""
    parser = argparse.ArgumentParser(description="Climate Insight 데이터 파이프라인")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("data"),
        help="데이터 저장 디렉토리"
    )
    parser.add_argument(
        "--skip-gemini",
        action="store_true",
        help="Gemini API 처리 스킵"
    )
    parser.add_argument(
        "--gemini-limit",
        type=int,
        default=0,
        help="Gemini 처리할 최대 기사 수 (0=전체)"
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="로그 레벨"
    )

    args = parser.parse_args()

    # 로깅 설정
    setup_logging(args.log_level)

    # 설정 오버라이드
    settings = get_settings()
    if args.skip_gemini:
        settings.skip_gemini = True

    # 파이프라인 실행
    asyncio.run(run_pipeline(args.data_dir, args.skip_gemini, args.gemini_limit))


if __name__ == "__main__":
    main()
