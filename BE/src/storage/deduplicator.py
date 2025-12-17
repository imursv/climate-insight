"""기사 중복 제거 모듈"""
import json
from datetime import datetime, timedelta
from pathlib import Path

from ..utils.logger import get_logger

logger = get_logger(__name__)


class ArticleDeduplicator:
    """기사 중복 제거기

    처리된 기사 ID를 캐싱하여 중복 처리를 방지합니다.
    """

    def __init__(self, cache_file: str | Path, retention_days: int = 30):
        """
        Args:
            cache_file: 캐시 파일 경로
            retention_days: 캐시 보관 일수
        """
        self.cache_file = Path(cache_file)
        self.retention_days = retention_days
        self.processed_ids: dict[str, str] = {}  # {id: date}

        self._load_cache()

    def _load_cache(self) -> None:
        """캐시 파일 로드"""
        if not self.cache_file.exists():
            return

        try:
            with open(self.cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.processed_ids = data.get("ids", {})
                logger.info(f"캐시 로드: {len(self.processed_ids)}개 기사")
        except (json.JSONDecodeError, OSError) as e:
            logger.warning(f"캐시 로드 실패: {e}")
            self.processed_ids = {}

    def save(self) -> None:
        """캐시 파일 저장"""
        self.cleanup_old_entries()

        self.cache_file.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "last_updated": datetime.utcnow().isoformat(),
            "ids": self.processed_ids,
            "total_count": len(self.processed_ids),
            "retention_days": self.retention_days
        }

        with open(self.cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        logger.info(f"캐시 저장: {len(self.processed_ids)}개 기사")

    def is_duplicate(self, article_id: str) -> bool:
        """중복 기사인지 확인

        Args:
            article_id: 기사 ID

        Returns:
            중복 여부
        """
        return article_id in self.processed_ids

    def mark_processed(self, article_id: str) -> None:
        """처리 완료 표시

        Args:
            article_id: 기사 ID
        """
        self.processed_ids[article_id] = datetime.utcnow().strftime("%Y-%m-%d")

    def filter_new_articles(self, articles: list) -> list:
        """새로운 기사만 필터링

        Args:
            articles: 기사 리스트 (id 필드 필요)

        Returns:
            중복되지 않은 기사 리스트
        """
        new_articles = []

        for article in articles:
            article_id = article.id if hasattr(article, "id") else article.get("id")

            if article_id and not self.is_duplicate(article_id):
                new_articles.append(article)
                self.mark_processed(article_id)

        filtered_count = len(articles) - len(new_articles)
        if filtered_count > 0:
            logger.info(f"중복 기사 필터링: {filtered_count}개 제외")

        return new_articles

    def cleanup_old_entries(self) -> None:
        """오래된 캐시 항목 정리"""
        cutoff = datetime.utcnow() - timedelta(days=self.retention_days)
        cutoff_str = cutoff.strftime("%Y-%m-%d")

        old_count = len(self.processed_ids)

        self.processed_ids = {
            id_: date
            for id_, date in self.processed_ids.items()
            if date >= cutoff_str
        }

        removed = old_count - len(self.processed_ids)
        if removed > 0:
            logger.info(f"오래된 캐시 정리: {removed}개 제거")
