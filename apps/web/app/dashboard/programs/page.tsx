"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar, RotateCcw, CheckCircle2, Clock, Dumbbell, Zap, Flame,
  LayoutGrid, CalendarDays, User, ChevronRight, Plus, Sparkles,
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
  source: "TRAINER" | "SELF" | "AI";
  trainer: { id: string; name: string } | null;
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

interface ProgramPlan {
  id: string;
  name: string;
  description: string | null;
  totalWeeks: number;
  startDate: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  source: "TRAINER" | "SELF" | "AI";
  trainer: { id: string; name: string } | null;
  _count: { entries: number };
}

type Tab = "today" | "upcoming" | "completed" | "plans";

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

  const { data: plansData, isLoading: plansLoading } = useQuery<ProgramPlan[]>({
    queryKey: ["me-program-plans"],
    queryFn: () => authApi.get<ProgramPlan[]>("/me/program-plans"),
    staleTime: 60_000,
    enabled: tab === "plans",
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

  const plans = plansData ?? [];

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "today", label: "Today", count: today.length },
    { id: "upcoming", label: "Upcoming", count: upcoming.length },
    { id: "completed", label: "Completed", count: completed.length },
    { id: "plans", label: "Plans", count: plans.length },
  ];

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programs</h1>
          <p className="text-muted-foreground text-sm mt-1">Your workout programs</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/programs/generate"
            className="inline-flex items-center gap-1.5 text-xs font-medium border border-primary/50 text-primary rounded-lg px-3 py-1.5 hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />AI
          </Link>
          <Link
            href="/dashboard/programs/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />New
          </Link>
        </div>
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

      {tab === "plans" ? (
        plansLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-xl" />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
            No program plans assigned yet. Ask your trainer to create one for you.
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
          </div>
        )
      ) : isLoading ? (
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
          <div className="flex items-center gap-1 shrink-0">
            <SourceBadge source={program.source} />
            <StatusBadge status={program.status} />
          </div>
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

function SourceBadge({ source }: { source: "TRAINER" | "SELF" | "AI" }): React.JSX.Element | null {
  if (source === "TRAINER") return null;
  const cfg = {
    SELF: { label: "Self", cls: "bg-blue-900/20 text-blue-400 border-blue-900/40" },
    AI:   { label: "AI",   cls: "bg-purple-900/20 text-purple-400 border-purple-900/40" },
  } as const;
  const { label, cls } = cfg[source];
  return (
    <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function EmptyState({ tab }: { tab: Tab }): React.JSX.Element {
  const msgs: Record<Tab, string> = {
    today: "No workouts scheduled for today.",
    upcoming: "No upcoming programs.",
    completed: "No completed workouts yet.",
    plans: "No program plans yet.",
  };
  return (
    <div className="py-16 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
      {msgs[tab]}
    </div>
  );
}

function PlanCard({ plan }: { plan: ProgramPlan }): React.JSX.Element {
  const startDate = new Date(plan.startDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  const statusColor =
    plan.status === "ACTIVE" ? "text-primary" :
    plan.status === "COMPLETED" ? "text-green-400" :
    "text-muted-foreground";

  return (
    <Link
      href={`/dashboard/programs/plan/${plan.id}`}
      className="block rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <LayoutGrid className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground">{plan.name}</p>
            <span className={`text-xs font-medium ${statusColor}`}>{plan.status}</span>
          </div>
          {plan.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{plan.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {plan.totalWeeks} weeks
            </span>
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3 w-3" /> {plan._count.entries} workouts
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> {startDate}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {plan.trainer?.name ?? (plan.source === "AI" ? "AI Generated" : "Self-coached")}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>
    </Link>
  );
}
