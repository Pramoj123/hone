"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame } from "lucide-react";

interface Summary {
  currentStreak: number;
  workoutsThisMonth: number;
  volumeThisWeek: number;
  complianceLast30Days: {
    totalPrograms: number;
    completed: number;
    compliance: number;
  };
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${kg.toLocaleString()} kg`;
}

function complianceColor(pct: number): string {
  if (pct >= 80) return "text-green-400";
  if (pct >= 50) return "text-amber-400";
  return "text-red-400";
}

export function StatStrip(): React.JSX.Element {
  const { data, isLoading } = useQuery<Summary>({
    queryKey: ["progress", "summary"],
    queryFn: () => authApi.get<Summary>("/me/progress/summary"),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const compliance = data?.complianceLast30Days.compliance ?? 0;

  const stats = [
    {
      value: (
        <span className="flex items-center gap-1">
          <Flame className="h-5 w-5 text-orange-400" />
          {data?.currentStreak ?? "--"}
        </span>
      ),
      label: "day streak",
    },
    {
      value: <span>{data?.workoutsThisMonth ?? "--"}</span>,
      label: "workouts this month",
    },
    {
      value: <span>{data ? formatVolume(data.volumeThisWeek) : "--"}</span>,
      label: "volume this week",
    },
    {
      value: (
        <span className={data ? complianceColor(compliance) : ""}>
          {data ? `${compliance}%` : "--"}
        </span>
      ),
      label: "compliance (30d)",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(({ value, label }) => (
        <div
          key={label}
          className="rounded-xl border border-border bg-card px-5 py-4 flex flex-col gap-1"
        >
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}
