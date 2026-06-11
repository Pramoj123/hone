"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { StatStrip } from "@/components/charts/stat-strip";
import { VolumeChart } from "@/components/charts/volume-chart";
import { ActivityHeatmap } from "@/components/charts/activity-heatmap";
import { PRBoard } from "@/components/charts/pr-board";
import { ExerciseDrilldown } from "@/components/charts/exercise-drilldown";

interface PR {
  workoutId: string;
  workoutName: string;
}

export default function ProgressPage(): React.JSX.Element {
  // Fetch PRs here so we can pass the exercise list to the drilldown selector
  const { data: prsData } = useQuery<{ data: PR[] }>({
    queryKey: ["progress", "prs"],
    queryFn: () => authApi.get<{ data: PR[] }>("/me/progress/prs"),
    staleTime: 5 * 60 * 1000,
  });

  const prs = prsData?.data ?? [];

  return (
    <div className="p-4 md:p-8 space-y-10 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Progress</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your fitness journey over time</p>
      </div>

      {/* Section 1 — Stat strip */}
      <StatStrip />

      {/* Section 2 — Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <VolumeChart />
        </div>
        <div className="lg:col-span-2">
          <ActivityHeatmap />
        </div>
      </div>

      {/* Section 3 — PR board */}
      <PRBoard />

      {/* Section 4 — Exercise drill-down */}
      <ExerciseDrilldown prs={prs} />
    </div>
  );
}
