"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CO2ChartProps {
  data: Array<{ year: number; month: number; co2_ppm: number }>;
}

export default function CO2Chart({ data }: CO2ChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-gray-500">데이터 없음</div>;
  }

  const chartData = {
    labels: data.map((d) => `${d.year}-${String(d.month).padStart(2, "0")}`),
    datasets: [
      {
        label: "CO₂ 농도 (ppm)",
        data: data.map((d) => d.co2_ppm),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 1,
        pointHoverRadius: 5,
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
            return `${(context.raw as number).toFixed(1)} ppm`;
          },
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: "CO₂ (ppm)",
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        title: {
          display: true,
          text: "날짜",
        },
        ticks: {
          maxTicksLimit: 8,
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="h-48 md:h-64 w-full">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
