"""Gemini API 클라이언트 모듈 (새 google-genai SDK)

Rate Limiting과 재시도 로직을 포함한 Gemini API 래퍼입니다.
"""
import asyncio
import time
from collections import deque

from google import genai
from google.genai import types

from ..config.settings import get_settings
from ..utils.logger import get_logger

logger = get_logger(__name__)


class RateLimiter:
    """토큰 버킷 기반 Rate Limiter"""

    def __init__(self, requests_per_minute: int = 10):
        self.rpm = requests_per_minute
        self.request_times: deque = deque()
        self.lock = asyncio.Lock()

    async def acquire(self):
        """요청 권한 획득 (필요시 대기)"""
        async with self.lock:
            now = time.time()

            # 1분 이상 된 요청 제거
            while self.request_times and now - self.request_times[0] > 60:
                self.request_times.popleft()

            # RPM 제한 체크
            if len(self.request_times) >= self.rpm:
                wait_time = 60 - (now - self.request_times[0])
                if wait_time > 0:
                    logger.debug(f"Rate limit 대기: {wait_time:.1f}초")
                    await asyncio.sleep(wait_time)

            self.request_times.append(time.time())


class GeminiClient:
    """Gemini API 클라이언트 (새 SDK)"""

    def __init__(self, api_key: str | None = None):
        """
        Args:
            api_key: Gemini API 키 (None이면 환경변수에서 로드)
        """
        settings = get_settings()
        self.api_key = api_key or settings.gemini_api_key
        self.model_name = settings.gemini_model

        if not self.api_key:
            logger.warning("Gemini API 키가 설정되지 않음")
            self.client = None
        else:
            self.client = genai.Client(api_key=self.api_key)
            logger.info(f"Gemini 모델 초기화: {self.model_name}")

        # Rate Limiter
        self.rate_limiter = RateLimiter(settings.gemini_rpm_limit)

        # 통계
        self.total_requests = 0
        self.total_tokens = 0

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_output_tokens: int = 8000,
        max_retries: int = 3
    ) -> str | None:
        """텍스트 생성

        Args:
            prompt: 프롬프트
            temperature: 온도 (0.0-1.0)
            max_output_tokens: 최대 출력 토큰 수
            max_retries: 최대 재시도 횟수

        Returns:
            생성된 텍스트 또는 None
        """
        if not self.client:
            logger.error("Gemini 클라이언트가 초기화되지 않음")
            return None

        for attempt in range(max_retries):
            try:
                # Rate Limiting
                await self.rate_limiter.acquire()

                # API 호출 (동기 함수를 비동기로 실행)
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=temperature,
                        max_output_tokens=max_output_tokens,
                    )
                )

                self.total_requests += 1

                # 토큰 사용량 기록
                if hasattr(response, "usage_metadata") and response.usage_metadata:
                    if hasattr(response.usage_metadata, "total_token_count"):
                        self.total_tokens += response.usage_metadata.total_token_count

                # 응답 텍스트 반환
                if response and response.text:
                    return response.text

                # 응답이 없는 경우
                logger.warning(f"응답 없음 - response: {response}")
                return None

            except Exception as e:
                error_msg = str(e).lower()

                # 429 에러 (Rate Limit)
                if "429" in error_msg or "quota" in error_msg or "rate" in error_msg:
                    wait_time = (2 ** attempt) * 10  # 10, 20, 40초
                    logger.warning(f"Rate limit 초과, {wait_time}초 대기 후 재시도")
                    await asyncio.sleep(wait_time)
                    continue

                # 기타 에러
                logger.error(f"Gemini API 오류 (시도 {attempt + 1}/{max_retries}): {e}")

                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    return None

        return None

    def get_stats(self) -> dict:
        """API 사용 통계 반환"""
        return {
            "total_requests": self.total_requests,
            "total_tokens": self.total_tokens
        }
