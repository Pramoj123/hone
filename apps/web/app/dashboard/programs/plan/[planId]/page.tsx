"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, CalendarDays, Clock, User, Sparkles, Pencil, Trash2, Plus, Search, X,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  source: "TRAINER" | "SELF" | "AI";
  trainer: { id: string; name: string } | null;
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: plan, isLoading } = useQuery<ProgramPlan>({
    queryKey: ["me-plan", planId],
    queryFn: () => authApi.get(`/me/program-plans/${planId}`),
  });

  const activateMutation = useMutation({
    mutationFn: () => authApi.post<{ programsCreated: number }>(`/me/program-plans/${planId}/activate`, {}),
    onSuccess: (result: { programsCreated: number }) => {
      toast.success(`Plan activated — ${result.programsCreated} workouts scheduled`);
      queryClient.invalidateQueries({ queryKey: ["me-plan", planId] });
      queryClient.invalidateQueries({ queryKey: ["me-programs"] });
      router.push("/dashboard/programs?tab=upcoming");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => authApi.delete(`/me/program-plans/${planId}`),
    onSuccess: () => {
      toast.success("Draft plan deleted");
      queryClient.invalidateQueries({ queryKey: ["me-plans"] });
      router.push("/dashboard/programs?tab=plans");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => authApi.delete(`/me/program-plans/${planId}`),
    onSuccess: () => {
      router.push("/dashboard/programs/generate?mode=plan");
    },
    onError: (error: Error) => toast.error(error.message),
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

  const isReviewable = plan.status === "DRAFT" && plan.source !== "TRAINER";

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
            <User className="h-3.5 w-3.5" />
            {plan.trainer?.name ?? (plan.source === "AI" ? "AI Generated" : "Self-coached")}
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

      {/* Review banner — draft self/AI plans */}
      {isReviewable && !editing && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Review this draft plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Check the schedule below. Activating will add every workout to your programs with real dates.
              </p>
            </div>
          </div>
          {!showDeleteConfirm ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending}>
                {activateMutation.isPending ? "Activating…" : "Activate plan"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit entries
              </Button>
              {plan.source === "AI" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => regenerateMutation.mutate()}
                  disabled={regenerateMutation.isPending}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {regenerateMutation.isPending ? "Removing…" : "Regenerate"}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">Delete this draft plan permanently?</p>
              <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Deleting…" : "Yes, delete"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            </div>
          )}
        </div>
      )}

      {/* Entry editor or read-only schedule */}
      {editing ? (
        <EntryEditor
          plan={plan}
          onDone={() => {
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: ["me-plan", planId] });
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        weeks.map((week) => {
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
        })
      )}
    </div>
  );
}

// ── Entry editor ──────────────────────────────────────────────────────────────

interface EditableEntry {
  key: string;
  workoutId: string;
  workoutName: string;
  weekNumber: number;
  dayOfWeek: Day;
  targetSets: string;
  targetReps: string;
  targetWeightKg: string;
  targetDurationMinutes: string;
  notes: string;
}

