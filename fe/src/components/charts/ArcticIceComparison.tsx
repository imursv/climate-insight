"use client";

import { useState } from "react";
import Image from "next/image";

interface ArcticIceComparisonProps {
  years?: number[];
}

// NSIDC 이미지 URL 생성 (9월 15일 기준 - 연간 최소값 시기)
function getNSIDCImageUrl(year: number): string {
  return `https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/images/${year}/09_Sep/N_${year}0915_extn_v4.0.png`;
}

export default function ArcticIceComparison({
  years = [2012, 2020, 2024],
}: ArcticIceComparisonProps) {
  const [selectedYears, setSelectedYears] = useState<[number, number]>([
    years[0],
    years[years.length - 1],
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => {
              const newSelection: [number, number] = [...selectedYears];
              if (!selectedYears.includes(year)) {
                newSelection[1] = newSelection[0];
                newSelection[0] = year;
              }
              setSelectedYears(newSelection.sort((a, b) => a - b) as [number, number]);
            }}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
              selectedYears.includes(year)
                ? "bg-[#4dc3ff] text-[#0a0a0f]"
                : "bg-[#2a2a38] text-[#8888a0] hover:bg-[#3a3a4a]"
            }`}
          >
            {year}년
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-4">
        {selectedYears.map((year) => (
          <div key={year} className="relative">
            <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-black/70 text-white px-2 md:px-3 py-0.5 md:py-1 rounded-lg text-xs md:text-sm font-bold z-10">
              {year}년 9월
            </div>
            <div className="relative aspect-square bg-[#0a0a0f] rounded-lg md:rounded-xl overflow-hidden">
              <Image
                src={getNSIDCImageUrl(year)}
                alt={`${year}년 9월 북극 해빙`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs md:text-sm text-[#5a5a70] text-center">
        출처: NSIDC Sea Ice Index | 매년 9월 15일 기준
      </p>
    </div>
  );
}
