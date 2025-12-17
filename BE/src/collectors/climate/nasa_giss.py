"""NASA GISS 전지구 기온 데이터 수집 모듈

NASA Goddard Institute for Space Studies (GISS) Surface Temperature Analysis
https://data.giss.nasa.gov/gistemp/
"""
from dataclasses import dataclass
from datetime import datetime
from io import StringIO

import aiohttp
import pandas as pd

from ...utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class TemperatureRecord:
    """기온 데이터 레코드"""
    year: int
    month: int
    anomaly: float  # 기온 편차 (기준: 1951-1980 평균)


class NASAGISSCollector:
    """NASA GISS 전지구 기온 데이터 수집기"""

    # NASA GISS Global Temperature CSV
    GISS_GLOBAL_URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"

    # User-Agent 헤더 (NASA 서버 접근용)
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (compatible; ClimateInsight/1.0; +https://github.com/climate-insight)"
    }

    def __init__(self):
        self.source_name = "NASA_GISS"

    async def collect(self) -> dict:
        """전지구 기온 데이터 수집

        Returns:
            기온 데이터 딕셔너리
        """
        logger.info(f"[{self.source_name}] 기온 데이터 수집 시작")

        try:
            async with aiohttp.ClientSession(headers=self.HEADERS) as session:
                async with session.get(
                    self.GISS_GLOBAL_URL,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status != 200:
                        logger.error(f"[{self.source_name}] HTTP {response.status}")
                        return {}
                    content = await response.text()

            records = self._parse_csv(content)

            if not records:
                logger.warning(f"[{self.source_name}] 파싱된 데이터 없음")
                return {}

            # 최신 데이터
            latest = records[-1]

            # 연도별 평균 계산 (최근 10년)
            annual_data = self._calculate_annual_averages(records)

            result = {
                "type": "global_temperature",
                "source": self.source_name,
                "source_url": self.GISS_GLOBAL_URL,
                "collected_at": datetime.utcnow().isoformat(),
                "unit": "degrees_celsius",
                "baseline": "1951-1980 average",
                "latest": {
                    "year": latest.year,
                    "month": latest.month,
                    "anomaly": latest.anomaly
                },
                "monthly_data": [
                    {"year": r.year, "month": r.month, "anomaly": r.anomaly}
                    for r in records[-24:]  # 최근 2년
                ],
                "annual_averages": annual_data
            }

            logger.info(
                f"[{self.source_name}] 수집 완료: "
                f"최신 {latest.year}-{latest.month} ({latest.anomaly:+.2f}°C)"
            )
            return result

        except Exception as e:
            logger.error(f"[{self.source_name}] 수집 실패: {e}")
            return {}

    def _parse_csv(self, content: str) -> list[TemperatureRecord]:
        """NASA GISS CSV 파싱

        Args:
            content: CSV 내용

        Returns:
            TemperatureRecord 리스트
        """
        try:
            # 첫 번째 행은 메타데이터이므로 스킵
            df = pd.read_csv(
                StringIO(content),
                skiprows=1,
                na_values=["***"]
            )

            records = []
            months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

            for _, row in df.iterrows():
                year = int(row["Year"])
                for i, month_name in enumerate(months, 1):
                    if month_name in row and pd.notna(row[month_name]):
                        try:
                            anomaly = float(row[month_name])
                            records.append(TemperatureRecord(
                                year=year,
                                month=i,
                                anomaly=anomaly
                            ))
                        except (ValueError, TypeError):
                            continue

            return records

        except Exception as e:
            logger.error(f"CSV 파싱 실패: {e}")
            return []

    def _calculate_annual_averages(
        self,
        records: list[TemperatureRecord],
        years: int = 10
    ) -> list[dict]:
        """연도별 평균 계산

        Args:
            records: 월별 레코드 리스트
            years: 계산할 연도 수

        Returns:
            연도별 평균 리스트
        """
        # 연도별 그룹화
        yearly_data = {}
        for r in records:
            if r.year not in yearly_data:
                yearly_data[r.year] = []
            yearly_data[r.year].append(r.anomaly)

        # 최근 N년 평균 계산
        sorted_years = sorted(yearly_data.keys(), reverse=True)[:years]
        result = []

        for year in sorted(sorted_years):
            values = yearly_data[year]
            if len(values) >= 6:  # 최소 6개월 데이터가 있어야 계산
                avg = sum(values) / len(values)
                result.append({
                    "year": year,
                    "anomaly": round(avg, 2),
                    "months_count": len(values)
                })

        return result
