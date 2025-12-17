"""RSS 피드 소스 정의

국내외 기후변화 관련 뉴스 RSS 피드 URL을 정의합니다.
"""

# 기후 관련 키워드 (필터링용)
CLIMATE_KEYWORDS_KO = [
    "기후변화", "기후위기", "지구온난화", "탄소중립", "탄소배출",
    "온실가스", "재생에너지", "넷제로", "그린뉴딜", "친환경",
    "탄소세", "기후협약", "파리협정", "녹색성장", "기후대응",
    "해수면상승", "폭염", "가뭄", "홍수", "태풍", "이상기후",
    "전기차", "태양광", "풍력", "수소에너지", "ESG"
]

CLIMATE_KEYWORDS_EN = [
    "climate change", "climate crisis", "global warming", "carbon neutral",
    "carbon emission", "greenhouse gas", "renewable energy", "net zero",
    "green deal", "sustainability", "paris agreement", "climate action",
    "sea level rise", "extreme weather", "carbon tax", "clean energy",
    "electric vehicle", "solar power", "wind power", "hydrogen energy",
    "climate adaptation", "decarbonization", "IPCC", "COP"
]

# 국내 뉴스 RSS 피드
KOREAN_NEWS_FEEDS = {
    # Google News 한국어 - 기후변화 검색 결과 (가장 안정적)
    "google_climate_ko": "https://news.google.com/rss/search?q=%EA%B8%B0%ED%9B%84%EB%B3%80%ED%99%94&hl=ko&gl=KR&ceid=KR:ko",
    "google_carbon_ko": "https://news.google.com/rss/search?q=%ED%83%84%EC%86%8C%EC%A4%91%EB%A6%BD&hl=ko&gl=KR&ceid=KR:ko",
    "google_energy_ko": "https://news.google.com/rss/search?q=%EC%9E%AC%EC%83%9D%EC%97%90%EB%84%88%EC%A7%80&hl=ko&gl=KR&ceid=KR:ko",

    # 경향신문
    "khan_society": "http://www.khan.co.kr/rss/rssdata/total_news.xml",
}

# 해외 뉴스 RSS 피드
INTERNATIONAL_NEWS_FEEDS = {
    # Google News - Climate (영어, 가장 안정적)
    "google_climate_en": "https://news.google.com/rss/search?q=climate+change&hl=en-US&gl=US&ceid=US:en",
    "google_carbon_en": "https://news.google.com/rss/search?q=carbon+neutral+energy&hl=en-US&gl=US&ceid=US:en",

    # BBC Science & Environment
    "bbc_science": "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",

    # The Guardian - Climate Crisis
    "guardian_climate": "https://www.theguardian.com/environment/climate-crisis/rss",

    # Carbon Brief (기후전문매체)
    "carbonbrief": "https://www.carbonbrief.org/feed/",

    # Reuters Environment
    "reuters_env": "https://news.google.com/rss/search?q=site:reuters.com+climate&hl=en-US&gl=US",
}

# 전체 피드 통합
ALL_FEEDS = {
    "korean": KOREAN_NEWS_FEEDS,
    "international": INTERNATIONAL_NEWS_FEEDS,
}


def get_all_feeds() -> dict:
    """모든 RSS 피드 URL 반환"""
    return ALL_FEEDS


def get_korean_feeds() -> dict:
    """국내 뉴스 RSS 피드 URL 반환"""
    return KOREAN_NEWS_FEEDS


def get_international_feeds() -> dict:
    """해외 뉴스 RSS 피드 URL 반환"""
    return INTERNATIONAL_NEWS_FEEDS


def get_climate_keywords(language: str = "ko") -> list:
    """기후 관련 키워드 목록 반환

    Args:
        language: 언어 코드 ('ko' 또는 'en')

    Returns:
        키워드 리스트
    """
    if language == "ko":
        return CLIMATE_KEYWORDS_KO
    return CLIMATE_KEYWORDS_EN
