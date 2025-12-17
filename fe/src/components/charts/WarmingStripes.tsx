"use client";

import { useMemo } from "react";

interface WarmingStripesProps {
  data: Array<{ year: number; anomaly: number }>;
  height?: number;
}

// 기온 편차를 색상으로 변환 (파란색 → 흰색 → 빨간색)
function getColorForAnomaly(anomaly: number, min: number, max: number): string {
  // -0.5 ~ +1.5 범위로 정규화
  const normalized = (anomaly - min) / (max - min);

  if (normalized < 0.5) {
    // 파란색 → 흰색
    const intensity = normalized * 2;
    const r = Math.round(8 + (255 - 8) * intensity);
    const g = Math.round(81 + (255 - 81) * intensity);
    const b = Math.round(156 + (255 - 156) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // 흰색 → 빨간색
    const intensity = (normalized - 0.5) * 2;
    const r = 255;
    const g = Math.round(255 - (255 - 67) * intensity);
    const b = Math.round(255 - (255 - 56) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export default function WarmingStripes({ data, height = 120 }: WarmingStripesProps) {
  const { stripes, startYear, endYear } = useMemo(() => {
    if (!data || data.length === 0) {
      return { stripes: [], min: 0, max: 0, startYear: 0, endYear: 0 };
    }

    const anomalies = data.map((d) => d.anomaly);
    const minVal = Math.min(...anomalies);
    const maxVal = Math.max(...anomalies);
    const years = data.map((d) => d.year);

    return {
      stripes: data.map((d) => ({
        year: d.year,
        color: getColorForAnomaly(d.anomaly, minVal, maxVal),
        anomaly: d.anomaly,
      })),
      min: minVal,
      max: maxVal,
      startYear: Math.min(...years),
      endYear: Math.max(...years),
    };
  }, [data]);

  if (!data || data.length === 0) {
    return <div className="text-gray-500">데이터 없음</div>;
  }

  return (
    <div className="w-full">
      <div
        className="flex w-full rounded-lg overflow-hidden"
        style={{ height }}
        title="Warming Stripes - 연도별 기온 편차"
      >
        {stripes.map((stripe) => (
          <div
            key={stripe.year}
            className="flex-1 transition-all hover:opacity-80 cursor-pointer relative group"
            style={{ backgroundColor: stripe.color }}
          >
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
              {stripe.year}: {stripe.anomaly > 0 ? "+" : ""}
              {stripe.anomaly.toFixed(2)}°C
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs md:text-sm text-[#5a5a70]">
        <span>{startYear}</span>
        <span className="text-[10px] md:text-xs hidden sm:inline">
          <span className="inline-block w-2 h-2 md:w-3 md:h-3 rounded" style={{ backgroundColor: "rgb(8, 81, 156)" }}></span>
          {" "}Low →
          <span className="inline-block w-2 h-2 md:w-3 md:h-3 rounded ml-1 md:ml-2" style={{ backgroundColor: "rgb(255, 67, 56)" }}></span>
          {" "}High
        </span>
        <span>{endYear}</span>
      </div>
    </div>
  );
}
