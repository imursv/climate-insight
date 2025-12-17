import { API_BASE, fetchOptions } from "./config";

export interface NewsIndex {
  last_updated: string;
  available_dates: string[];
  statistics: {
    total_articles: number;
    date_range: {
      start: string | null;
      end: string | null;
    };
    sources_distribution: Record<string, number>;
    sentiment_distribution: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
}

export interface NewsData {
  date: string;
  metadata: {
    collected_at: string;
    total_articles: number;
    sources: {
      korean: number;
      international: number;
    };
    sentiment_distribution: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  articles: Array<{
    title: string;
    link: string;
    source: string;
    language: string;
    published_at: string;
    summary?: {
      phenomenon: string;
      cause: string;
      outlook: string;
    };
    sentiment?: {
      sentiment: "positive" | "negative" | "neutral";
    };
    keywords?: {
      keywords: string[];
    };
    translation?: {
      title_ko: string;
    };
  }>;
}

/**
 * 뉴스 인덱스 조회
 */
export async function getNewsIndex(): Promise<NewsIndex | null> {
  try {
    const res = await fetch(`${API_BASE}/news/index.json`, fetchOptions);

    if (!res.ok) {
      console.warn("뉴스 인덱스를 불러올 수 없습니다:", res.status);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("뉴스 인덱스 조회 오류:", error);
    return null;
  }
}

/**
 * 특정 날짜의 뉴스 조회
 */
export async function getNews(date: string): Promise<NewsData | null> {
  try {
    const res = await fetch(`${API_BASE}/news/${date}.json`, fetchOptions);

    if (!res.ok) {
      console.warn(`뉴스 데이터를 불러올 수 없습니다 (${date}):`, res.status);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error(`뉴스 조회 오류 (${date}):`, error);
    return null;
  }
}
