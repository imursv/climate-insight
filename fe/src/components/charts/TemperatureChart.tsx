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

interface TemperatureChartProps {
  data: Array<{ year: number; anomaly: number }>;
}

export default function TemperatureChart({ data }: TemperatureChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-gray-500">데이터 없음</div>;
  }

  const chartData = {
    labels: data.map((d) => d.year.toString()),
    datasets: [
      {
        label: "기온 편차 (°C)",
        data: data.map((d) => d.anomaly),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 6,
      },
      {
        label: "기준선 (0°C)",
        data: data.map(() => 0),
        borderColor: "rgba(100, 100, 100, 0.5)",
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
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
            const value = context.raw as number;
            return `${value > 0 ? "+" : ""}${value.toFixed(2)}°C`;
          },
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: "기온 편차 (°C)",
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

  return (
    <div className="w-full overflow-hidden">
      <div className="h-48 md:h-64 w-full">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
