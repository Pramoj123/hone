"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PR {
  workoutId: string;
  workoutName: string;
}

interface ExerciseLog {
  completedAt: string;
  actualSets: number | null;
  actualReps: string | null;
  actualWeightKg: number | null;
  actualDurationMinutes: number | null;
  rpe: number | null;
  volumePerSession: number;
}

interface ExerciseData {
  workout: { id: string; name: string };
  logs: ExerciseLog[];
}

const CHART_STYLE = {
  contentStyle: {
    background: "#1a1d27",
    border: "1px solid #2a2d3a",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#f0f0f0",
  },
  labelStyle: { color: "#8b8fa8", marginBottom: 4 },
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ChartRow {
  date: string;
  volume: number;
  weight: number | undefined;
}

function MiniLineChart({
  data,
  dataKey,
  color,
  label,
}: {
  data: ChartRow[];
  dataKey: keyof ChartRow;
  color: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#8b8fa8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#8b8fa8" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            {...CHART_STYLE}
            formatter={(v) => [`${v ?? "—"}`, label]}
          />
          <Line
            type="monotone"
            dataKey={dataKey as string}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function LogTable({ logs }: { logs: ExerciseLog[] }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...logs].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  const displayed = expanded ? sorted : sorted.slice(0, 10);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {["Date", "Sets", "Reps", "Weight", "RPE", "Notes"].map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map((log, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
              <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                {fullDate(log.completedAt)}
              </td>
              <td className="px-4 py-2.5 text-xs text-foreground">{log.actualSets ?? "—"}</td>
              <td className="px-4 py-2.5 text-xs text-foreground">{log.actualReps ?? "—"}</td>
              <td className="px-4 py-2.5 text-xs text-foreground">
                {log.actualWeightKg != null ? `${log.actualWeightKg} kg` : "—"}
              </td>
              <td className="px-4 py-2.5 text-xs text-foreground">{log.rpe ?? "—"}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[120px] truncate">
                {/* notes field not in schema response, leave blank */}—
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length > 10 && (
        <div className="px-4 py-2 border-t border-border">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-primary hover:underline"
          >
            {expanded ? "Show less" : `Show all ${sorted.length} entries`}
          </button>
        </div>
      )}
    </div>
  );
}

export function ExerciseDrilldown({ prs }: { prs: PR[] }): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string>("");

  const { data, isLoading } = useQuery<ExerciseData>({
    queryKey: ["progress", "exercise", selectedId],
    queryFn: () => authApi.get<ExerciseData>(`/me/progress/exercise/${selectedId}`),
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedId,
  });

  const chartData: ChartRow[] = (data?.logs ?? []).map((l) => ({
    date: shortDate(l.completedAt),
    volume: Math.round(l.volumePerSession),
    weight: l.actualWeightKg ?? undefined,
  }));

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-base font-semibold text-foreground">Exercise History</h2>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="ml-auto text-sm rounded-lg border border-border bg-card text-foreground px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">— Select exercise —</option>
          {prs.map((pr) => (
            <option key={pr.workoutId} value={pr.workoutId}>
              {pr.workoutName}
            </option>
          ))}
        </select>
      </div>

      {!selectedId ? (
        <div className="py-14 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
          Select an exercise to see your history
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {data?.logs.length === 0 ? (
            <div className="py-10 text-center border border-border rounded-xl text-muted-foreground text-sm">
              No logs yet for this exercise
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MiniLineChart
                  data={chartData}
                  dataKey="volume"
                  color="#1D9E75"
                  label="Volume per session (kg)"
                />
                <MiniLineChart
                  data={chartData}
                  dataKey="weight"
                  color="#ccff00"
                  label="Max weight (kg)"
                />
              </div>
              <LogTable logs={data?.logs ?? []} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
