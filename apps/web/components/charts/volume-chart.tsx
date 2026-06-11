"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WeekVolume {
  week: string;
  weekStart: string;
  totalVolume: number;
  sessionCount: number;
}

const RANGES = [
  { label: "4W", weeks: 4 },
  { label: "8W", weeks: 8 },
  { label: "12W", weeks: 12 },
] as const;

function formatKg(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return `${v}`;
}

// Shorten "Week of Jun 2" → "Jun 2"
function shortLabel(week: string) {
  return week.replace("Week of ", "");
}

export function VolumeChart(): React.JSX.Element {
  const [weeks, setWeeks] = useState<4 | 8 | 12>(8);

  const { data, isLoading } = useQuery<{ data: WeekVolume[] }>({
    queryKey: ["progress", "volume", weeks],
    queryFn: () => authApi.get<{ data: WeekVolume[] }>(`/me/progress/volume?weeks=${weeks}`),
    staleTime: 5 * 60 * 1000,
  });

  const chartData = (data?.data ?? []).map((d) => ({
    ...d,
    label: shortLabel(d.week),
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground text-sm">Weekly Volume</p>
          <p className="text-xs text-muted-foreground">kg lifted per week</p>
        </div>
        <div className="flex gap-1">
          {RANGES.map(({ label, weeks: w }) => (
            <button
              key={label}
              onClick={() => setWeeks(w)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                weeks === w
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={192}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 32, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#8b8fa8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="volume"
              tickFormatter={formatKg}
              tick={{ fontSize: 11, fill: "#8b8fa8" }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <YAxis
              yAxisId="sessions"
              orientation="right"
              tick={{ fontSize: 11, fill: "#8b8fa8" }}
              axisLine={false}
              tickLine={false}
              width={28}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1d27",
                border: "1px solid #2a2d3a",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#f0f0f0",
              }}
              formatter={(value, name) => {
                const v = Number(value);
                if (name === "totalVolume") return [`${v.toLocaleString()} kg`, "Volume"];
                return [v, "Sessions"];
              }}
              labelStyle={{ color: "#8b8fa8", marginBottom: 4 }}
            />
            <Bar
              yAxisId="volume"
              dataKey="totalVolume"
              fill="#1D9E75"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
            <Line
              yAxisId="sessions"
              type="monotone"
              dataKey="sessionCount"
              stroke="#ccff00"
              strokeWidth={2}
              dot={{ r: 3, fill: "#ccff00", strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#1D9E75]" />
          Volume (kg)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-primary" />
          Sessions
        </span>
      </div>
    </div>
  );
}
