import { DailyBriefing, BriefingIndex } from "@/types/briefing";
import { API_BASE, fetchOptions } from "./config";

/**
 * 브리핑 인덱스 조회
 * 사용 가능한 날짜 목록과 최신 날짜 반환
 */
export async function getBriefingIndex(): Promise<BriefingIndex | null> {
  try {
    const res = await fetch(`${API_BASE}/briefing/index.json`, fetchOptions);

    if (!res.ok) {
      console.warn("브리핑 인덱스를 불러올 수 없습니다:", res.status);
      return null;
    }

    const data = await res.json();

    return {
      dates: data.available_dates || [],
      latest: data.latest || (data.available_dates?.[0] ?? null),
    };
  } catch (error) {
    console.error("브리핑 인덱스 조회 오류:", error);
    return null;
  }
}

/**
 * 특정 날짜의 브리핑 조회
 */
export async function getBriefing(date: string): Promise<DailyBriefing | null> {
  try {
    const res = await fetch(`${API_BASE}/briefing/${date}.json`, fetchOptions);

    if (!res.ok) {
      console.warn(`브리핑 데이터를 불러올 수 없습니다 (${date}):`, res.status);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error(`브리핑 조회 오류 (${date}):`, error);
    return null;
  }
}

/**
 * 오늘 또는 가장 최근의 브리핑 조회
 */
export async function getLatestBriefing(): Promise<DailyBriefing | null> {
  // 먼저 인덱스에서 최신 날짜 확인
  const index = await getBriefingIndex();

  if (index?.latest) {
    return getBriefing(index.latest);
  }

  // 인덱스가 없으면 오늘 날짜로 시도
  const today = new Date().toISOString().split("T")[0];
  const briefing = await getBriefing(today);

  if (briefing) {
    return briefing;
  }

  // 오늘 데이터도 없으면 어제 날짜로 시도
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  return getBriefing(yesterday);
}

/**
 * 최근 N일간의 브리핑 목록 조회
 */
export async function getRecentBriefings(days: number = 30): Promise<DailyBriefing[]> {
  const index = await getBriefingIndex();

  if (!index?.dates.length) {
    return [];
  }

  const recentDates = index.dates.slice(0, days);
  const briefings = await Promise.all(
    recentDates.map((date) => getBriefing(date))
  );

  return briefings.filter((b): b is DailyBriefing => b !== null);
}
