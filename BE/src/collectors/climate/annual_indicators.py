"""연간 기후 지표 수집 모듈

Berkeley Earth 기온, 해수면 상승, 엘니뇨/라니냐 데이터를 수집합니다.
모두 연간 데이터로, 시각화용 기본 지표입니다.
"""
import re
from dataclasses import dataclass
from datetime import datetime
from io import StringIO

import aiohttp

from ...utils.logger import get_logger

logger = get_logger(__name__)


class BerkeleyEarthCollector:
    """Berkeley Earth 전지구 기온 수집기 (NASA GISS 대체)"""

    URL = "https://berkeley-earth-temperature.s3.us-west-1.amazonaws.com/Global/Land_and_Ocean_summary.txt"

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (compatible; ClimateInsight/1.0)"
    }

    def __init__(self):
        self.source_name = "Berkeley_Earth"

    async def collect(self) -> dict:
        """연간 기온 편차 데이터 수집"""
        logger.info(f"[{self.source_name}] 기온 데이터 수집 시작")

        try:
            async with aiohttp.ClientSession(headers=self.HEADERS) as session:
                async with session.get(
                    self.URL,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status != 200:
                        logger.error(f"[{self.source_name}] HTTP {response.status}")
                        return {}
                    content = await response.text()

            records = self._parse_data(content)

            if not records:
                logger.warning(f"[{self.source_name}] 파싱된 데이터 없음")
                return {}

            latest = records[-1]

            result = {
                "type": "global_temperature",
                "source": self.source_name,
                "source_url": self.URL,
                "collected_at": datetime.utcnow().isoformat(),
                "unit": "degrees_celsius",
                "baseline": "1951-1980 average",
                "latest": {
                    "year": latest["year"],
                    "anomaly": latest["anomaly"]
                },
                "annual_data": records[-50:]  # 최근 50년
            }

            logger.info(
                f"[{self.source_name}] 수집 완료: "
                f"{latest['year']}년 ({latest['anomaly']:+.2f}°C)"
            )
            return result

        except Exception as e:
            logger.error(f"[{self.source_name}] 수집 실패: {e}")
            return {}

    def _parse_data(self, content: str) -> list[dict]:
        """Berkeley Earth TXT 파싱"""
        records = []

        for line in content.split("\n"):
            line = line.strip()
            if not line or line.startswith("%"):
                continue

            parts = line.split()
            if len(parts) >= 2:
                try:
                    year = int(parts[0])
                    anomaly = float(parts[1])
                    records.append({
                        "year": year,
                        "anomaly": round(anomaly, 3)
                    })
                except (ValueError, IndexError):
                    continue

        return records


class SeaLevelCollector:
    """NOAA 전지구 해수면 상승 수집기"""

    URL = "https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_free_ref_90.csv"

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (compatible; ClimateInsight/1.0)"
    }

    def __init__(self):
        self.source_name = "NOAA_SLR"

    async def collect(self) -> dict:
        """해수면 상승 데이터 수집 (연간 평균)"""
        logger.info(f"[{self.source_name}] 해수면 데이터 수집 시작")

        try:
            async with aiohttp.ClientSession(headers=self.HEADERS) as session:
                async with session.get(
                    self.URL,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status != 200:
                        logger.error(f"[{self.source_name}] HTTP {response.status}")
                        return {}
                    content = await response.text()

            annual_data = self._parse_and_aggregate(content)

            if not annual_data:
                logger.warning(f"[{self.source_name}] 파싱된 데이터 없음")
                return {}

            latest = annual_data[-1]

            result = {
                "type": "sea_level",
                "source": self.source_name,
                "source_url": self.URL,
                "collected_at": datetime.utcnow().isoformat(),
                "unit": "millimeters",
                "baseline": "1993-2010 average",
                "trend_mm_per_year": 3.11,
                "latest": {
                    "year": latest["year"],
                    "anomaly_mm": latest["anomaly_mm"]
                },
                "annual_data": annual_data
            }

            logger.info(
                f"[{self.source_name}] 수집 완료: "
                f"{latest['year']}년 ({latest['anomaly_mm']:+.1f}mm)"
            )
            return result

        except Exception as e:
            logger.error(f"[{self.source_name}] 수집 실패: {e}")
            return {}

    def _parse_and_aggregate(self, content: str) -> list[dict]:
        """CSV 파싱 및 연간 평균 계산"""
        yearly_data = {}

        for line in content.split("\n"):
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("year"):
                continue

            parts = line.split(",")
            if len(parts) >= 2:
                try:
                    year_decimal = float(parts[0])
                    year = int(year_decimal)

                    # 첫 번째 non-empty 값 찾기
                    value = None
                    for v in parts[1:]:
                        if v.strip():
                            value = float(v)
                            break

                    if value is not None:
                        if year not in yearly_data:
                            yearly_data[year] = []
                        yearly_data[year].append(value)
                except (ValueError, IndexError):
                    continue

        # 연간 평균 계산
        result = []
        for year in sorted(yearly_data.keys()):
            values = yearly_data[year]
            if values:
                avg = sum(values) / len(values)
                result.append({
                    "year": year,
                    "anomaly_mm": round(avg, 2)
                })

        return result


class ENSOCollector:
    """NOAA 엘니뇨/라니냐 (ONI) 수집기"""

    URL = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (compatible; ClimateInsight/1.0)"
    }

    def __init__(self):
        self.source_name = "NOAA_ENSO"

    async def collect(self) -> dict:
        """엘니뇨/라니냐 ONI 지수 수집"""
        logger.info(f"[{self.source_name}] ENSO 데이터 수집 시작")

        try:
            async with aiohttp.ClientSession(headers=self.HEADERS) as session:
                async with session.get(
                    self.URL,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status != 200:
                        logger.error(f"[{self.source_name}] HTTP {response.status}")
                        return {}
                    content = await response.text()

            annual_data = self._parse_oni(content)

            if not annual_data:
                logger.warning(f"[{self.source_name}] 파싱된 데이터 없음")
                return {}

            latest = annual_data[-1]

            result = {
                "type": "enso_oni",
                "source": self.source_name,
                "source_url": self.URL,
                "collected_at": datetime.utcnow().isoformat(),
                "unit": "degrees_celsius",
                "description": "Oceanic Niño Index (3-month running mean SST anomaly in Niño 3.4 region)",
                "thresholds": {
                    "el_nino": ">= +0.5°C for 5+ consecutive months",
                    "la_nina": "<= -0.5°C for 5+ consecutive months"
                },
                "latest": latest,
                "annual_data": annual_data[-30:]  # 최근 30년
            }

            status = self._get_enso_status(latest["avg_oni"])
            logger.info(
                f"[{self.source_name}] 수집 완료: "
                f"{latest['year']}년 (ONI: {latest['avg_oni']:+.2f}, {status})"
            )
            return result

        except Exception as e:
            logger.error(f"[{self.source_name}] 수집 실패: {e}")
            return {}

    def _parse_oni(self, content: str) -> list[dict]:
        """ONI 텍스트 파싱 및 연간 평균 계산

        형식: SEAS  YR   TOTAL   ANOM
        예: DJF 1950  24.72  -1.53
        """
        yearly_data = {}

        for line in content.split("\n"):
            line = line.strip()
            if not line or line.startswith("SEAS"):
                continue

            parts = line.split()
            if len(parts) >= 4:
                try:
                    year = int(parts[1])  # 2번째 컬럼이 연도
                    oni = float(parts[3])  # 4번째 컬럼이 ANOM (ONI)

                    if year not in yearly_data:
                        yearly_data[year] = []
                    yearly_data[year].append(oni)
                except (ValueError, IndexError):
                    continue

        # 연간 평균 및 상태 결정
        result = []
        for year in sorted(yearly_data.keys()):
            values = yearly_data[year]
            if values:
                avg = sum(values) / len(values)
                result.append({
                    "year": year,
                    "avg_oni": round(avg, 2),
                    "status": self._get_enso_status(avg)
                })

        return result

    def _get_enso_status(self, oni: float) -> str:
        """ONI 값으로 ENSO 상태 판정"""
        if oni >= 0.5:
            if oni >= 1.5:
                return "strong_el_nino"
            elif oni >= 1.0:
                return "moderate_el_nino"
            return "weak_el_nino"
        elif oni <= -0.5:
            if oni <= -1.5:
                return "strong_la_nina"
            elif oni <= -1.0:
                return "moderate_la_nina"
            return "weak_la_nina"
        return "neutral"
