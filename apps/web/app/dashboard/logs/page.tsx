"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";

interface WorkoutLog {
  id: string;
  sets: Array<{ setNumber: number; weightKg: number; reps: number; completed: boolean }> | null;
  actualSets: number | null;
  actualReps: string | null;
  actualWeightKg: number | null;
  actualDurationMinutes: number | null;
  rpe: number | null;
  notes: string | null;
  completedAt: string;
  program: {
    id: string;
    workout: { id: string; name: string; category: string; difficulty: string };
  };
}

const CATEGORY_EMOJI: Record<string, string> = {
  CARDIO: "🏃", STRENGTH: "🏋️", HIIT: "⚡", CORE: "🎯",
  FLEXIBILITY: "🧘", MOBILITY: "🔄", PLYOMETRICS: "💥",
};

function groupByDate(logs: WorkoutLog[]): Map<string, WorkoutLog[]> {
  const map = new Map<string, WorkoutLog[]>();
  for (const log of logs) {
    const key = new Date(log.completedAt).toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const group = map.get(key) ?? [];
    group.push(log);
    map.set(key, group);
  }
  return map;
}

function totalVolume(log: WorkoutLog): number | null {
  if (!log.sets || log.sets.length === 0) {
    if (log.actualWeightKg && log.actualSets) {
      return Math.round(log.actualWeightKg * (log.actualSets * 10));
    }
    return null;
  }
  const vol = log.sets.filter(setItem => setItem.completed).reduce((acc, setItem) => acc + setItem.weightKg * setItem.reps, 0);
  return vol > 0 ? Math.round(vol) : null;
}

const PAGE_SIZE = 20;

export default function LogsPage(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<{ data: WorkoutLog[]; meta: { total: number; totalPages: number } }>({
    queryKey: ["me-logs", page],
    queryFn: () => authApi.get(`/me/logs?limit=${PAGE_SIZE}&page=${page}`),
    staleTime: 30_000,
  });

  const logs = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const totalCount = data?.meta.total ?? 0;
  const grouped = groupByDate(logs);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Workout logs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isLoading ? "Loading…" : `${totalCount} session${totalCount !== 1 ? "s" : ""} recorded`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-xl" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
          No workouts logged yet. Complete a session to see it here.
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([date, dayLogs]) => (
            <section key={date}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {date}
              </h2>
              <div className="space-y-2">
                {dayLogs.map((log) => {
                  const vol = totalVolume(log);
                  const isOpen = expanded.has(log.id);
                  const hasSets = log.sets && log.sets.length > 0;

                  return (
                    <div key={log.id} className="rounded-xl border border-border bg-card overflow-hidden">
                      <button
                        className="w-full text-left px-5 py-4 flex items-start gap-4"
                        onClick={() => hasSets && toggleExpand(log.id)}
                      >
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
                          {CATEGORY_EMOJI[log.program.workout.category] ?? "💪"}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm">{log.program.workout.name}</p>
                          <div className="flex items-center flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                            {log.actualSets && (
                              <span className="flex items-center gap-1">
                                <Dumbbell className="h-3 w-3" />{log.actualSets} sets
                              </span>
                            )}
                            {log.actualWeightKg && <span>{log.actualWeightKg} kg avg</span>}
                            {vol && <span className="font-medium text-foreground">{vol.toLocaleString()} kg vol</span>}
                            {log.actualDurationMinutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />{log.actualDurationMinutes} min
                              </span>
                            )}
                            {log.rpe && (
                              <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                                RPE {log.rpe}
                              </span>
                            )}
                          </div>
                          {log.notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic truncate">{log.notes}</p>
                          )}
                        </div>

                        {hasSets && (
                          <div className="shrink-0 text-muted-foreground self-center">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        )}
                      </button>

                      {isOpen && hasSets && (
                        <div className="border-t border-border px-5 py-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                            Set breakdown
                          </p>
                          <div className="space-y-2">
                            {log.sets!.map((setItem) => (
                              <div
                                key={setItem.setNumber}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${setItem.completed ? "bg-muted/30" : "opacity-40"}`}
                              >
                                <span className={`h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${setItem.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                  {setItem.setNumber}
                                </span>
                                <span className="text-sm text-foreground">
                                  {setItem.completed ? `${setItem.weightKg} kg × ${setItem.reps} reps` : "Skipped"}
                                </span>
                                {setItem.completed && setItem.weightKg > 0 && (
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {Math.round(setItem.weightKg * setItem.reps)} kg
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
