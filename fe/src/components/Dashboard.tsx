"use client";

import { useEffect, useState } from "react";
import { ClimateData } from "@/types/climate";
import Link from "next/link";
import WarmingStripes from "./charts/WarmingStripes";
import TemperatureChart from "./charts/TemperatureChart";
import SeaLevelChart from "./charts/SeaLevelChart";
import ArcticIceChart from "./charts/ArcticIceChart";
import ArcticIceComparison from "./charts/ArcticIceComparison";

export default function Dashboard() {
  const [data, setData] = useState<ClimateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/climate")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2a2a38] border-t-[#ff4d4d] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8888a0]">기후 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  const temp = data?.temperature;
  const co2 = data?.co2;
  const ice = data?.arcticIce;
  const seaLevel = data?.seaLevel;
  const enso = data?.enso;

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a24] to-[#0a0a0f]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ff4d4d] rounded-full filter blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#4dc3ff] rounded-full filter blur-[150px]" />
        </div>

        <div className="relative container-custom py-16 lg:py-24">
          <div className="max-w-4xl">
            {/* Emergency Badge */}
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-full bg-[#ff4d4d]/10 border border-[#ff4d4d]/30 !mt-8 md:!mt-0 mb-6 md:mb-8 animate-fade-in">
              <span className="w-2 h-2 bg-[#ff4d4d] rounded-full animate-pulse" />
              <span className="text-[#ff4d4d] text-xs md:text-sm font-medium">
                CLIMATE EMERGENCY
              </span>
            </div>

            {/* Main Title */}
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6 md:mb-8 animate-fade-in-up stagger-1">
              <span className="text-white/90">현재 상태</span>
              <br />
              <span className="text-gradient-warming">+{temp?.latest?.anomaly?.toFixed(1) || "1.3"}°C</span>
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-[#8888a0] max-w-2xl mb-8 md:mb-10 animate-fade-in-up stagger-2 leading-relaxed">
              산업화 이전 대비 전지구 평균 기온 상승.
              <br />
              1.5°C 한계까지{" "}
              <span className="text-[#ffb84d] font-semibold">
                {(1.5 - (temp?.latest?.anomaly || 1.3)).toFixed(1)}°C
              </span>{" "}
              남았습니다.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 animate-fade-in-up stagger-3 mb-10 xl:mb-0">
              <Link
                href="/briefing"
                className="group px-5 md:px-6 py-3 bg-gradient-to-r from-[#ff4d4d] to-[#ff8c4d] rounded-lg font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#ff4d4d]/30 text-center"
              >
                오늘의 AI 브리핑 보기
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>

              <Link
                href="/archive"
                className="px-5 md:px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-semibold text-white/80 hover:bg-white/10 transition-all text-center"
              >
                아카이브
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Warming Stripes Section */}
      <section className="container-custom pb-16 !pt-8 md:!pt-16">
        <div className="animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
                Warming Stripes
              </h2>
              <p className="text-sm md:text-base text-[#8888a0]">
                50년간의 기온 변화. 색이 빨개질수록 더 뜨거워진 것입니다.
              </p>
            </div>
            <div className="text-left md:text-right text-xs md:text-sm text-[#5a5a70]">
              {temp?.annual_data?.[0]?.year} - {temp?.annual_data?.[temp.annual_data.length - 1]?.year}
            </div>
          </div>
          {temp?.annual_data && (
            <WarmingStripes data={temp.annual_data} height={120} />
          )}
        </div>
      </section>

      {/* Stats Grid */}
      <section className="container-custom py-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
          {[
            {
              label: "전지구 기온 편차",
              value: `+${temp?.latest?.anomaly?.toFixed(2) || "1.31"}`,
              unit: "°C",
              desc: `${temp?.latest?.year || 2024}년 기준`,
              color: "#ff4d4d",
              trend: "up",
            },
            {
              label: "CO₂ 농도",
              value: co2?.latest_daily?.co2_ppm?.toFixed(1) || "427.1",
              unit: "ppm",
              desc: "역사상 최고 수준",
              color: "#7dff7d",
              trend: "up",
            },
            {
              label: "해수면 상승",
              value: `+${seaLevel?.latest?.anomaly_mm?.toFixed(0) || "83"}`,
              unit: "mm",
              desc: "1993년 대비",
              color: "#4d7dff",
              trend: "up",
            },
            {
              label: "북극 해빙 면적",
              value: ice?.latest?.extent?.toFixed(2) || "11.0",
              unit: "M km²",
              desc: ice?.latest?.date ? `${new Date(ice.latest.date).getFullYear()}년 ${new Date(ice.latest.date).getMonth() + 1}월` : "최근 데이터",
              color: "#4dc3ff",
              trend: "down",
            },
            {
              label: "ENSO 상태",
              value: enso?.latest?.status === "neutral" ? "중립" : enso?.latest?.status?.includes("el_nino") ? "엘니뇨" : "라니냐",
              unit: "",
              desc: `ONI: ${enso?.latest?.avg_oni?.toFixed(1) || "0.0"}`,
              color: "#ffb84d",
              trend: "neutral",
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`relative overflow-hidden bg-[#1a1a24] rounded-xl md:rounded-2xl p-4 md:p-6 border border-[#2a2a38] card-hover animate-fade-in-up stagger-${i + 1}`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 opacity-10" style={{ background: `radial-gradient(circle, ${stat.color} 0%, transparent 70%)` }} />
              <div className="text-xs md:text-sm text-[#8888a0] mb-2">{stat.label}</div>
              <div className="flex items-baseline gap-1 md:gap-2">
                <span className="text-2xl md:text-3xl lg:text-4xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </span>
                <span className="text-sm md:text-lg text-[#5a5a70]">{stat.unit}</span>
                {stat.trend === "up" && (
                  <span className="text-[#ff4d4d] text-base md:text-lg">↑</span>
                )}
              </div>
              <div className="text-[10px] md:text-xs text-[#5a5a70] mt-2">{stat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Charts Grid */}
      <section className="container-custom pb-16 !pt-8 md:!pt-16">
        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          {/* Temperature Chart */}
          <div className="bg-[#1a1a24] rounded-xl md:rounded-2xl p-4 md:p-6 border border-[#2a2a38] animate-fade-in-up stagger-1">
            <h3 className="font-display text-lg md:text-xl font-bold mb-1">기온 변화 추세</h3>
            <p className="text-xs md:text-sm text-[#5a5a70] mb-4 md:mb-6">50년간 전지구 평균 기온 편차</p>
            {temp?.annual_data && <TemperatureChart data={temp.annual_data} />}
          </div>

          {/* Sea Level Chart */}
          <div className="bg-[#1a1a24] rounded-xl md:rounded-2xl p-4 md:p-6 border border-[#2a2a38] animate-fade-in-up stagger-2">
            <h3 className="font-display text-lg md:text-xl font-bold mb-1">해수면 상승</h3>
            <p className="text-xs md:text-sm text-[#5a5a70] mb-4 md:mb-6">위성 관측 이후 연간 해수면 변화</p>
            {seaLevel?.annual_data && (
              <SeaLevelChart data={seaLevel.annual_data} trendPerYear={seaLevel.trend_mm_per_year} />
            )}
          </div>
        </div>
      </section>

      {/* Arctic Ice Section */}
      <section className="container-custom pb-16 !pt-8 md:!pt-16 overflow-hidden">
        <div className="bg-gradient-to-br from-[#1a1a24] to-[#12121a] rounded-2xl md:rounded-3xl p-5 md:p-8 lg:p-12 border border-[#2a2a38] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 hidden md:block">
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-[#4dc3ff] rounded-full filter blur-[200px]" />
          </div>

          <div className="relative">
            <div className="max-w-2xl mb-8 md:mb-10">
              <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                <span className="text-gradient-ice">북극 해빙</span>이<br />
                사라지고 있습니다
              </h2>
              <p className="text-[#8888a0] text-sm md:text-base lg:text-lg leading-relaxed">
                매년 9월, 북극 해빙은 연간 최소값을 기록합니다.
                1979년 이후 북극 해빙 면적은 급격히 감소하고 있습니다.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-5 md:gap-8 overflow-hidden">
              {/* Ice Chart */}
              <div className="bg-[#0a0a0f]/50 rounded-xl md:rounded-2xl p-4 md:p-6 overflow-hidden">
                <h4 className="text-xs md:text-sm text-[#8888a0] mb-4">9월 최소 해빙 면적 추이</h4>
                {ice?.annual_minimum && <ArcticIceChart data={ice.annual_minimum} />}
              </div>

              {/* Ice Comparison */}
              <div className="bg-[#0a0a0f]/50 rounded-xl md:rounded-2xl p-4 md:p-6 overflow-hidden">
                <h4 className="text-xs md:text-sm text-[#8888a0] mb-4">위성 이미지 비교</h4>
                <ArcticIceComparison years={[2000, 2012, 2020, 2024]} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container-custom !pb-8 !pt-8 md:!pt-20 md:!pb-20">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h2 className="font-display text-xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6">
            매일 아침, AI가 분석한<br />
            <span className="text-gradient-warming">기후 뉴스 브리핑</span>을 받아보세요
          </h2>
          <p className="text-sm md:text-base text-[#8888a0] mb-8 md:mb-10 leading-relaxed">
            Gemini AI가 전 세계 기후 뉴스를 분석하고 요약합니다.
          </p>
          <Link
            href="/briefing"
            className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-[#ff4d4d] to-[#ff8c4d] rounded-xl font-semibold text-base md:text-lg text-white transition-all hover:shadow-xl hover:shadow-[#ff4d4d]/20 hover:scale-105"
          >
            오늘의 브리핑 보기
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2a2a38] !py-8 md:!py-8">
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
