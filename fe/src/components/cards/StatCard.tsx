interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  trend?: "up" | "down" | "neutral";
  color?: "red" | "blue" | "green" | "yellow" | "gray";
}

const colorClasses = {
  red: "bg-red-50 border-red-200 text-red-700",
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  green: "bg-green-50 border-green-200 text-green-700",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
  gray: "bg-gray-50 border-gray-200 text-gray-700",
};

const trendIcons = {
  up: "↑",
  down: "↓",
  neutral: "→",
};

export default function StatCard({
  title,
  value,
  unit,
  description,
  trend,
  color = "gray",
}: StatCardProps) {
  return (
    <div className={`rounded-xl border-2 p-4 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium opacity-80">{title}</h3>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-bold">{value}</span>
        {unit && <span className="text-lg opacity-70">{unit}</span>}
        {trend && (
          <span
            className={`text-lg ${
              trend === "up" ? "text-red-500" : trend === "down" ? "text-blue-500" : ""
            }`}
          >
            {trendIcons[trend]}
          </span>
        )}
      </div>
      {description && <p className="mt-1 text-sm opacity-70">{description}</p>}
    </div>
  );
}
