"""NSIDC 북극 해빙 데이터 수집 모듈

National Snow and Ice Data Center - Sea Ice Index
https://nsidc.org/data/seaice_index/
"""
from dataclasses import dataclass
from datetime import datetime
from io import StringIO

import aiohttp
import pandas as pd

from ...utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class IceExtentRecord:
    """해빙 면적 레코드"""
    year: int
    month: int
    day: int
    extent: float  # 백만 km²


class NSIDCIceCollector:
    """NSIDC 북극 해빙 데이터 수집기"""

    # 북반구 일별 해빙 면적 (v4.0 - 2025년 기준 최신)
    SEA_ICE_URLS = [
        "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv",
    ]

    # User-Agent 헤더
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (compatible; ClimateInsight/1.0; +https://github.com/climate-insight)"
    }

    def __init__(self):
        self.source_name = "NSIDC"

    async def collect(self) -> dict:
        """북극 해빙 면적 데이터 수집

        Returns:
            해빙 데이터 딕셔너리
        """
        logger.info(f"[{self.source_name}] 해빙 데이터 수집 시작")

        content = None
        used_url = None

        try:
            async with aiohttp.ClientSession(headers=self.HEADERS) as session:
                # 여러 URL 시도
                for url in self.SEA_ICE_URLS:
                    try:
                        async with session.get(
                            url,
                            timeout=aiohttp.ClientTimeout(total=60)
                        ) as response:
                            if response.status == 200:
                                content = await response.text()
                                used_url = url
                                break
                            else:
                                logger.debug(f"[{self.source_name}] {url} -> HTTP {response.status}")
                    except Exception as e:
                        logger.debug(f"[{self.source_name}] {url} -> {e}")
                        continue

                if not content:
                    logger.error(f"[{self.source_name}] 모든 URL 실패")
                    return {}

            records = self._parse_csv(content)

            if not records:
                logger.warning(f"[{self.source_name}] 파싱된 데이터 없음")
                return {}

            # 최신 데이터
            latest = records[-1]

            # 월별 평균 계산
            monthly_avg = self._calculate_monthly_averages(records)

            # 연도별 최소값 (9월 기준)
            annual_minimum = self._calculate_annual_minimum(records)

            result = {
                "type": "arctic_sea_ice",
                "source": self.source_name,
                "region": "Northern Hemisphere",
                "source_url": used_url,
                "collected_at": datetime.utcnow().isoformat(),
                "unit": "million_square_kilometers",
                "latest": {
                    "date": f"{latest.year}-{latest.month:02d}-{latest.day:02d}",
                    "extent": latest.extent
                },
                "daily_data": [
                    {
                        "date": f"{r.year}-{r.month:02d}-{r.day:02d}",
                        "extent": r.extent
                    }
                    for r in records[-30:]  # 최근 30일
                ],
                "monthly_averages": monthly_avg[-24:],  # 최근 2년
                "annual_minimum": annual_minimum[-10:]  # 최근 10년 9월 최소값
            }

            logger.info(
                f"[{self.source_name}] 수집 완료: "
                f"최신 {latest.year}-{latest.month:02d}-{latest.day:02d} "
                f"({latest.extent:.2f} M km²)"
            )

            return result

        except Exception as e:
            logger.error(f"[{self.source_name}] 수집 실패: {e}")
            return {}

    def _parse_csv(self, content: str) -> list[IceExtentRecord]:
        """CSV 파싱"""
        try:
            df = pd.read_csv(
                StringIO(content),
                skipinitialspace=True
            )

            # 컬럼명 정리
            df.columns = df.columns.str.strip()

            records = []
            for _, row in df.iterrows():
                try:
                    extent = float(row["Extent"])
                    if extent <= 0:  # 결측치 제외
                        continue

                    records.append(IceExtentRecord(
                        year=int(row["Year"]),
                        month=int(row["Month"]),
                        day=int(row["Day"]),
                        extent=extent
                    ))
                except (ValueError, KeyError):
                    continue

            return records

        except Exception as e:
            logger.error(f"CSV 파싱 실패: {e}")
            return []

    def _calculate_monthly_averages(
        self,
        records: list[IceExtentRecord]
    ) -> list[dict]:
        """월별 평균 계산"""
        monthly_data = {}

        for r in records:
            key = (r.year, r.month)
            if key not in monthly_data:
                monthly_data[key] = []
            monthly_data[key].append(r.extent)

        result = []
        for (year, month), values in sorted(monthly_data.items()):
            avg = sum(values) / len(values)
            result.append({
                "year": year,
                "month": month,
                "extent": round(avg, 2)
            })

        return result

    def _calculate_annual_minimum(
        self,
        records: list[IceExtentRecord]
    ) -> list[dict]:
        """연도별 9월 최소값 계산 (해빙 최소 시기)"""
        yearly_sep = {}

        for r in records:
            if r.month == 9:  # 9월만
                if r.year not in yearly_sep:
                    yearly_sep[r.year] = []
                yearly_sep[r.year].append(r.extent)

        result = []
        for year in sorted(yearly_sep.keys()):
            min_extent = min(yearly_sep[year])
            result.append({
                "year": year,
                "minimum_extent": round(min_extent, 2)
            })

        return result
