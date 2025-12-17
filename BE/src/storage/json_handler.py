"""JSON 파일 저장/로드 모듈"""
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from ..utils.logger import get_logger

logger = get_logger(__name__)


class JSONHandler:
    """JSON 데이터 저장 핸들러"""

    def __init__(self, data_dir: str | Path):
        """
        Args:
            data_dir: 데이터 저장 디렉토리
        """
        self.data_dir = Path(data_dir)
        self.news_dir = self.data_dir / "news"
        self.briefing_dir = self.data_dir / "briefing"
        self.climate_dir = self.data_dir / "climate"
        self.cache_dir = self.data_dir / "cache"

        # 디렉토리 생성
        for d in [self.news_dir, self.briefing_dir, self.climate_dir, self.cache_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def save_news(self, articles: list[dict], date: str | None = None) -> Path:
        """뉴스 데이터 저장

        Args:
            articles: 뉴스 기사 리스트 (dict 형태)
            date: 날짜 (YYYY-MM-DD), None이면 오늘 날짜

        Returns:
            저장된 파일 경로
        """
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")

        # 통계 계산
        korean_count = sum(1 for a in articles if a.get("language") == "ko")
        intl_count = sum(1 for a in articles if a.get("language") == "en")

        sentiment_dist = {"positive": 0, "negative": 0, "neutral": 0}
        for a in articles:
            if "sentiment" in a and a["sentiment"]:
                label = a["sentiment"].get("sentiment", "neutral")
                sentiment_dist[label] = sentiment_dist.get(label, 0) + 1

        data = {
            "date": date,
            "metadata": {
                "collected_at": datetime.utcnow().isoformat(),
                "total_articles": len(articles),
                "sources": {
                    "korean": korean_count,
                    "international": intl_count
                },
                "sentiment_distribution": sentiment_dist
            },
            "articles": articles
        }

        file_path = self.news_dir / f"{date}.json"
        self._save_json(file_path, data)

        logger.info(f"뉴스 저장 완료: {file_path} ({len(articles)}개)")
        return file_path

    def save_briefing(self, briefing_data: dict, date: str | None = None) -> Path:
        """AI 브리핑 데이터 저장

        Args:
            briefing_data: 브리핑 데이터 (BriefingGenerator.to_dict() 결과)
            date: 날짜 (YYYY-MM-DD), None이면 오늘 날짜

        Returns:
            저장된 파일 경로
        """
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")

        file_path = self.briefing_dir / f"{date}.json"
        self._save_json(file_path, briefing_data)

        logger.info(f"브리핑 저장 완료: {file_path}")
        return file_path

    def load_briefing(self, date: str) -> dict | None:
        """특정 날짜 브리핑 로드

        Args:
            date: 날짜 (YYYY-MM-DD)

        Returns:
            브리핑 데이터 또는 None
        """
        file_path = self.briefing_dir / f"{date}.json"
        return self._load_json(file_path)

    def update_briefing_index(self) -> Path:
        """브리핑 인덱스 파일 업데이트

        Returns:
            인덱스 파일 경로
        """
        briefing_files = sorted(self.briefing_dir.glob("????-??-??.json"), reverse=True)
        dates = [f.stem for f in briefing_files]

        index_data = {
            "last_updated": datetime.utcnow().isoformat(),
            "available_dates": dates,
            "latest": dates[0] if dates else None
        }

        index_path = self.briefing_dir / "index.json"
        self._save_json(index_path, index_data)

        logger.info(f"브리핑 인덱스 업데이트: {len(dates)}일 데이터")
        return index_path

    def save_climate(self, climate_data: dict[str, dict]) -> dict[str, Path]:
        """기후 데이터 저장

        Args:
            climate_data: {타입: 데이터} 딕셔너리

        Returns:
            {타입: 파일경로} 딕셔너리
        """
        saved_files = {}

        type_to_file = {
            "global_temperature": "temperature.json",
            "co2_level": "co2.json",
            "arctic_sea_ice": "arctic_ice.json",
            "sea_level": "sea_level.json",
            "enso_oni": "enso.json",
        }

        for data_type, data in climate_data.items():
            if not data:
                continue

            filename = type_to_file.get(data_type, f"{data_type}.json")
            file_path = self.climate_dir / filename

            self._save_json(file_path, data)
            saved_files[data_type] = file_path

            logger.info(f"기후 데이터 저장: {file_path}")

        return saved_files

    def update_news_index(self) -> Path:
        """뉴스 인덱스 파일 업데이트

        Returns:
            인덱스 파일 경로
        """
        # 기존 뉴스 파일 스캔
        news_files = sorted(self.news_dir.glob("????-??-??.json"), reverse=True)

        dates = []
        total_articles = 0
        sources_dist = {}
        sentiment_dist = {"positive": 0, "negative": 0, "neutral": 0}

        for file_path in news_files[:90]:  # 최근 90일
            try:
                data = self._load_json(file_path)
                dates.append(file_path.stem)

                if "metadata" in data:
                    total_articles += data["metadata"].get("total_articles", 0)

                    # 소스 통계
                    for source, count in data["metadata"].get("sources", {}).items():
                        sources_dist[source] = sources_dist.get(source, 0) + count

                    # 감성 통계
                    for sent, count in data["metadata"].get("sentiment_distribution", {}).items():
                        sentiment_dist[sent] = sentiment_dist.get(sent, 0) + count

            except Exception as e:
                logger.warning(f"인덱스 업데이트 중 오류 ({file_path}): {e}")

        index_data = {
            "last_updated": datetime.utcnow().isoformat(),
            "available_dates": dates,
            "statistics": {
                "total_articles": total_articles,
                "date_range": {
                    "start": dates[-1] if dates else None,
                    "end": dates[0] if dates else None
                },
                "sources_distribution": sources_dist,
                "sentiment_distribution": sentiment_dist
            }
        }

        index_path = self.news_dir / "index.json"
        self._save_json(index_path, index_data)

        logger.info(f"뉴스 인덱스 업데이트: {len(dates)}일 데이터")
        return index_path

    def load_news(self, date: str) -> dict | None:
        """특정 날짜 뉴스 로드

        Args:
            date: 날짜 (YYYY-MM-DD)

        Returns:
            뉴스 데이터 또는 None
        """
        file_path = self.news_dir / f"{date}.json"
        return self._load_json(file_path)

    def load_climate(self, data_type: str) -> dict | None:
        """기후 데이터 로드

        Args:
            data_type: 데이터 타입 (temperature, co2, arctic_ice)

        Returns:
            기후 데이터 또는 None
        """
        file_path = self.climate_dir / f"{data_type}.json"
        return self._load_json(file_path)

    def _save_json(self, path: Path, data: Any) -> None:
        """JSON 파일 저장"""
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _load_json(self, path: Path) -> dict | None:
        """JSON 파일 로드"""
        if not path.exists():
            return None

        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"JSON 파싱 오류 ({path}): {e}")
            return None
