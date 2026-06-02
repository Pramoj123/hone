"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar, RotateCcw, CheckCircle2, Clock, Dumbbell, Zap, Flame,
} from "lucide-react";
import { useState } from "react";

interface Program {
  id: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationMinutes: number | null;
  scheduledDate: string | null;
  isRecurring: boolean;
  recurrenceDays: string[];
  notes: string | null;
  createdAt: string;
  workout: {
    id: string;
    name: string;
    category: string;
    difficulty: string;
    coverImageUrl: string | null;
    sets: string | null;
    reps: string | null;
    durationMinutes: number | null;
  };
  trainer: { id: string; name: string };
  _count: { logs: number };
}

interface Log {
  id: string;
  completedAt: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  CARDIO: "🏃", STRENGTH: "🏋️", HIIT: "⚡", CORE: "🎯",
  FLEXIBILITY: "🧘", MOBILITY: "🔄", PLYOMETRICS: "💥",
};

const JS_DAY_TO_RECURRENCE = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function isToday(program: Program): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (program.isRecurring) {
    return program.recurrenceDays.includes(JS_DAY_TO_RECURRENCE[new Date().getDay()]);
  }
  if (!program.scheduledDate) return false;
  const scheduledDate = new Date(program.scheduledDate);
  scheduledDate.setHours(0, 0, 0, 0);
  return scheduledDate.getTime() === today.getTime();
}

function isUpcoming(program: Program): boolean {
  if (program.isRecurring) return false;
  if (!program.scheduledDate) return true; // no date = on-demand, show in upcoming
  const scheduledDate = new Date(program.scheduledDate);
  scheduledDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return scheduledDate.getTime() > today.getTime();
}

function computeStreak(logs: Log[]): number {
  if (!logs.length) return 0;
  const dayMs = 86_400_000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const doneDays = new Set(
    logs.map((log) => {
      const date = new Date(log.completedAt);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );
  let streak = 0;
  let cursor = today.getTime();
  while (doneDays.has(cursor)) {
    streak++;
    cursor -= dayMs;
  }
  return streak;
}

type Tab = "today" | "upcoming" | "completed";

export default function ProgramsPage(): React.JSX.Element {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("today");

  const { data: allData, isLoading } = useQuery<{ data: Program[] }>({
    queryKey: ["me-programs-all"],
    queryFn: () => authApi.get<{ data: Program[] }>("/me/programs?limit=100"),
    staleTime: 30_000,
  });

  const { data: logsData } = useQuery<{ data: Log[] }>({
    queryKey: ["me-logs-streak"],
    queryFn: () => authApi.get<{ data: Log[] }>("/me/logs?limit=60"),
    staleTime: 60_000,
  });

  const all = allData?.data ?? [];
  const streak = computeStreak(logsData?.data ?? []);

  const today = all.filter(
    (p) => (p.status === "PENDING" || p.status === "ACTIVE") && isToday(p)
  );
  const upcoming = all.filter(
    (p) => (p.status === "PENDING" || p.status === "ACTIVE") && !isToday(p)
  );
  const completed = all.filter((program) => program.status === "COMPLETED" || program.status === "CANCELLED");

  const displayed = tab === "today" ? today : tab === "upcoming" ? upcoming : completed;

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "today", label: "Today", count: today.length },
    { id: "upcoming", label: "Upcoming", count: upcoming.length },
    { id: "completed", label: "Completed", count: completed.length },
  ];

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Programs</h1>
        <p className="text-muted-foreground text-sm mt-1">Workouts assigned by your trainer</p>
      </div>

      {/* Streak widget */}
      {streak > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground">
              {streak} day{streak !== 1 ? "s" : ""} streak
            </p>
            <p className="text-xs text-muted-foreground">Keep it going — don't break the chain!</p>
          </div>
          <span className="ml-auto text-3xl font-black text-primary">{streak}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-3">
          {displayed.map((program) => <ProgramCard key={program.id} p={program} onClick={() => router.push(`/dashboard/programs/${program.id}`)} />)}
        </div>
      )}
    </div>
  );
}

function ProgramCard({ p: program, onClick }: { p: Program; onClick: () => void }): React.JSX.Element {
  const workout = program.workout;
  const displaySets = program.targetSets ?? (workout.sets ? parseInt(workout.sets) : null);
  const displayReps = program.targetReps ?? (workout.reps ? parseInt(workout.reps) : null);
  const canStart = program.status === "PENDING" || program.status === "ACTIVE";

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 transition-all group"
    >
      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-xl shrink-0 overflow-hidden mt-0.5">
        {workout.coverImageUrl
          ? <img src={workout.coverImageUrl} alt="" className="h-full w-full object-cover" />
          : CATEGORY_EMOJI[workout.category] ?? "💪"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-foreground text-sm leading-tight">{workout.name}</p>
          <StatusBadge status={program.status} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{workout.category} · {workout.difficulty}</p>

        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {(displaySets || displayReps) && (
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3 w-3" />
              {[displaySets && `${displaySets} sets`, displayReps && `${displayReps} reps`].filter(Boolean).join(" × ")}
            </span>
          )}
          {program.targetWeightKg && <span>{program.targetWeightKg} kg</span>}
          {program.isRecurring ? (
            <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" />{program.recurrenceDays.join(", ")}</span>
          ) : program.scheduledDate ? (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(program.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          ) : (
            <span className="flex items-center gap-1 italic"><Zap className="h-3 w-3" />On-demand</span>
          )}
          {program._count.logs > 0 && <span>{program._count.logs} log{program._count.logs !== 1 ? "s" : ""}</span>}
        </div>
      </div>

      {canStart && (
        <div className="shrink-0 flex items-center self-center">
          <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Start →
          </span>
        </div>
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const cfg: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
    PENDING:   { label: "Pending",   cls: "bg-muted/50 text-muted-foreground border-border", Icon: Clock },
    ACTIVE:    { label: "Active",    cls: "bg-primary/10 text-primary border-primary/30", Icon: Dumbbell },
    COMPLETED: { label: "Done",      cls: "bg-green-900/20 text-green-400 border-green-900/40", Icon: CheckCircle2 },
    CANCELLED: { label: "Cancelled", cls: "bg-red-900/20 text-red-400 border-red-900/40", Icon: Clock },
  };
  const { label, cls, Icon } = cfg[status] ?? cfg.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

function EmptyState({ tab }: { tab: Tab }): React.JSX.Element {
  const msgs: Record<Tab, string> = {
    today: "No workouts scheduled for today. Check 'Upcoming' or ask your trainer.",
    upcoming: "No upcoming programs. Your trainer will schedule workouts soon.",
    completed: "No completed workouts yet. Finish your first session to see it here.",
  };
  return (
    <div className="py-16 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
      {msgs[tab]}
    </div>
  );
}
