"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRecentBriefings } from "@/lib/api/briefing";
import { DailyBriefing } from "@/types/briefing";

interface ArchiveItem {
  date: string;
  articleCount: number;
  topKeywords: string[];
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  highlight?: string;
}

// 브리핑 데이터를 아카이브 아이템으로 변환
function briefingToArchiveItem(briefing: DailyBriefing): ArchiveItem {
  // 첫 번째 섹션의 제목에서 하이라이트 추출 (이모지 제거)
  const firstSection = briefing.briefing.sections[0];
  const highlight = firstSection?.title.replace(/^[^\w가-힣]+/, "").trim();

  return {
    date: briefing.date,
    articleCount: briefing.summary.total_count,
    topKeywords: briefing.summary.top_keywords,
    sentiment: briefing.summary.sentiment_breakdown,
    highlight: highlight || undefined,
  };
}

function MonthGroup({ month, items }: { month: string; items: ArchiveItem[] }) {
  return (
    <div className="mb-10 md:mb-14">
      <h3 className="font-display text-lg md:text-xl font-bold mb-5 md:mb-6 flex flex-wrap items-center gap-2 md:gap-3">
        <span className="text-gradient-warming">{month}</span>
        <span className="text-sm font-normal text-[#5a5a70]">
          {items.length}일 · {items.reduce((acc, item) => acc + item.articleCount, 0)}건
        </span>
      </h3>

      <div className="space-y-4 md:space-y-5">
        {items.map((item, index) => (
          <ArchiveCard key={item.date} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}

function ArchiveCard({ item, index }: { item: ArchiveItem; index: number }) {
  const date = new Date(item.date);
  const dayOfWeek = date.toLocaleDateString("ko-KR", { weekday: "short" });
  const day = date.getDate();
  const isToday = item.date === new Date().toISOString().split("T")[0];

  return (
    <Link
      href={`/archive/${item.date}`}
      className={`group flex items-stretch gap-3 md:gap-4 bg-[#1a1a24] rounded-xl md:rounded-2xl border border-[#2a2a38] overflow-hidden card-hover animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}
    >
      {/* Date Column */}
      <div className={`flex flex-col items-center justify-center w-16 md:w-24 py-4 md:py-5 ${
        isToday ? "bg-gradient-to-b from-[#ff4d4d]/20 to-transparent" : "bg-[#12121a]"
      }`}>
        <span className={`text-[10px] md:text-xs ${isToday ? "text-[#ff4d4d]" : "text-[#5a5a70]"}`}>
          {dayOfWeek}
        </span>
        <span className={`text-xl md:text-3xl font-bold ${isToday ? "text-[#ff4d4d]" : "text-white"}`}>
          {day}
        </span>
        {isToday && (
          <span className="text-[10px] text-[#ff4d4d] font-medium mt-1 animate-pulse">TODAY</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 py-4 pr-4 md:py-5 md:pr-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <span className="text-base md:text-lg font-semibold text-white group-hover:text-[#4dc3ff] transition-colors">
              {item.articleCount}건의 뉴스
            </span>
            {/* Sentiment Mini Bar */}
            <div className="flex h-2 w-16 rounded-full overflow-hidden bg-[#2a2a38]">
              <div
                className="bg-[#7dff7d]"
                style={{ width: `${(item.sentiment.positive / item.articleCount) * 100}%` }}
              />
              <div
                className="bg-[#ff4d4d]"
                style={{ width: `${(item.sentiment.negative / item.articleCount) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-[#5a5a70] group-hover:text-[#8888a0] transition-colors text-lg hidden sm:block">
            →
          </span>
        </div>

        {item.highlight && (
          <p className="text-sm text-[#8888a0] mb-3 line-clamp-1">
            🔥 {item.highlight}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {item.topKeywords.slice(0, 3).map((keyword) => (
            <span
              key={keyword}
              className="px-2 py-1 text-xs bg-[#2a2a38] text-[#8888a0] rounded group-hover:bg-[#3a3a4a] transition-colors"
            >
              #{keyword}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function ArchivePage() {
  const [archive, setArchive] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArchive() {
      try {
        setLoading(true);
        setError(null);

        const briefings = await getRecentBriefings(90); // 최근 90일

        if (briefings.length > 0) {
          const items = briefings.map(briefingToArchiveItem);
          setArchive(items);
        } else {
          setError("아카이브 데이터가 없습니다.");
        }
      } catch (err) {
        console.error("아카이브 로드 오류:", err);
        setError("아카이브를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchArchive();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2a2a38] border-t-[#ffb84d] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8888a0]">아카이브 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || archive.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-[#2a2a38] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📂</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">아카이브가 비어있습니다</h2>
          <p className="text-[#8888a0] mb-6">
            {error || "아직 저장된 브리핑이 없습니다. 백엔드 파이프라인이 실행되면 매일 브리핑이 자동으로 저장됩니다."}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/"
              className="px-4 py-2 bg-[#2a2a38] text-white rounded-lg hover:bg-[#3a3a4a] transition-colors"
            >
              대시보드로
            </Link>
            <Link
              href="/briefing"
              className="px-4 py-2 bg-[#ffb84d]/10 text-[#ffb84d] border border-[#ffb84d]/30 rounded-lg hover:bg-[#ffb84d]/20 transition-colors"
            >
              오늘 브리핑
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 월별로 그룹화
  const groupedByMonth = archive.reduce((acc, item) => {
    const date = new Date(item.date);
    const monthKey = date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
    });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(item);
    return acc;
  }, {} as Record<string, ArchiveItem[]>);

  const totalArticles = archive.reduce((acc, item) => acc + item.articleCount, 0);

  // 전체 키워드 집계
  const keywordCounts = archive.reduce((acc, item) => {
    item.topKeywords.forEach((keyword) => {
      acc[keyword] = (acc[keyword] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#12121a] to-[#0a0a0f]" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ffb84d] rounded-full filter blur-[150px]" />
        </div>

        <div className="relative container-custom !py-8 md:!py-16 lg:!py-20">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#5a5a70] mb-6 md:mb-8 animate-fade-in">
            <Link href="/" className="hover:text-white transition-colors">
              대시보드
            </Link>
            <span>→</span>
            <span className="text-[#8888a0]">아카이브</span>
          </div>

          <div className="max-w-3xl">
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-6 md:mb-8 animate-fade-in-up stagger-1">
              브리핑{" "}
              <span className="text-gradient-warming">아카이브</span>
            </h1>

            <p className="text-base md:text-lg text-[#8888a0] mb-8 md:mb-10 animate-fade-in-up stagger-2 leading-relaxed">
              매일 수집된 기후 뉴스 브리핑을 날짜별로 확인할 수 있습니다.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 md:gap-10 animate-fade-in-up stagger-3">
              <div>
                <div className="text-2xl md:text-3xl font-bold text-white">{archive.length}</div>
                <div className="text-xs md:text-sm text-[#5a5a70] mt-1">일간 기록</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-[#7dff7d]">{totalArticles}</div>
                <div className="text-xs md:text-sm text-[#5a5a70] mt-1">총 뉴스 기사</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-[#4dc3ff]">
                  {Math.round(totalArticles / archive.length)}
                </div>
                <div className="text-xs md:text-sm text-[#5a5a70] mt-1">일 평균</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="container-custom pt-10 !pb-8 md:py-14">
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Main Timeline */}
          <div className="lg:col-span-2">
            {Object.entries(groupedByMonth).map(([month, items]) => (
              <MonthGroup key={month} month={month} items={items} />
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 !mt-8 lg:!mt-0">
            {/* Top Keywords */}
            <div className="bg-[#1a1a24] rounded-2xl p-6 border border-[#2a2a38] sticky top-24">
              <h3 className="font-display text-lg font-bold mb-4">인기 키워드</h3>
              <p className="text-xs text-[#5a5a70] mb-4">최근 30일 기준</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {topKeywords.map(([keyword, count], i) => (
                  <span
                    key={keyword}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all hover:scale-105 cursor-default ${
                      i === 0
                        ? "bg-[#ff4d4d]/10 text-[#ff4d4d] border-[#ff4d4d]/30"
                        : i === 1
                        ? "bg-[#ffb84d]/10 text-[#ffb84d] border-[#ffb84d]/30"
                        : i === 2
                        ? "bg-[#4dc3ff]/10 text-[#4dc3ff] border-[#4dc3ff]/30"
                        : "bg-[#2a2a38] text-[#8888a0] border-[#3a3a4a]"
                    }`}
                  >
                    #{keyword}
                    <span className="ml-1 text-xs opacity-60">{count}</span>
                  </span>
                ))}
              </div>

              <div className="border-t border-[#2a2a38] pt-4">
                <h4 className="text-sm font-medium text-[#8888a0] mb-3">감성 분석</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#7dff7d]">긍정</span>
                      <span className="text-[#5a5a70]">
                        {archive.reduce((acc, item) => acc + item.sentiment.positive, 0)}건
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#2a2a38] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#7dff7d]"
                        style={{
                          width: `${
                            (archive.reduce((acc, item) => acc + item.sentiment.positive, 0) /
                              totalArticles) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#ff4d4d]">부정</span>
                      <span className="text-[#5a5a70]">
                        {archive.reduce((acc, item) => acc + item.sentiment.negative, 0)}건
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#2a2a38] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#ff4d4d]"
                        style={{
                          width: `${
                            (archive.reduce((acc, item) => acc + item.sentiment.negative, 0) /
                              totalArticles) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#8888a0]">중립</span>
                      <span className="text-[#5a5a70]">
                        {archive.reduce((acc, item) => acc + item.sentiment.neutral, 0)}건
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#2a2a38] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#8888a0]"
                        style={{
                          width: `${
                            (archive.reduce((acc, item) => acc + item.sentiment.neutral, 0) /
                              totalArticles) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2a2a38]">
                <Link
                  href="/briefing"
                  className="flex items-center justify-between text-sm text-[#4dc3ff] hover:text-[#7dddff] transition-colors"
                >
                  <span>오늘의 브리핑 보기</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2a2a38] !py-8">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 text-xs md:text-sm text-[#5a5a70]">
            <div>
              데이터 출처: Berkeley Earth, NOAA, NSIDC
            </div>
            <div>
              Climate Insight © {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
