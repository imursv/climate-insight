"""NOAA CO2 농도 데이터 수집 모듈

NOAA Global Monitoring Laboratory - Mauna Loa CO2
https://gml.noaa.gov/ccgg/trends/
"""
from dataclasses import dataclass
from datetime import datetime
from io import StringIO

import aiohttp

from ...utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class CO2Record:
    """CO2 농도 레코드"""
    year: int
    month: int
    day: int | None
    co2_ppm: float


class NOAACO2Collector:
    """NOAA CO2 농도 데이터 수집기"""

    # Mauna Loa 일별 CO2 데이터
    MLO_DAILY_URL = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_daily_mlo.csv"

    # 전지구 월별 평균
    GLOBAL_MONTHLY_URL = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_gl.csv"

    def __init__(self):
        self.source_name = "NOAA_GML"

    async def collect(self) -> dict:
        """CO2 농도 데이터 수집

        Returns:
            CO2 데이터 딕셔너리
        """
        logger.info(f"[{self.source_name}] CO2 데이터 수집 시작")

        try:
            async with aiohttp.ClientSession() as session:
                # 일별 데이터 수집
                daily_records = await self._fetch_daily_data(session)

                # 월별 전지구 평균 수집
                monthly_records = await self._fetch_monthly_data(session)

            if not daily_records and not monthly_records:
                logger.warning(f"[{self.source_name}] 데이터 없음")
                return {}

            # 최신 일별 데이터
            latest_daily = daily_records[-1] if daily_records else None

            # 최신 월별 데이터
            latest_monthly = monthly_records[-1] if monthly_records else None

            result = {
                "type": "co2_level",
                "source": self.source_name,
                "location": "Mauna Loa Observatory, Hawaii",
                "source_url": self.MLO_DAILY_URL,
                "collected_at": datetime.utcnow().isoformat(),
                "unit": "ppm",
                "latest_daily": {
                    "date": f"{latest_daily.year}-{latest_daily.month:02d}-{latest_daily.day:02d}",
                    "co2_ppm": latest_daily.co2_ppm
                } if latest_daily else None,
                "latest_monthly": {
                    "year": latest_monthly.year,
                    "month": latest_monthly.month,
                    "co2_ppm": latest_monthly.co2_ppm
                } if latest_monthly else None,
                "daily_data": [
                    {
                        "date": f"{r.year}-{r.month:02d}-{r.day:02d}",
                        "co2_ppm": r.co2_ppm
                    }
                    for r in daily_records[-30:]  # 최근 30일
                ],
                "monthly_data": [
                    {
                        "year": r.year,
                        "month": r.month,
                        "co2_ppm": r.co2_ppm
                    }
                    for r in monthly_records[-24:]  # 최근 2년
                ]
            }

            if latest_daily:
                logger.info(
                    f"[{self.source_name}] 수집 완료: "
                    f"최신 {latest_daily.year}-{latest_daily.month:02d}-{latest_daily.day:02d} "
                    f"({latest_daily.co2_ppm:.2f} ppm)"
                )

            return result

        except Exception as e:
            logger.error(f"[{self.source_name}] 수집 실패: {e}")
            return {}

    async def _fetch_daily_data(self, session: aiohttp.ClientSession) -> list[CO2Record]:
        """일별 CO2 데이터 수집"""
        try:
            async with session.get(
                self.MLO_DAILY_URL,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                if response.status != 200:
                    logger.warning(f"일별 데이터 HTTP {response.status}")
                    return []
                content = await response.text()

            return self._parse_daily_csv(content)

        except Exception as e:
            logger.error(f"일별 데이터 수집 실패: {e}")
            return []

    async def _fetch_monthly_data(self, session: aiohttp.ClientSession) -> list[CO2Record]:
        """월별 전지구 평균 데이터 수집"""
        try:
            async with session.get(
                self.GLOBAL_MONTHLY_URL,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                if response.status != 200:
                    logger.warning(f"월별 데이터 HTTP {response.status}")
                    return []
                content = await response.text()

            return self._parse_monthly_csv(content)

        except Exception as e:
            logger.error(f"월별 데이터 수집 실패: {e}")
            return []

    def _parse_daily_csv(self, content: str) -> list[CO2Record]:
        """일별 CSV 파싱 (NOAA 형식: # 주석으로 시작)"""
        records = []

        for line in content.split("\n"):
            # 주석 및 빈 줄 스킵
            if not line or line.startswith("#"):
                continue

            parts = line.strip().split(",")
            if len(parts) < 5:
                continue

            try:
                year = int(parts[0])
                month = int(parts[1])
                day = int(parts[2])
                co2_ppm = float(parts[4])

                # 결측치 제외 (-999.99)
                if co2_ppm < 0:
                    continue

                records.append(CO2Record(
                    year=year,
                    month=month,
                    day=day,
                    co2_ppm=co2_ppm
                ))
            except (ValueError, IndexError):
                continue

        return records

    def _parse_monthly_csv(self, content: str) -> list[CO2Record]:
        """월별 CSV 파싱"""
        records = []

        for line in content.split("\n"):
            if not line or line.startswith("#"):
                continue

            parts = line.strip().split(",")
            if len(parts) < 4:
                continue

            try:
                year = int(parts[0])
                month = int(parts[1])
                co2_ppm = float(parts[3])  # 월 평균

                if co2_ppm < 0:
                    continue

                records.append(CO2Record(
                    year=year,
                    month=month,
                    day=None,
                    co2_ppm=co2_ppm
                ))
            except (ValueError, IndexError):
                continue

        return records
