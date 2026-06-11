"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface DayData {
  date: string;
  hasSession: boolean;
  sessionCount: number;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function cellColor(count: number): string {
  if (count === 0) return "var(--muted)";
  if (count === 1) return "#9FE1CB";
  if (count === 2) return "#5DCAA5";
  return "#1D9E75";
}

// Build a flat 91-cell array (13 weeks × 7 days, Mon–Sun) aligned to Monday
function buildGrid(data: DayData[]): (DayData | null)[] {
  const map = new Map(data.map((d) => [d.date, d]));

  // Grid covers 13×7 = 91 days. Work out the Monday that starts the grid.
  // We want today to fall within the last week.
  const today = new Date();
  const todayDow = today.getUTCDay(); // 0=Sun
  const daysSinceMonday = todayDow === 0 ? 6 : todayDow - 1;

  // Last Monday of the grid (start of the current week)
  const lastWeekMonday = new Date(today);
  lastWeekMonday.setUTCDate(today.getUTCDate() - daysSinceMonday);
  lastWeekMonday.setUTCHours(0, 0, 0, 0);

  // Grid starts 12 weeks before that Monday
  const gridStart = new Date(lastWeekMonday);
  gridStart.setUTCDate(lastWeekMonday.getUTCDate() - 12 * 7);

  const cells: (DayData | null)[] = [];
  for (let i = 0; i < 91; i++) {
    const d = new Date(gridStart);
    d.setUTCDate(gridStart.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const inFuture = d > today;
    cells.push(inFuture ? null : (map.get(key) ?? { date: key, hasSession: false, sessionCount: 0 }));
  }
  return cells;
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ActivityHeatmap(): React.JSX.Element {
  const [tooltip, setTooltip] = useState<{ date: string; count: number } | null>(null);

  const { data, isLoading } = useQuery<{ data: DayData[] }>({
    queryKey: ["progress", "streak", 90],
    queryFn: () => authApi.get<{ data: DayData[] }>("/me/progress/streak-history?days=90"),
    staleTime: 5 * 60 * 1000,
  });

  // Compute current streak from data
  const streak = (() => {
    if (!data?.data) return 0;
    const days = [...data.data].reverse();
    let s = 0;
    for (const d of days) {
      if (d.hasSession) s++;
      else break;
    }
    return s;
  })();

  const cells = data?.data ? buildGrid(data.data) : Array(91).fill(null);

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div>
        <p className="font-semibold text-foreground text-sm">Activity</p>
        <p className="text-xs text-muted-foreground">Last 13 weeks</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-28 rounded-lg" />
      ) : (
        <>
          {/* Day-of-week labels */}
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: "repeat(7, 12px)" }}
          >
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="text-[9px] text-muted-foreground text-center leading-none pb-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Heatmap grid — 13 rows × 7 columns */}
          <div
            className="grid gap-[3px] relative"
            style={{ gridTemplateColumns: "repeat(7, 12px)" }}
            onMouseLeave={() => setTooltip(null)}
          >
            {cells.map((cell, i) => (
              <div
                key={i}
                title={
                  cell
                    ? `${formatDate(cell.date)} · ${cell.sessionCount} session${cell.sessionCount !== 1 ? "s" : ""}`
                    : undefined
                }
                className="rounded-[2px] cursor-default"
                style={{
                  width: 12,
                  height: 12,
                  background: cell ? cellColor(cell.sessionCount) : "transparent",
                  border: cell ? "none" : "1px dashed #2a2d3a",
                }}
                onMouseEnter={() =>
                  cell && setTooltip({ date: cell.date, count: cell.sessionCount })
                }
              />
            ))}
          </div>
        </>
      )}

      {/* Tooltip callout */}
      {tooltip && (
        <div className="text-xs text-muted-foreground px-1">
          {formatDate(tooltip.date)} · {tooltip.count} session{tooltip.count !== 1 ? "s" : ""}
        </div>
      )}

      {/* Streak callout */}
      <div className="flex items-center gap-2 text-sm">
        <span>🔥</span>
        <span className="font-semibold text-foreground">{streak}-day streak</span>
        {streak === 0 && (
          <span className="text-xs text-muted-foreground">Log a workout to start one</span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            className="rounded-[2px]"
            style={{ width: 12, height: 12, background: cellColor(n) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
