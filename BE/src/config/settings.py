"""환경 설정 모듈"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # Gemini API
    gemini_api_key: str = Field(default="", env="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", env="GEMINI_MODEL")
    gemini_rpm_limit: int = Field(default=60, env="GEMINI_RPM_LIMIT")  # 유료 버전

    # Pipeline 설정
    skip_gemini: bool = Field(default=False, env="SKIP_GEMINI")
    debug_mode: bool = Field(default=False, env="DEBUG_MODE")

    # 데이터 경로
    data_dir: str = Field(default="data", env="DATA_DIR")

    # 뉴스 수집 설정 (0 = 무제한)
    max_articles_per_source: int = Field(default=0, env="MAX_ARTICLES_PER_SOURCE")
    article_retention_days: int = Field(default=30, env="ARTICLE_RETENTION_DAYS")

    # 로깅
    log_level: str = Field(default="INFO", env="LOG_LEVEL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """설정 싱글톤 인스턴스 반환"""
    return Settings()
