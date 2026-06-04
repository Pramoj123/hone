"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, User } from "lucide-react";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Workout {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  muscleGroups: string[];
  durationMinutes: number | null;
}

interface PlanEntry {
  id: string;
  workoutId: string;
  workout: Workout;
  weekNumber: number;
  dayOfWeek: string;
  notes: string | null;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationMinutes: number | null;
}

interface ProgramPlan {
  id: string;
  name: string;
  description: string | null;
  totalWeeks: number;
  startDate: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  trainer: { id: string; name: string };
  entries: PlanEntry[];
}

interface PageProps {
  params: Promise<{ planId: string }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
type Day = (typeof DAYS)[number];
const DAY_LABELS: Record<Day, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: "bg-green-900/20 text-green-400",
  INTERMEDIATE: "bg-yellow-900/20 text-yellow-400",
  ADVANCED: "bg-red-900/20 text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", ACTIVE: "Active", COMPLETED: "Completed", CANCELLED: "Cancelled",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlanDetailPage({ params }: PageProps): React.JSX.Element {
  const { planId } = use(params);

  const { data: plan, isLoading } = useQuery<ProgramPlan>({
    queryKey: ["me-plan", planId],
    queryFn: () => authApi.get(`/me/program-plans/${planId}`),
  });

  if (isLoading) return <PlanSkeleton />;
  if (!plan) return (
    <div className="p-4 md:p-8">
      <p className="text-muted-foreground text-sm">Plan not found.</p>
    </div>
  );

  const startDate = new Date(plan.startDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Build grid: weekNumber → day → entries[]
  const grid: Record<number, Partial<Record<Day, PlanEntry[]>>> = {};
  for (const entry of plan.entries) {
    if (!grid[entry.weekNumber]) grid[entry.weekNumber] = {};
    const cell = grid[entry.weekNumber][entry.dayOfWeek as Day] ?? [];
    cell.push(entry);
    grid[entry.weekNumber][entry.dayOfWeek as Day] = cell;
  }

  const weeks = Array.from({ length: plan.totalWeeks }, (_, index) => index + 1);

  return (
    <div className="p-4 md:p-8 max-w-5xl space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/programs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to programs
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            plan.status === "ACTIVE" ? "bg-blue-900/20 text-blue-400" :
            plan.status === "COMPLETED" ? "bg-green-900/20 text-green-400" :
            "bg-muted text-muted-foreground"
          }`}>
            {STATUS_LABEL[plan.status]}
          </span>
        </div>
        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> {plan.trainer.name}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {plan.totalWeeks} weeks
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Starts {startDate}
          </span>
          <span className="text-muted-foreground/70">{plan.entries.length} workouts total</span>
        </div>
      </div>

      {/* Weekly schedule */}
      {weeks.map((week) => {
        const weekDays = grid[week] ?? {};
        const hasAny = DAYS.some((day) => (weekDays[day]?.length ?? 0) > 0);
        if (!hasAny) return null;

        return (
          <div key={week}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Week {week}
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => {
                const entries = weekDays[day] ?? [];
                return (
                  <div key={day} className="flex flex-col gap-1.5 min-w-0">
                    <p className={`text-[10px] font-semibold uppercase tracking-wider text-center pb-1 border-b ${
                      entries.length > 0 ? "text-primary border-primary/30" : "text-muted-foreground/40 border-border"
                    }`}>
                      {DAY_LABELS[day]}
                    </p>
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-md bg-card/80 border border-border p-1.5 text-center"
                      >
                        <div className={`text-[9px] px-1 py-0.5 rounded-full font-medium mb-1 inline-block ${
                          DIFFICULTY_COLOR[entry.workout.difficulty] ?? "bg-muted text-muted-foreground"
                        }`}>
                          {entry.workout.difficulty.charAt(0)}
                        </div>
                        <p className="text-[10px] font-medium text-foreground leading-tight truncate">
                          {entry.workout.name}
                        </p>
                        {(entry.targetSets || entry.targetReps) && (
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {[entry.targetSets && `${entry.targetSets}×`, entry.targetReps && `${entry.targetReps}`]
                              .filter(Boolean).join("")}
                          </p>
                        )}
                      </div>
                    ))}
                    {entries.length === 0 && (
                      <div className="rounded-md border border-dashed border-border/30 p-2 text-center">
                        <span className="text-[10px] text-muted-foreground/30">—</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlanSkeleton(): React.JSX.Element {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}
