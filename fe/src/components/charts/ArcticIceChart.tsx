"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ArcticIceChartProps {
  data: Array<{ year: number; minimum_extent: number }>;
}

export default function ArcticIceChart({ data }: ArcticIceChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-gray-500">데이터 없음</div>;
  }

  // 색상: 면적이 클수록 파랑, 작을수록 빨강
  const maxExtent = Math.max(...data.map((d) => d.minimum_extent));
  const minExtent = Math.min(...data.map((d) => d.minimum_extent));

  const getColor = (extent: number) => {
    const ratio = (extent - minExtent) / (maxExtent - minExtent);
    // 파랑 → 빨강 그라데이션
    const r = Math.round(239 - (239 - 59) * ratio);
    const g = Math.round(68 + (130 - 68) * ratio);
    const b = Math.round(68 + (246 - 68) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const chartData = {
    labels: data.map((d) => d.year.toString()),
    datasets: [
      {
        label: "9월 최소 해빙 면적 (백만 km²)",
        data: data.map((d) => d.minimum_extent),
        backgroundColor: data.map((d) => getColor(d.minimum_extent)),
        borderRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: { raw: unknown }) => {
            return `${(context.raw as number).toFixed(2)} 백만 km²`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: "면적 (백만 km²)",
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        title: {
          display: true,
          text: "연도",
        },
        ticks: {
          maxTicksLimit: 10,
        },
        grid: {
          display: false,
        },
      },
    },
  };

  // 감소율 계산
  const firstYear = data[0];
  const lastYear = data[data.length - 1];
  const decreasePercent = (
    ((firstYear.minimum_extent - lastYear.minimum_extent) / firstYear.minimum_extent) *
    100
  ).toFixed(0);

  return (
    <div className="w-full overflow-hidden">
      <div className="h-48 md:h-64 w-full">
        <Bar data={chartData} options={options} />
      </div>
      <p className="text-xs md:text-sm text-[#5a5a70] mt-2 text-center">
        {firstYear.year}년 대비 {lastYear.year}년:{" "}
        <span className="font-semibold text-[#ff4d4d]">-{decreasePercent}% 감소</span>
      </p>
    </div>
  );
}
