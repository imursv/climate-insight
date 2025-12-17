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
      dates_detail: data.dates_detail,
      total_briefings: data.total_briefings,
    };
  } catch (error) {
    console.error("브리핑 인덱스 조회 오류:", error);
    return null;
  }
}

/**
 * 특정 날짜의 브리핑 조회
 * @param dateOrKey 날짜 (YYYY-MM-DD) 또는 날짜+시간대 (YYYY-MM-DD-morning)
 * @param period 시간대 (morning/afternoon), dateOrKey에 포함되지 않은 경우
 */
export async function getBriefing(
  dateOrKey: string,
  period?: "morning" | "afternoon"
): Promise<DailyBriefing | null> {
  try {
    // dateOrKey가 이미 period를 포함하는 경우 (예: 2025-12-17-morning)
    let filename: string;
    if (dateOrKey.endsWith("-morning") || dateOrKey.endsWith("-afternoon")) {
      filename = dateOrKey;
    } else if (period) {
      filename = `${dateOrKey}-${period}`;
    } else {
      // period가 없으면 afternoon 우선 시도, 없으면 morning
      const afternoonRes = await fetch(
        `${API_BASE}/briefing/${dateOrKey}-afternoon.json`,
        fetchOptions
      );
      if (afternoonRes.ok) {
        return await afternoonRes.json();
      }

      const morningRes = await fetch(
        `${API_BASE}/briefing/${dateOrKey}-morning.json`,
        fetchOptions
      );
      if (morningRes.ok) {
        return await morningRes.json();
      }

      // 기존 형식 (하위 호환)
      filename = dateOrKey;
    }

    const res = await fetch(`${API_BASE}/briefing/${filename}.json`, fetchOptions);

    if (!res.ok) {
      console.warn(`브리핑 데이터를 불러올 수 없습니다 (${filename}):`, res.status);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error(`브리핑 조회 오류 (${dateOrKey}):`, error);
    return null;
  }
}

/**
 * 특정 날짜의 모든 브리핑 조회 (오전+오후)
 */
export async function getBriefingsByDate(date: string): Promise<DailyBriefing[]> {
  const briefings: DailyBriefing[] = [];

  // 오전 브리핑 시도
  const morning = await getBriefing(date, "morning");
  if (morning) briefings.push(morning);

  // 오후 브리핑 시도
  const afternoon = await getBriefing(date, "afternoon");
  if (afternoon) briefings.push(afternoon);

  // 오전/오후 모두 없으면 기존 형식 시도
  if (briefings.length === 0) {
    try {
      const res = await fetch(`${API_BASE}/briefing/${date}.json`, fetchOptions);
      if (res.ok) {
        const data = await res.json();
        briefings.push(data);
      }
    } catch {
      // ignore
    }
  }

  return briefings;
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
