"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ClimateData } from "@/types/climate";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import WarmingStripes from "./charts/WarmingStripes";
import TemperatureChart from "./charts/TemperatureChart";
import SeaLevelChart from "./charts/SeaLevelChart";

export default function Dashboard() {
  const [data, setData] = useState<ClimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("dashboard");
  const toh = useTranslations("toh");

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
          <p className="text-[#8888a0]">{t("loading")}</p>
        </div>
      </div>
    );
  }

  const temp = data?.temperature;
  const co2 = data?.co2;
  const seaLevel = data?.seaLevel;
  const enso = data?.enso;

  return (
    <div className="min-h-screen pt-16">
      {/* TOH Hero Section */}
      <section className="relative overflow-hidden min-h-[80vh] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/toh/banner-1-1500x1001.webp"
            alt="TOH Banner"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[#0a0a0f]/60" />
        </div>

        <div className="relative container-custom py-16 lg:py-24 flex items-center justify-center">
          <div className="max-w-3xl text-center">
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6 animate-fade-in-up">
              <span className="text-white">{toh("heroTitle1")} </span>
              <span className="text-gradient-warming">{toh("heroHighlight")}</span>
              <span className="text-white"> {toh("heroTitle2")}</span>
            </h1>

            <p className="text-lg md:text-xl text-[#8888a0] mb-10 animate-fade-in-up stagger-1">
              {toh("heroSubtitle")}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 animate-fade-in-up stagger-2 justify-center">
              <Link
                href="/briefing"
                className="group px-5 md:px-6 py-3 bg-gradient-to-r from-[#ff4d4d] to-[#ff8c4d] rounded-lg font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#ff4d4d]/30 text-center"
              >
                {t("viewBriefing")}
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>

              <Link
                href="/archive"
                className="px-5 md:px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-semibold text-white/80 hover:bg-white/10 transition-all text-center"
              >
                {t("archive")}
              </Link>
            </div>
          </div>
        </div>

        {/* Plant decoration */}
        {/* <div className="absolute bottom-0 right-0 w-48 md:w-64 lg:w-80 opacity-60 pointer-events-none">
          <Image
            src="/images/toh/plant2-1.webp"
            alt="Plant decoration"
            width={320}
            height={400}
            className="object-contain"
          />
        </div> */}
      </section>

      {/* Vision Section */}
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#0a0a0f] to-[#1a1a24]">
        <div className="container-custom">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[#ff4d4d] text-sm font-medium tracking-wider uppercase mb-4 block">
              {toh("visionTitle")}
            </span>
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold">
              <span className="text-white">{toh("visionSubtitle")} </span>
              <span className="text-gradient-warming">{toh("visionHighlight")}</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Value 1 */}
            <div className="bg-[#1a1a24]/50 rounded-2xl p-6 md:p-8 border border-[#2a2a38] text-center hover:border-[#ff4d4d]/30 transition-all group">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Image
                  src="/images/toh/circle.svg"
                  alt="Circle icon"
                  width={64}
                  height={64}
                  className="group-hover:scale-110 transition-transform"
                />
              </div>
              <h3 className="font-display text-lg md:text-xl font-bold mb-3 text-white">
                {toh("value1Title")}
              </h3>
              <p className="text-[#8888a0] text-sm md:text-base leading-relaxed">
                {toh("value1Desc")}
              </p>
            </div>

            {/* Value 2 */}
            <div className="bg-[#1a1a24]/50 rounded-2xl p-6 md:p-8 border border-[#2a2a38] text-center hover:border-[#4dc3ff]/30 transition-all group">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Image
                  src="/images/toh/triangle.svg"
                  alt="Triangle icon"
                  width={64}
                  height={64}
                  className="group-hover:scale-110 transition-transform"
                />
              </div>
              <h3 className="font-display text-lg md:text-xl font-bold mb-3 text-white">
                {toh("value2Title")}
              </h3>
              <p className="text-[#8888a0] text-sm md:text-base leading-relaxed">
                {toh("value2Desc")}
              </p>
            </div>

            {/* Value 3 */}
            <div className="bg-[#1a1a24]/50 rounded-2xl p-6 md:p-8 border border-[#2a2a38] text-center hover:border-[#7dff7d]/30 transition-all group">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Image
                  src="/images/toh/square.svg"
                  alt="Square icon"
                  width={64}
                  height={64}
                  className="group-hover:scale-110 transition-transform"
                />
              </div>
              <h3 className="font-display text-lg md:text-xl font-bold mb-3 text-white">
                {toh("value3Title")}
              </h3>
              <p className="text-[#8888a0] text-sm md:text-base leading-relaxed">
                {toh("value3Desc")}
              </p>
            </div>
          </div>
        </div>

        {/* Plant decoration */}
        {/* <div className="absolute bottom-0 left-0 w-32 md:w-48 opacity-40 pointer-events-none">
          <Image
            src="/images/toh/plant-1-1.webp"
            alt="Plant decoration"
            width={200}
            height={300}
            className="object-contain"
          />
        </div> */}
      </section>

      {/* Warming Stripes Section */}
      <section className="container-custom pb-16 !pt-8 md:!pt-16">
        <div className="animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
                {t("warmingStripes")}
              </h2>
              <p className="text-sm md:text-base text-[#8888a0]">
                {t("warmingStripesDesc")}
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            {
              label: t("globalTempAnomaly"),
              value: `+${temp?.latest?.anomaly?.toFixed(2) || "1.31"}`,
              unit: "°C",
              desc: `${temp?.latest?.year || 2024}${t("year")} ${t("basedOn")}`,
              color: "#ff4d4d",
              trend: "up",
            },
            {
              label: t("co2Concentration"),
              value: co2?.latest_daily?.co2_ppm?.toFixed(1) || "427.1",
              unit: "ppm",
              desc: t("historicalHigh"),
              color: "#7dff7d",
              trend: "up",
            },
            {
              label: t("seaLevelRise"),
              value: `+${seaLevel?.latest?.anomaly_mm?.toFixed(0) || "83"}`,
              unit: "mm",
              desc: t("since1993"),
              color: "#4d7dff",
              trend: "up",
            },
            {
              label: t("ensoStatus"),
              value: enso?.latest?.status === "neutral" ? t("neutral") : enso?.latest?.status?.includes("el_nino") ? t("elNino") : t("laNina"),
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
            <h3 className="font-display text-lg md:text-xl font-bold mb-1">{t("tempTrend")}</h3>
            <p className="text-xs md:text-sm text-[#5a5a70] mb-4 md:mb-6">{t("tempTrendDesc")}</p>
            {temp?.annual_data && <TemperatureChart data={temp.annual_data} />}
          </div>

          {/* Sea Level Chart */}
          <div className="bg-[#1a1a24] rounded-xl md:rounded-2xl p-4 md:p-6 border border-[#2a2a38] animate-fade-in-up stagger-2">
            <h3 className="font-display text-lg md:text-xl font-bold mb-1">{t("seaLevelTitle")}</h3>
            <p className="text-xs md:text-sm text-[#5a5a70] mb-4 md:mb-6">{t("seaLevelDesc")}</p>
            {seaLevel?.annual_data && (
              <SeaLevelChart data={seaLevel.annual_data} trendPerYear={seaLevel.trend_mm_per_year} />
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container-custom !pb-8 !pt-8 md:!pt-20 md:!pb-20">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h2 className="font-display text-xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6">
            {t("ctaTitle")}<br />
            <span className="text-gradient-warming">{t("ctaHighlight")}</span>{t("ctaSuffix")}
          </h2>
          <p className="text-sm md:text-base text-[#8888a0] mb-8 md:mb-10 leading-relaxed">
            {t("ctaDesc")}
          </p>
          <Link
            href="/briefing"
            className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-[#ff4d4d] to-[#ff8c4d] rounded-xl font-semibold text-base md:text-lg text-white transition-all hover:shadow-xl hover:shadow-[#ff4d4d]/20 hover:scale-105"
          >
            {t("viewTodayBriefing")}
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2a2a38] !py-8 md:!py-8">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 text-xs md:text-sm text-[#5a5a70]">
            <div>
              {t("dataSource")}
            </div>
            <div>
              TOH 기후 뉴스 브리핑 © {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
