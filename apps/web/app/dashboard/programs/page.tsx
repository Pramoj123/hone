"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight, Calendar, RotateCcw, CheckCircle2,
  Clock, XCircle, Dumbbell,
} from "lucide-react";

interface Program {
  id: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  targetSets: string | null;
  targetReps: string | null;
  targetWeightKg: number | null;
  targetDurationMinutes: number | null;
  scheduledDate: string | null;
  isRecurring: boolean;
  recurrenceDays: string[];
  notes: string | null;
  createdAt: string;
  workout: { id: string; name: string; category: string; difficulty: string; coverImageUrl: string | null };
  trainer: { id: string; name: string };
  _count: { logs: number };
}

const STATUS: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  PENDING: { label: "Pending", icon: Clock, cls: "bg-muted/50 text-muted-foreground border-border" },
  ACTIVE:  { label: "Active",  icon: Dumbbell, cls: "bg-primary/10 text-primary border-primary/30" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, cls: "bg-green-900/20 text-green-400 border-green-900/40" },
  CANCELLED: { label: "Cancelled", icon: XCircle, cls: "bg-red-900/20 text-red-400 border-red-900/40" },
};

const CATEGORY_EMOJI: Record<string, string> = {
  CARDIO: "🏃", STRENGTH: "🏋️", HIIT: "⚡", CORE: "🎯",
  FLEXIBILITY: "🧘", MOBILITY: "🔄", PLYOMETRICS: "💥",
};

export default function ProgramsPage(): React.JSX.Element {
  const router = useRouter();
  const [tab, setTab] = useState<"current" | "history">("current");

  const currentStatuses = ["PENDING", "ACTIVE"];
  const historyStatuses = ["COMPLETED", "CANCELLED"];

  const { data, isLoading } = useQuery<{ data: Program[]; meta: { total: number } }>({
    queryKey: ["me-programs", tab],
    queryFn: async () => {
      const statuses = tab === "current" ? currentStatuses : historyStatuses;
      const results = await Promise.all(
        statuses.map((s) => authApi.get<{ data: Program[]; meta: { total: number } }>(`/me/programs?status=${s}&limit=50`))
      );
      return {
        data: results.flatMap((r) => r.data),
        meta: { total: results.reduce((acc, r) => acc + r.meta.total, 0) },
      };
    },
  });

  const programs = data?.data ?? [];

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Programs</h1>
        <p className="text-muted-foreground text-sm mt-1">Workouts assigned by your trainer</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["current", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "current" ? "Current" : "History"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : programs.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
          {tab === "current" ? "No active programs. Your trainer will assign one soon." : "No past programs yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((p) => {
            const cfg = STATUS[p.status];
            const Icon = cfg.icon;
            return (
              <button
                key={p.id}
                onClick={() => router.push(`/dashboard/programs/${p.id}`)}
                className="w-full text-left flex items-start gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/30 transition-colors group"
              >
                {/* Cover */}
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-xl shrink-0 overflow-hidden mt-0.5">
                  {p.workout.coverImageUrl
                    ? <img src={p.workout.coverImageUrl} alt="" className="h-full w-full object-cover" />
                    : CATEGORY_EMOJI[p.workout.category] ?? "💪"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{p.workout.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.workout.category} · {p.workout.difficulty}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${cfg.cls}`}>
                      <Icon className="h-3 w-3" /> {cfg.label}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {(p.targetSets || p.targetReps) && (
                      <span>{[p.targetSets && `${p.targetSets} sets`, p.targetReps && `${p.targetReps} reps`].filter(Boolean).join(" × ")}</span>
                    )}
                    {p.isRecurring ? (
                      <span className="flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" />
                        {p.recurrenceDays.join(", ")}
                      </span>
                    ) : p.scheduledDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(p.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    {p._count.logs > 0 && (
                      <span>{p._count.logs} log{p._count.logs !== 1 ? "s" : ""}</span>
                    )}
                    <span>by {p.trainer.name}</span>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
