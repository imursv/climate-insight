"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { NewsArticle, DailyBriefing, BriefingSection } from "@/types/briefing";
import { getBriefingIndex, getBriefingsByDate } from "@/lib/api/briefing";

// 인용 번호를 클릭 가능한 링크로 변환하는 컴포넌트
function BriefingText({
  content,
  articles,
  onCiteClick
}: {
  content: string;
  articles: NewsArticle[];
  onCiteClick: (id: string) => void;
}) {
  // [1], [2] 등의 패턴을 찾아서 클릭 가능한 요소로 변환
  const parts = content.split(/(\[\d+\])/g);

  return (
    <p className="text-[#c0c0d0] leading-relaxed text-lg">
      {parts.map((part, index) => {
        const match = part.match(/\[(\d+)\]/);
        if (match) {
          const articleIndex = parseInt(match[1]) - 1;
          const article = articles[articleIndex];
          if (article) {
            return (
              <button
                key={index}
                onClick={() => onCiteClick(article.id)}
                className="inline-flex items-center justify-center w-6 h-6 mx-0.5 text-xs font-bold bg-[#4dc3ff]/20 text-[#4dc3ff] rounded-full hover:bg-[#4dc3ff]/30 transition-colors cursor-pointer"
                title={article.title}
              >
                {match[1]}
              </button>
            );
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}

// 브리핑 섹션 컴포넌트
function BriefingSectionCard({
  section,
  articles,
  onCiteClick,
  index
}: {
  section: BriefingSection;
  articles: NewsArticle[];
  onCiteClick: (id: string) => void;
  index: number;
}) {
  const toneStyles = {
    urgent: "border-l-[#ff4d4d] bg-[#ff4d4d]/5",
    positive: "border-l-[#7dff7d] bg-[#7dff7d]/5",
    neutral: "border-l-[#4dc3ff] bg-[#4dc3ff]/5",
  };

  return (
    <div
      className={`border-l-4 pl-4 md:pl-6 py-5 md:py-6 rounded-r-xl ${toneStyles[section.tone]} animate-fade-in-up`}
      style={{ animationDelay: `${0.2 + index * 0.1}s` }}
    >
      <h3 className="font-display text-lg md:text-xl font-bold mb-4 text-white">
        {section.title}
      </h3>
      <BriefingText content={section.content} articles={articles} onCiteClick={onCiteClick} />
    </div>
  );
}

// 출처 카드 컴포넌트
function SourceCard({
  article,
  index,
  isHighlighted,
  onRef
}: {
  article: NewsArticle;
  index: number;
  isHighlighted: boolean;
  onRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={onRef}
      className={`group flex gap-3 md:gap-4 p-4 md:p-5 rounded-xl border transition-all duration-300 ${
        isHighlighted
          ? "bg-[#4dc3ff]/10 border-[#4dc3ff]/50 scale-[1.02]"
          : "bg-[#1a1a24] border-[#2a2a38] hover:border-[#3a3a4a]"
      }`}
    >
      {/* 번호 */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
        isHighlighted
          ? "bg-[#4dc3ff] text-[#0a0a0f]"
          : "bg-[#2a2a38] text-[#8888a0]"
      }`}>
        {index + 1}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs text-[#8888a0]">{article.source}</span>
          <span className="text-[#3a3a4a] hidden sm:inline">·</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            article.sentiment === "positive"
              ? "bg-[#7dff7d]/10 text-[#7dff7d]"
              : article.sentiment === "negative"
              ? "bg-[#ff4d4d]/10 text-[#ff4d4d]"
              : "bg-[#8888a0]/10 text-[#8888a0]"
          }`}>
            {article.sentiment === "positive" ? "긍정" : article.sentiment === "negative" ? "부정" : "중립"}
          </span>
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <h4 className="font-medium text-white group-hover:text-[#4dc3ff] transition-colors line-clamp-2 text-sm md:text-base">
            {article.title}
          </h4>
        </a>
        {article.original_title && article.original_title !== article.title && (
          <p className="text-xs text-[#5a5a70] mt-2 italic line-clamp-1">
            {article.original_title}
          </p>
        )}
      </div>

      {/* 링크 */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 self-center w-10 h-10 rounded-lg bg-[#2a2a38] flex items-center justify-center text-[#8888a0] hover:bg-[#4dc3ff] hover:text-white transition-all"
      >
        <span className="text-lg">→</span>
      </a>
    </div>
  );
}

export default function BriefingPage() {
  const [briefings, setBriefings] = useState<DailyBriefing[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<"morning" | "afternoon" | undefined>();
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const sourceRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // 현재 선택된 브리핑
  const briefing = selectedPeriod
    ? briefings.find(b => b.period === selectedPeriod) || briefings[briefings.length - 1]
    : briefings[briefings.length - 1] || null;

  // 초기 로드: 인덱스에서 최신 날짜 가져오기
  useEffect(() => {
    async function fetchIndex() {
      try {
        const index = await getBriefingIndex();
        if (index?.dates && index.dates.length > 0) {
          setAvailableDates(index.dates);
          setSelectedDate(index.dates[0]); // 최신 날짜 선택
        } else {
          setError("브리핑 데이터가 없습니다. 파이프라인을 실행해주세요.");
          setLoading(false);
        }
      } catch (err) {
        console.error("인덱스 로드 오류:", err);
        setError("브리핑을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    }
    fetchIndex();
  }, []);

  // 선택된 날짜의 브리핑 로드
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchBriefings() {
      try {
        setLoading(true);
        setError(null);

        const data = await getBriefingsByDate(selectedDate);

        if (data.length > 0) {
          setBriefings(data);
          // 가장 최근 시간대 선택 (오후 우선)
          const latestBriefing = data[data.length - 1];
          setSelectedPeriod(latestBriefing.period as "morning" | "afternoon" | undefined);
        } else {
          setError("해당 날짜의 브리핑 데이터가 없습니다.");
          setBriefings([]);
        }
      } catch (err) {
        console.error("브리핑 로드 오류:", err);
        setError("브리핑을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchBriefings();
  }, [selectedDate]);

  const handleCiteClick = (id: string) => {
    setHighlightedId(id);

    // 해당 출처로 스크롤
    const element = sourceRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // 3초 후 하이라이트 해제
    setTimeout(() => setHighlightedId(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2a2a38] border-t-[#4dc3ff] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8888a0]">AI 브리핑 불러오는 중...</p>
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
          <h2 className="text-xl font-bold text-white mb-2">브리핑이 없습니다</h2>
          <p className="text-[#8888a0] mb-6">
            {error || "아직 생성된 브리핑이 없습니다. 백엔드 파이프라인을 실행하면 AI가 오늘의 기후 뉴스를 분석하여 브리핑을 생성합니다."}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/"
              className="px-4 py-2 bg-[#2a2a38] text-white rounded-lg hover:bg-[#3a3a4a] transition-colors"
            >
              대시보드로
            </Link>
            <Link
              href="/archive"
              className="px-4 py-2 bg-[#4dc3ff]/10 text-[#4dc3ff] border border-[#4dc3ff]/30 rounded-lg hover:bg-[#4dc3ff]/20 transition-colors"
            >
              아카이브 보기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#12121a] to-[#0a0a0f]" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#4dc3ff] rounded-full filter blur-[150px]" />
        </div>

        <div className="relative container-custom !py-8 md:!py-16 lg:!py-20">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#5a5a70] mb-6 md:mb-8 animate-fade-in">
            <Link href="/" className="hover:text-white transition-colors">
              대시보드
            </Link>
            <span>→</span>
            <span className="text-[#8888a0]">AI 브리핑</span>
          </div>


          <div className="max-w-4xl">
            {/* AI Badge */}
            <div className="inline-flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-full bg-gradient-to-r from-[#4dc3ff]/10 to-[#7d4dff]/10 border border-[#4dc3ff]/30 mb-6 md:mb-8 animate-fade-in">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-[#4dc3ff] to-[#7d4dff] flex items-center justify-center">
                <span className="text-xs md:text-sm">🤖</span>
              </div>
              <span className="text-[#4dc3ff] text-xs md:text-sm font-medium">Gemini AI</span>
            </div>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-6 md:mb-8 animate-fade-in-up stagger-1">
              오늘의{" "}
              <span className="text-gradient-ice">기후 브리핑</span>
            </h1>

            <p className="text-base md:text-lg text-[#8888a0] animate-fade-in-up stagger-2 leading-relaxed">
              {briefing.summary.total_count}건의 뉴스를 AI가 분석하여 대변인 형식으로 전달합니다.
              <span className="text-[#4dc3ff]"> 파란색 번호</span>를 클릭하면 해당 출처로 이동합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Main Briefing Content */}
      <section className="container-custom pb-12 !pt-8 md:!pt-12">
        <div className="max-w-4xl mx-auto">
          {/* Date & Period Selector */}
          <div className="flex flex-wrap items-center gap-3 mb-8 md:mb-10 animate-fade-in">
            {/* 날짜 선택 */}
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 text-sm rounded-lg bg-[#1a1a24] border border-[#2a2a38] text-white focus:border-[#4dc3ff] focus:outline-none cursor-pointer"
            >
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </option>
              ))}
            </select>

            {/* 오전/오후 선택 - 2개 이상일 때만 표시 */}
            {briefings.length > 1 && (
              <div className="flex items-center gap-2">
                {briefings.map((b) => (
                  <button
                    key={b.period}
                    onClick={() => setSelectedPeriod(b.period as "morning" | "afternoon")}
                    className={`px-4 py-2 text-sm rounded-lg transition-all ${
                      selectedPeriod === b.period
                        ? "bg-[#4dc3ff] text-white font-medium"
                        : "bg-[#1a1a24] border border-[#2a2a38] hover:border-[#3a3a4a] text-[#8888a0] hover:text-white"
                    }`}
                  >
                    {b.period === "morning" ? "☀️ 오전" : "🌙 오후"}
                    <span className="ml-2 text-xs opacity-70">{b.articles.length}건</span>
                  </button>
                ))}
              </div>
            )}

            {/* 단일 브리핑일 때 시간대 표시 */}
            {briefings.length === 1 && briefing?.period && (
              <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                briefing.period === "morning"
                  ? "bg-[#ffb84d]/20 text-[#ffb84d]"
                  : "bg-[#4dc3ff]/20 text-[#4dc3ff]"
              }`}>
                {briefing.period === "morning" ? "☀️ 오전 브리핑" : "🌙 오후 브리핑"}
              </span>
            )}
          </div>

          {/* Opening */}
          <div className="mb-10 md:mb-14 animate-fade-in-up">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[#4dc3ff] to-[#7d4dff] flex items-center justify-center flex-shrink-0">
                <span className="text-lg md:text-xl">🎙️</span>
              </div>
              <div className="pt-1 md:pt-2">
                <p className="text-lg md:text-xl text-white leading-relaxed">
                  {briefing.briefing.opening}
                </p>
                {briefing.generated_at && (
                  <p className="text-sm md:text-base text-white mt-3">
                    {new Date(briefing.generated_at).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })} 업데이트
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-8 md:space-y-10 mb-10 md:mb-14">
            {briefing.briefing.sections.map((section, index) => (
              <BriefingSectionCard
                key={index}
                section={section}
                articles={briefing.articles}
                onCiteClick={handleCiteClick}
                index={index}
              />
            ))}
          </div>

          {/* Closing */}
          <div className="mb-12 md:mb-20 animate-fade-in-up">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#2a2a38] flex items-center justify-center flex-shrink-0">
                <span className="text-lg md:text-xl">📋</span>
              </div>
              <div className="pt-1 md:pt-2">
                <p className="text-base md:text-lg text-[#8888a0] leading-relaxed">
                  {briefing.briefing.closing}
                </p>
              </div>
            </div>
          </div>

          {/* Sources Section */}
          <div className="border-t border-[#2a2a38] pt-10 md:pt-14">
            <h2 className="font-display text-xl md:text-2xl font-bold mb-6 md:mb-8 flex items-center gap-3">
              <span>📰</span>
              <span>출처 ({briefing.articles.length}건)</span>
            </h2>

            <div className="space-y-4 md:space-y-5">
              {briefing.articles.map((article, index) => (
                <SourceCard
                  key={article.id}
                  article={article}
                  index={index}
                  isHighlighted={highlightedId === article.id}
                  onRef={(el) => { sourceRefs.current[article.id] = el; }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Archive CTA */}
      <section className="container-custom !py-8 md:!py-20">
        <div className="text-center">
          <p className="text-[#8888a0] mb-6">이전 브리핑을 확인하고 싶으신가요?</p>
          <Link
            href="/archive"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-medium text-white/80 hover:bg-white/10 transition-all"
          >
            아카이브 보기
            <span>→</span>
          </Link>
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
