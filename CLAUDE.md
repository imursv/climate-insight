# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Climate Insight** - 매일 아침 Gemini가 분석해주는 기후변화 뉴스 브리핑 플랫폼

핵심 기술:
- GitHub Actions: 서버리스 자동화 (매일 06:00 KST)
- Gemini API: 뉴스 요약, 번역, 감성분석, 키워드 추출
- Next.js: 정적 사이트 생성 (SSG)

## Project Structure

```
├── BE/                      # Backend - Python 데이터 파이프라인
│   ├── src/
│   │   ├── config/          # 설정 (settings.py, rss_sources.py)
│   │   ├── collectors/      # 데이터 수집기
│   │   │   ├── news/        # RSS 뉴스 수집
│   │   │   └── climate/     # NASA/NOAA 기후 데이터
│   │   ├── processors/      # Gemini AI 처리
│   │   └── storage/         # JSON 저장
│   └── .github/workflows/   # GitHub Actions
├── FE/                      # Frontend - Next.js (개발 예정)
└── data/                    # 수집된 데이터 (JSON)
    ├── news/                # 일별 뉴스 데이터
    ├── climate/             # 기후 데이터
    └── cache/               # 중복 방지 캐시
```

## Development Commands

### Backend (BE/)

```bash
# 의존성 설치
cd BE && pip install -r requirements.txt

# 파이프라인 실행
python -m src.main --data-dir ../data

# Gemini 스킵 (테스트용)
python -m src.main --skip-gemini --log-level DEBUG

# 특정 데이터 디렉토리 지정
python -m src.main --data-dir /path/to/data
```

### Frontend (FE/) - 개발 예정

```bash
# 프로젝트 생성
npx create-next-app@latest . --typescript --tailwind --app

# 개발 서버
npm run dev

# 빌드
npm run build
```

## Architecture

### 데이터 파이프라인 흐름

```
[GitHub Actions] 매일 06:00 KST
        ↓
[RSS Collector] Google News, BBC, Guardian 등
        ↓
[Climate Collector] NASA GISS, NOAA CO2, NSIDC Ice
        ↓
[Gemini Processor] 요약, 번역, 감성분석, 키워드
        ↓
[JSON Handler] data/ 폴더에 저장
        ↓
[Git Commit] 자동 커밋 및 푸시
```

### 주요 파일

| 파일 | 역할 |
|------|------|
| `BE/src/main.py` | 파이프라인 진입점 |
| `BE/src/collectors/news/rss_collector.py` | RSS 뉴스 수집 |
| `BE/src/processors/gemini_client.py` | Gemini API + Rate Limiter |
| `BE/src/processors/news_processor.py` | 뉴스 AI 분석 |
| `BE/.github/workflows/daily-pipeline.yml` | 자동화 워크플로우 |

## Configuration

### 환경변수 (.env)

```bash
GEMINI_API_KEY=your_api_key    # 필수
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_RPM_LIMIT=10            # Rate limit (분당 요청수)
```

### GitHub Secrets

- `GEMINI_API_KEY`: Gemini API 키 (GitHub Actions용)
