// 뉴스 브리핑 데이터 타입 정의

export interface NewsArticle {
  id: string;
  title: string;
  original_title?: string;
  url: string;
  source: string;
  published_at: string;
  summary: {
    phenomenon: string;
    cause: string;
    outlook: string;
  };
  sentiment: "positive" | "negative" | "neutral";
  keywords: string[];
  language: "ko" | "en";
  category: "domestic" | "international";
}

// AI가 생성한 종합 브리핑 내용
export interface BriefingContent {
  // 오프닝 인사 (예: "오늘의 기후 브리핑을 시작하겠습니다.")
  opening: string;
  // 본문 섹션들 (각 섹션에 인용 포함)
  sections: BriefingSection[];
  // 마무리 (예: "이상으로 오늘의 브리핑을 마칩니다.")
  closing: string;
}

export interface BriefingSection {
  title: string; // 섹션 제목 (예: "기온 상승 관련 소식", "정책 동향")
  content: string; // 본문 내용 (인용 번호 [1], [2] 포함)
  tone: "urgent" | "positive" | "neutral"; // 톤
}

export interface DailyBriefing {
  date: string;
  generated_at: string;
  // AI 종합 브리핑
  briefing: BriefingContent;
  // 인용된 기사들 (번호순)
  articles: NewsArticle[];
  summary: {
    total_count: number;
    domestic_count: number;
    international_count: number;
    top_keywords: string[];
    sentiment_breakdown: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
}

export interface BriefingIndex {
  dates: string[];
  latest: string;
}
