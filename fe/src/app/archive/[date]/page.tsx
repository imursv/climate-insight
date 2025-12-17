"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NewsArticle, DailyBriefing, BriefingPeriodInfo } from "@/types/briefing";
import { getBriefing, getBriefingIndex, getBriefingsByDate } from "@/lib/api/briefing";

function SentimentBadge({ sentiment }: { sentiment: NewsArticle["sentiment"] }) {
  const config = {
    positive: { label: "긍정", color: "bg-[#7dff7d]/10 text-[#7dff7d] border-[#7dff7d]/30" },
    negative: { label: "부정", color: "bg-[#ff4d4d]/10 text-[#ff4d4d] border-[#ff4d4d]/30" },
    neutral: { label: "중립", color: "bg-[#8888a0]/10 text-[#8888a0] border-[#8888a0]/30" },
  };
  const { label, color } = config[sentiment];
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${color}`}>
      {label}
    </span>
  );
}

function DetailedNewsCard({ article, index }: { article: NewsArticle; index: number }) {
  return (
    <article
      className={`group relative bg-[#1a1a24] rounded-xl md:rounded-2xl border border-[#2a2a38] overflow-hidden hover:border-[#3a3a4a] transition-colors animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}
    >
      {/* Gradient accent */}
      <div
        className={`absolute top-0 left-0 w-full h-1 ${
          article.sentiment === "positive"
            ? "bg-gradient-to-r from-[#7dff7d] to-[#4dc3ff]"
            : article.sentiment === "negative"
            ? "bg-gradient-to-r from-[#ff4d4d] to-[#ff8c4d]"
            : "bg-gradient-to-r from-[#8888a0] to-[#5a5a70]"
        }`}
      />

      <div className="p-4 md:p-5 lg:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 md:gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs md:text-sm font-medium text-[#8888a0]">{article.source}</span>
              <span className="text-[#3a3a4a] hidden sm:inline">·</span>
              <span className="text-xs md:text-sm text-[#5a5a70]">
                {article.category === "domestic" ? "🇰🇷 국내" : "🌍 해외"}
              </span>
              <SentimentBadge sentiment={article.sentiment} />
            </div>
            {/* 클릭 가능한 제목 */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <h2 className="font-display text-base md:text-lg lg:text-xl font-bold leading-snug text-white hover:text-[#4dc3ff] transition-colors">
                {article.title}
              </h2>
            </a>
            {article.original_title && article.original_title !== article.title && (
              <p className="text-xs md:text-sm text-[#5a5a70] mt-2 italic">
                {article.original_title}
              </p>
            )}
          </div>
          {/* 원문 링크 아이콘 */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-lg bg-[#2a2a38] flex items-center justify-center text-[#8888a0] hover:bg-[#4dc3ff] hover:text-white transition-all"
          >
            <span className="text-base md:text-lg">→</span>
          </a>
        </div>

        {/* Keywords */}
        {article.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 md:mt-5">
            {article.keywords.map((keyword) => (
              <span
                key={keyword}
                className="px-2 py-1 text-xs bg-[#2a2a38] text-[#8888a0] rounded-lg"
              >
                #{keyword}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function ArchiveDatePage() {
  const params = useParams();
  const dateParam = params.date as string;

  // date가 period를 포함하는지 확인 (예: 2025-12-17-morning)
  const hasPeriodInUrl = dateParam.endsWith("-morning") || dateParam.endsWith("-afternoon");
  const date = hasPeriodInUrl
    ? dateParam.replace(/-morning$|-afternoon$/, "")
    : dateParam;
  const urlPeriod = hasPeriodInUrl
    ? (dateParam.endsWith("-morning") ? "morning" : "afternoon") as "morning" | "afternoon"
    : undefined;

  const [briefings, setBriefings] = useState<DailyBriefing[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<"morning" | "afternoon" | undefined>(urlPeriod);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 현재 선택된 브리핑
  const briefing = selectedPeriod
    ? briefings.find(b => b.period === selectedPeriod) || briefings[briefings.length - 1]
    : briefings[briefings.length - 1]; // 기본값: 가장 최근 (오후 우선)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // 병렬로 해당 날짜의 모든 브리핑과 인덱스 가져오기
        const [briefingsData, indexData] = await Promise.all([
          getBriefingsByDate(date),
          getBriefingIndex(),
        ]);

        if (briefingsData.length > 0) {
          setBriefings(briefingsData);
          // URL에 period가 지정되지 않았으면 가장 최근 것 선택
          if (!urlPeriod) {
            const latestBriefing = briefingsData[briefingsData.length - 1];
            setSelectedPeriod(latestBriefing.period as "morning" | "afternoon" | undefined);
          }
        } else {
          setError("해당 날짜의 브리핑 데이터가 없습니다.");
        }

        if (indexData?.dates) {
          setAvailableDates(indexData.dates);
        }
      } catch (err) {
        console.error("브리핑 로드 오류:", err);
        setError("브리핑을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [date, urlPeriod]);

  // 이전/다음 날짜 계산 (실제 데이터가 있는 날짜로)
  const currentIndex = availableDates.indexOf(date);
  const prevDate = currentIndex >= 0 && currentIndex < availableDates.length - 1
    ? availableDates[currentIndex + 1]
    : null;
  const nextDate = currentIndex > 0
    ? availableDates[currentIndex - 1]
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2a2a38] border-t-[#4dc3ff] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8888a0]">브리핑 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-[#2a2a38] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📭</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">브리핑을 찾을 수 없습니다</h2>
          <p className="text-[#8888a0] mb-6">
            {error || `${date} 날짜의 브리핑 데이터가 없습니다.`}
          </p>
          <Link
            href="/archive"
            className="inline-block px-4 py-2 bg-[#4dc3ff]/10 text-[#4dc3ff] border border-[#4dc3ff]/30 rounded-lg hover:bg-[#4dc3ff]/20 transition-colors"
          >
            아카이브 목록으로
          </Link>
        </div>
      </div>
    );
  }

  const articles = briefing.articles;

  const formattedDate = new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const sentimentCounts = articles.reduce(
    (acc, article) => {
      acc[article.sentiment]++;
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0 }
  );

  const domesticCount = articles.filter((a) => a.category === "domestic").length;
  const internationalCount = articles.filter((a) => a.category === "international").length;

  const isToday = date === new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#12121a] to-[#0a0a0f]" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-1/3 w-96 h-96 bg-[#4dc3ff] rounded-full filter blur-[150px]" />
        </div>

        <div className="relative container-custom !py-8 md:!py-16 lg:!py-20">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs md:text-sm text-[#5a5a70] mb-6 md:mb-8 animate-fade-in">
            <Link href="/" className="hover:text-white transition-colors">
              대시보드
            </Link>
            <span>→</span>
            <Link href="/archive" className="hover:text-white transition-colors">
              아카이브
            </Link>
            <span>→</span>
            <span className="text-[#8888a0]">{date}</span>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8 animate-fade-in">
            {prevDate && (
              <Link
                href={`/archive/${prevDate}`}
                className="px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[#8888a0] hover:text-white"
              >
                ← 이전
              </Link>
            )}
            {nextDate && (
              <Link
                href={`/archive/${nextDate}`}
                className="px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[#8888a0] hover:text-white"
              >
                다음 →
              </Link>
            )}
          </div>

          {/* Period Selector - 오전/오후 브리핑이 2개 이상일 때만 표시 */}
          {briefings.length > 1 && (
            <div className="flex items-center gap-2 mb-6 md:mb-8 animate-fade-in">
              <span className="text-sm text-[#5a5a70] mr-2">브리핑 선택:</span>
              {briefings.map((b) => (
                <button
                  key={b.period}
                  onClick={() => setSelectedPeriod(b.period as "morning" | "afternoon")}
                  className={`px-4 py-2 text-sm rounded-lg transition-all ${
                    selectedPeriod === b.period
                      ? "bg-[#4dc3ff] text-white font-medium"
                      : "bg-white/5 hover:bg-white/10 text-[#8888a0] hover:text-white"
                  }`}
                >
                  {b.period === "morning" ? "☀️ 오전" : "🌙 오후"}
                  <span className="ml-2 text-xs opacity-70">{b.articles.length}건</span>
                </button>
              ))}
            </div>
          )}

          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4 md:mb-6 animate-fade-in-up stagger-1">
              <h1 className="font-display text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight">
                <span className="text-gradient-ice">{formattedDate}</span>
              </h1>
              {briefing.period && (
                <span className={`px-3 py-1 text-xs md:text-sm font-medium rounded-full border ${
                  briefing.period === "morning"
                    ? "bg-[#ffb84d]/20 text-[#ffb84d] border-[#ffb84d]/30"
                    : "bg-[#4dc3ff]/20 text-[#4dc3ff] border-[#4dc3ff]/30"
                }`}>
                  {briefing.period === "morning" ? "☀️ 오전 브리핑" : "🌙 오후 브리핑"}
                </span>
              )}
              {isToday && (
                <span className="px-3 py-1 text-xs md:text-sm font-bold bg-[#ff4d4d]/20 text-[#ff4d4d] border border-[#ff4d4d]/30 rounded-full animate-pulse">
                  TODAY
                </span>
              )}
            </div>

            <p className="text-base md:text-lg text-[#8888a0] mb-6 md:mb-8 animate-fade-in-up stagger-2 leading-relaxed">
              이 날 수집된 기후 뉴스 브리핑입니다.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 md:gap-6 animate-fade-in-up stagger-3">
              <div className="flex items-center gap-2">
                <span className="text-xl md:text-2xl font-bold text-white">{articles.length}</span>
                <span className="text-xs md:text-sm text-[#5a5a70]">건의 뉴스</span>
              </div>
              <div className="h-6 w-px bg-[#2a2a38] hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-base md:text-lg font-semibold text-[#4dc3ff]">🇰🇷 {domesticCount}</span>
                <span className="text-xs md:text-sm text-[#5a5a70]">국내</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base md:text-lg font-semibold text-[#ffb84d]">🌍 {internationalCount}</span>
                <span className="text-xs md:text-sm text-[#5a5a70]">해외</span>
              </div>
              <div className="h-6 w-px bg-[#2a2a38] hidden sm:block" />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#7dff7d] rounded-full" />
                  <span className="text-xs md:text-sm text-[#8888a0]">{sentimentCounts.positive}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#ff4d4d] rounded-full" />
                  <span className="text-xs md:text-sm text-[#8888a0]">{sentimentCounts.negative}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#8888a0] rounded-full" />
                  <span className="text-xs md:text-sm text-[#8888a0]">{sentimentCounts.neutral}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="container-custom py-10 md:py-14">
        <div className="space-y-5 md:space-y-6">
          {articles.map((article, index) => (
            <DetailedNewsCard key={article.id} article={article} index={index} />
          ))}
        </div>

        {articles.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#8888a0]">이 날의 브리핑 데이터가 없습니다.</p>
          </div>
        )}
      </section>

      {/* Navigation */}
      <section className="container-custom !py-8 md:!py-20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {prevDate ? (
            <Link
              href={`/archive/${prevDate}`}
              className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-[#8888a0] hover:text-white hover:bg-white/10 transition-all w-full sm:w-auto justify-center sm:justify-start"
            >
              <span>←</span>
              <span>이전 브리핑</span>
            </Link>
          ) : (
            <div className="px-4 py-3 text-[#5a5a70] hidden sm:block">
              첫 브리핑
            </div>
          )}

          <Link
            href="/archive"
            className="px-4 py-3 text-[#4dc3ff] hover:text-[#7dddff] transition-colors order-first sm:order-none"
          >
            아카이브 목록
          </Link>

          {nextDate ? (
            <Link
              href={`/archive/${nextDate}`}
              className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-[#8888a0] hover:text-white hover:bg-white/10 transition-all w-full sm:w-auto justify-center sm:justify-end"
            >
              <span>다음 브리핑</span>
              <span>→</span>
            </Link>
          ) : (
            <div className="px-4 py-3 text-[#5a5a70] hidden sm:block">
              최신 브리핑
            </div>
          )}
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
