"""기존 브리핑 파일들을 영어로 번역하는 스크립트"""
import asyncio
import argparse
from pathlib import Path

from src.config.settings import get_settings
from src.processors.gemini_client import GeminiClient
from src.processors.translator import translate_briefing_file
from src.utils.logger import setup_logging, get_logger

logger = get_logger(__name__)


async def main(data_dir: Path, force: bool = False):
    """모든 브리핑 파일 번역"""
    setup_logging("INFO")

    settings = get_settings()
    gemini_client = GeminiClient(settings.gemini_api_key)

    briefing_dir = data_dir / "briefing"
    briefing_en_dir = data_dir / "briefing" / "en"
    briefing_en_dir.mkdir(parents=True, exist_ok=True)

    # 한국어 브리핑 파일 목록
    ko_files = list(briefing_dir.glob("*.json"))
    ko_files = [f for f in ko_files if f.name != "index.json"]

    logger.info(f"번역할 파일: {len(ko_files)}개")

    for ko_file in ko_files:
        en_file = briefing_en_dir / ko_file.name

        # 이미 번역된 파일은 스킵 (force가 아닌 경우)
        if en_file.exists() and not force:
            logger.info(f"스킵 (이미 존재): {en_file.name}")
            continue

        logger.info(f"번역 시작: {ko_file.name}")
        success = await translate_briefing_file(ko_file, en_file, gemini_client)

        if success:
            logger.info(f"번역 완료: {en_file.name}")
        else:
            logger.error(f"번역 실패: {ko_file.name}")

    # API 사용 통계
    stats = gemini_client.get_stats()
    logger.info(f"Gemini API 사용: {stats['total_requests']}회, {stats['total_tokens']} 토큰")

    # 영문 인덱스 파일 생성 (한글 인덱스와 동일한 구조)
    en_files = list(briefing_en_dir.glob("*.json"))
    en_files = [f for f in en_files if f.name != "index.json"]

    # 날짜별로 그룹화
    from datetime import datetime
    dates_with_periods = {}

    for f in en_files:
        stem = f.stem
        if stem.endswith("-morning"):
            date = stem[:-8]
            period = "morning"
        elif stem.endswith("-afternoon"):
            date = stem[:-10]
            period = "afternoon"
        else:
            date = stem
            period = "full"

        if date not in dates_with_periods:
            dates_with_periods[date] = []
        dates_with_periods[date].append({
            "period": period,
            "file": f.name,
            "period_label": {"morning": "Morning", "afternoon": "Afternoon", "full": "Full"}.get(period, period)
        })

    sorted_dates = sorted(dates_with_periods.keys(), reverse=True)

    # 최신 파일 결정
    latest = None
    if sorted_dates:
        latest_date = sorted_dates[0]
        periods = dates_with_periods[latest_date]
        for p in ["afternoon", "morning", "full"]:
            matching = [item for item in periods if item["period"] == p]
            if matching:
                latest = matching[0]["file"].replace(".json", "")
                break

    index_data = {
        "language": "en",
        "last_updated": datetime.now().isoformat(),
        "available_dates": sorted_dates,
        "dates_detail": dates_with_periods,
        "latest": latest,
        "total_briefings": len(en_files)
    }

    import json
    with open(briefing_en_dir / "index.json", "w", encoding="utf-8") as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)

    logger.info(f"영문 인덱스 파일 생성 완료: {len(sorted_dates)}일, {len(en_files)}개 브리핑")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="브리핑 영문 번역")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("data"),
        help="데이터 디렉토리"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="이미 번역된 파일도 다시 번역"
    )

    args = parser.parse_args()
    asyncio.run(main(args.data_dir, args.force))