function EntryEditor({ plan, onDone, onCancel }: {
  plan: ProgramPlan;
  onDone: () => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [entries, setEntries] = useState<EditableEntry[]>(() =>
    plan.entries.map((entry) => ({
      key: entry.id,
      workoutId: entry.workoutId,
      workoutName: entry.workout.name,
      weekNumber: entry.weekNumber,
      dayOfWeek: entry.dayOfWeek as Day,
      targetSets: entry.targetSets?.toString() ?? "",
      targetReps: entry.targetReps?.toString() ?? "",
      targetWeightKg: entry.targetWeightKg?.toString() ?? "",
      targetDurationMinutes: entry.targetDurationMinutes?.toString() ?? "",
      notes: entry.notes ?? "",
    })),
  );
  const [showPicker, setShowPicker] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      authApi.put(`/me/program-plans/${plan.id}/entries`, {
        entries: entries.map((entry) => ({
          workoutId: entry.workoutId,
          weekNumber: entry.weekNumber,
          dayOfWeek: entry.dayOfWeek,
          targetSets: entry.targetSets ? parseInt(entry.targetSets) : undefined,
          targetReps: entry.targetReps ? parseInt(entry.targetReps) : undefined,
          targetWeightKg: entry.targetWeightKg ? parseFloat(entry.targetWeightKg) : undefined,
          targetDurationMinutes: entry.targetDurationMinutes ? parseInt(entry.targetDurationMinutes) : undefined,
          notes: entry.notes || undefined,
        })),
      }),
    onSuccess: () => {
      toast.success("Plan entries updated");
      onDone();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateEntry = (key: string, patch: Partial<EditableEntry>) => {
    setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)));
  };

  const weeks = Array.from({ length: plan.totalWeeks }, (_, index) => index + 1);
  const sorted = [...entries].sort(
    (a, b) => a.weekNumber - b.weekNumber || DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Edit entries</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || entries.length === 0}
          >
            {saveMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((entry) => (
          <div key={entry.key} className="rounded-lg border border-border bg-card/60 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground truncate">{entry.workoutName}</p>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                onClick={() => setEntries((current) => current.filter((e) => e.key !== entry.key))}
                aria-label="Remove entry"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <select
                className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                value={entry.weekNumber}
                onChange={(e) => updateEntry(entry.key, { weekNumber: parseInt(e.target.value) })}
              >
                {weeks.map((week) => <option key={week} value={week}>Week {week}</option>)}
              </select>
              <select
                className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                value={entry.dayOfWeek}
                onChange={(e) => updateEntry(entry.key, { dayOfWeek: e.target.value as Day })}
              >
                {DAYS.map((day) => <option key={day} value={day}>{DAY_LABELS[day]}</option>)}
              </select>
              <Input
                className="h-9 text-xs"
                placeholder="Sets"
                value={entry.targetSets}
                onChange={(e) => updateEntry(entry.key, { targetSets: e.target.value })}
              />
              <Input
                className="h-9 text-xs"
                placeholder="Reps"
                value={entry.targetReps}
                onChange={(e) => updateEntry(entry.key, { targetReps: e.target.value })}
              />
              <Input
                className="h-9 text-xs"
                placeholder="Kg"
                value={entry.targetWeightKg}
                onChange={(e) => updateEntry(entry.key, { targetWeightKg: e.target.value })}
              />
              <Input
                className="h-9 text-xs"
                placeholder="Min"
                value={entry.targetDurationMinutes}
                onChange={(e) => updateEntry(entry.key, { targetDurationMinutes: e.target.value })}
              />
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">
            No entries — add at least one workout before saving.
          </p>
        )}
      </div>

      {showPicker ? (
        <WorkoutPickerInline
          onSelect={(workout) => {
            setEntries((current) => [
              ...current,
              {
                key: `new-${Date.now()}`,
                workoutId: workout.id,
                workoutName: workout.name,
                weekNumber: 1,
                dayOfWeek: "MON",
                targetSets: "",
                targetReps: "",
                targetWeightKg: "",
                targetDurationMinutes: "",
                notes: "",
              },
            ]);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowPicker(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add workout
        </Button>
      )}
    </div>
  );
}

function WorkoutPickerInline({ onSelect, onClose }: {
  onSelect: (workout: Workout) => void;
  onClose: () => void;
}): React.JSX.Element {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ data: Workout[] }>({
    queryKey: ["workouts-picker", search],
    queryFn: () => authApi.get(`/workouts?search=${encodeURIComponent(search)}&limit=30&globalOnly=true`),
    staleTime: 60_000,
  });

  const workouts = data?.data ?? [];

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search workouts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-9 rounded-lg" />)}
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {workouts.map((workout) => (
            <button
              key={workout.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={() => onSelect(workout)}
            >
              <span className="font-medium">{workout.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">{workout.category} · {workout.difficulty}</span>
            </button>
          ))}
          {workouts.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">No workouts found</p>
          )}
        </div>
      )}
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
