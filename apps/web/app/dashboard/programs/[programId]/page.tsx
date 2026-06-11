"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Calendar, RotateCcw, CheckCircle2,
  ChevronDown, ChevronUp, Dumbbell, Play, Clock,
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

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
}

interface Program {
  id: string;
  status: string;
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
    description: string | null;
    instructions: string | null;
    tips: string | null;
    sets: string | null;
    reps: string | null;
    restSeconds: number | null;
    durationMinutes: number | null;
    muscleGroups: string[];
    equipment: string[];
    videoUrl: string | null;
  };
  trainer: { id: string; name: string };
  logs: WorkoutLog[];
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

// ── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  CARDIO: "🏃", STRENGTH: "🏋️", HIIT: "⚡", CORE: "🎯",
  FLEXIBILITY: "🧘", MOBILITY: "🔄", PLYOMETRICS: "💥",
};

function rpeLabel(rpe: number): string {
  if (rpe <= 3) return "Easy";
  if (rpe <= 5) return "Moderate";
  if (rpe <= 7) return "Hard";
  if (rpe <= 9) return "Very hard";
  return "Max effort";
}

function rpeBadgeColor(rpe: number): string {
  if (rpe <= 3) return "bg-green-900/30 text-green-400 border-green-900/40";
  if (rpe <= 5) return "bg-blue-900/30 text-blue-400 border-blue-900/40";
  if (rpe <= 7) return "bg-amber-900/30 text-amber-400 border-amber-900/40";
  return "bg-red-900/30 text-red-400 border-red-900/40";
}

function formatLogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ programId: string }>;
}

type Tab = "overview" | "history";

export default function ProgramDetailPage({ params }: PageProps): React.JSX.Element {
  const { programId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [showManualLog, setShowManualLog] = useState(false);
  const [logForm, setLogForm] = useState({
    actualSets: "", actualReps: "", actualWeightKg: "",
    actualDurationMinutes: "", rpe: 0, notes: "",
  });

  const { data: program, isLoading } = useQuery<Program>({
    queryKey: ["me-program", programId],
    queryFn: () => authApi.get<Program>(`/me/programs/${programId}`),
  });

  const { data: exerciseData, isLoading: historyLoading } = useQuery<ExerciseData>({
    queryKey: ["progress", "exercise", program?.workout.id],
    queryFn: () => authApi.get<ExerciseData>(`/me/progress/exercise/${program!.workout.id}`),
    staleTime: 5 * 60 * 1000,
    enabled: tab === "history" && !!program?.workout.id,
  });

  const logMutation = useMutation({
    mutationFn: (data: object) => authApi.post(`/me/programs/${programId}/logs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-program", programId] });
      queryClient.invalidateQueries({ queryKey: ["me-programs-all"] });
      queryClient.invalidateQueries({ queryKey: ["progress", "exercise", program?.workout.id] });
      setShowManualLog(false);
      setLogForm({ actualSets: "", actualReps: "", actualWeightKg: "", actualDurationMinutes: "", rpe: 0, notes: "" });
      toast.success("Workout logged!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submitLog(): void {
    const payload: Record<string, unknown> = {};
    if (logForm.actualSets) payload.actualSets = Number(logForm.actualSets);
    if (logForm.actualReps) payload.actualReps = logForm.actualReps;
    if (logForm.actualWeightKg) payload.actualWeightKg = Number(logForm.actualWeightKg);
    if (logForm.actualDurationMinutes) payload.actualDurationMinutes = Number(logForm.actualDurationMinutes);
    if (logForm.rpe) payload.rpe = logForm.rpe;
    if (logForm.notes) payload.notes = logForm.notes;
    logMutation.mutate(payload);
  }

  if (isLoading) return <ProgramSkeleton />;
  if (!program) return <div className="p-8 text-muted-foreground">Program not found.</div>;

  const workout = program.workout;
  const steps = workout.instructions ? workout.instructions.split("\n").filter(Boolean) : [];
  const displaySets = program.targetSets ?? (workout.sets ? parseInt(workout.sets) : null);
  const displayReps = program.targetReps ?? (workout.reps ? parseInt(workout.reps) : null);
  const displayDuration = program.targetDurationMinutes ?? workout.durationMinutes;
  const canLog = program.status === "ACTIVE" || program.status === "PENDING";

  return (
    // pb-24 leaves room for the sticky bottom bar on all screen sizes
    <div className="p-4 md:p-8 max-w-2xl space-y-6 pb-28">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard/programs" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Programs
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{workout.name}</span>
      </nav>

      {/* Cover */}
      {workout.coverImageUrl ? (
        <div className="rounded-xl overflow-hidden border border-border h-48">
          <img src={workout.coverImageUrl} alt={workout.name} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="h-32 rounded-xl bg-muted flex items-center justify-center text-5xl">
          {CATEGORY_EMOJI[workout.category] ?? "💪"}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{workout.category}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{workout.difficulty}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{workout.name}</h1>
          <p className="text-xs text-muted-foreground mt-1">Assigned by {program.trainer.name}</p>
        </div>
        <div className="text-xs text-muted-foreground shrink-0 text-right">
          {program.isRecurring ? (
            <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" />{program.recurrenceDays.join(", ")}</span>
          ) : program.scheduledDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(program.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border -mb-2">
        {(["overview", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview tab ────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Targets */}
          {(displaySets || displayReps || displayDuration || program.targetWeightKg) && (
            <Card>
              <CardHeader><CardTitle>Your targets</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {displaySets && <Metric label="Sets" value={String(displaySets)} />}
                  {displayReps && <Metric label="Reps" value={String(displayReps)} />}
                  {program.targetWeightKg && <Metric label="Weight" value={`${program.targetWeightKg} kg`} />}
                  {displayDuration && <Metric label="Duration" value={`${displayDuration} min`} />}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Previous session quick-view */}
          {program.logs[0] && (
            <div className="rounded-xl border border-border bg-card px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Last session</p>
              <div className="flex items-center gap-4 flex-wrap text-sm">
                {program.logs[0].actualSets && <span className="font-semibold text-foreground">{program.logs[0].actualSets} sets</span>}
                {program.logs[0].actualWeightKg && <span className="text-foreground">{program.logs[0].actualWeightKg} kg</span>}
                {program.logs[0].actualDurationMinutes && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />{program.logs[0].actualDurationMinutes} min
                  </span>
                )}
                {program.logs[0].rpe && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    RPE {program.logs[0].rpe}/10
                  </span>
                )}
              </div>
              {program.logs[0].sets && program.logs[0].sets.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {program.logs[0].sets.filter(s => s.completed).map((s) => (
                    <span key={s.setNumber} className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                      {s.weightKg}kg × {s.reps}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(program.logs[0].completedAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
              </p>
            </div>
          )}

          {/* Trainer notes */}
          {program.notes && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
              <p className="text-xs font-semibold text-primary mb-1.5">Trainer note</p>
              <p className="text-sm text-foreground leading-relaxed">{program.notes}</p>
            </div>
          )}

          {/* Manual log toggle + form */}
          {canLog && (
            <>
              <button
                onClick={() => setShowManualLog((prev) => !prev)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showManualLog ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Log manually
              </button>

              {showManualLog && (
                <div className="rounded-xl border border-border bg-card px-5 py-5 space-y-4">
                  <p className="text-sm font-semibold text-foreground">Log workout manually</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Actual sets</label>
                      <Input type="number" placeholder={displaySets ? String(displaySets) : "—"} value={logForm.actualSets} onChange={(e) => setLogForm((p) => ({ ...p, actualSets: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Actual reps</label>
                      <Input placeholder={displayReps ? String(displayReps) : "e.g. 10"} value={logForm.actualReps} onChange={(e) => setLogForm((p) => ({ ...p, actualReps: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Weight used (kg)</label>
                      <Input type="number" placeholder="Optional" value={logForm.actualWeightKg} onChange={(e) => setLogForm((p) => ({ ...p, actualWeightKg: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Duration (min)</label>
                      <Input type="number" placeholder={displayDuration ? String(displayDuration) : "Optional"} value={logForm.actualDurationMinutes} onChange={(e) => setLogForm((p) => ({ ...p, actualDurationMinutes: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Effort (RPE {logForm.rpe > 0 ? logForm.rpe : "—"}/10)</label>
                    <div className="flex gap-1.5">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                        <button key={v} type="button" onClick={() => setLogForm((p) => ({ ...p, rpe: v }))}
                          className={`flex-1 h-8 rounded-md text-xs font-bold transition-colors ${v <= logForm.rpe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Notes</label>
                    <textarea rows={2}
                      className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="How did it go?" value={logForm.notes} onChange={(e) => setLogForm((p) => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <Button onClick={submitLog} disabled={logMutation.isPending} className="w-full">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {logMutation.isPending ? "Saving…" : "Save log"}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* About */}
          {workout.description && (
            <Card>
              <CardHeader><CardTitle>About this exercise</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{workout.description}</p></CardContent>
            </Card>
          )}

          {/* Muscles + Equipment */}
          {(workout.muscleGroups?.length > 0 || workout.equipment?.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {workout.muscleGroups?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Muscles</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {workout.muscleGroups.map((m) => <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{m}</span>)}
                    </div>
                  </CardContent>
                </Card>
              )}
              {workout.equipment?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Equipment</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {workout.equipment.map((eq) => <span key={eq} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{eq}</span>)}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Instructions */}
          {steps.length > 0 && (
            <Card>
              <CardHeader><CardTitle>How to perform</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {steps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <p className="text-sm text-foreground leading-relaxed pt-0.5">{step.replace(/^\d+\.\s*/, "")}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          {workout.tips && (
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4">
              <p className="text-xs font-semibold text-yellow-400 mb-1.5">Form tips</p>
              <p className="text-sm text-foreground leading-relaxed">{workout.tips}</p>
            </div>
          )}

          {/* Video */}
          {workout.videoUrl && (
            <Card>
              <CardHeader><CardTitle>Video demonstration</CardTitle></CardHeader>
              <CardContent>
                {workout.videoUrl.includes("youtube") || workout.videoUrl.includes("youtu.be") ? (
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <iframe src={workout.videoUrl.replace("watch?v=", "embed/")} className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                ) : (
                  <video src={workout.videoUrl} controls className="w-full rounded-lg bg-black" />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── History tab ─────────────────────────────────────────────────── */}
      {tab === "history" && (
        <HistoryTab
          workoutId={workout.id}
          data={exerciseData}
          isLoading={historyLoading}
        />
      )}

      {/* ── Sticky bottom CTA bar ───────────────────────────────────────── */}
      {canLog && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-56 z-20 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <Button
              size="lg"
              className="w-full h-12 text-base font-bold gap-2"
              onClick={() => router.push(`/dashboard/programs/${programId}/session`)}
            >
              <Play className="h-4 w-4 fill-current" />
              Start workout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── History tab component ─────────────────────────────────────────────────────

function HistoryTab({
  workoutId,
  data,
  isLoading,
}: {
  workoutId: string;
  data: ExerciseData | undefined;
  isLoading: boolean;
}): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  const logs = data?.logs ?? [];
  const sorted = [...logs].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  const lastLog = sorted[0] ?? null;

  // Last 6 sessions for the sparkline, sorted oldest→newest for the chart
  const last6 = [...sorted].slice(0, 6).reverse();
  const sparkData = last6.map((l, i) => ({ i, volume: Math.round(l.volumePerSession) }));

  if (logs.length === 0) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
        No previous sessions — this will be your first time!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mini sparkline — volume trend, last 6 sessions */}
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">
          Volume trend — last {Math.min(6, last6.length)} sessions
        </p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={sparkData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#1D9E75"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Last time callout */}
      {lastLog && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Last time</p>
          <p className="text-xs text-muted-foreground">{formatLogDate(lastLog.completedAt)}</p>
          {(lastLog.actualWeightKg || lastLog.actualReps) && (
            <p className="text-sm text-foreground font-medium">
              You lifted{" "}
              {lastLog.actualWeightKg != null && (
                <span className="text-primary font-bold">{lastLog.actualWeightKg} kg</span>
              )}
              {lastLog.actualWeightKg != null && lastLog.actualReps && " for "}
              {lastLog.actualReps && (
                <span className="text-primary font-bold">{lastLog.actualReps} reps</span>
              )}
            </p>
          )}
          {lastLog.rpe != null && (
            <p className="text-sm text-foreground">
              Felt:{" "}
              <span className={`font-semibold inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${rpeBadgeColor(lastLog.rpe)}`}>
                {rpeLabel(lastLog.rpe)} ({lastLog.rpe}/10)
              </span>
            </p>
          )}
        </div>
      )}

      {/* Full log history */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2">
          All sessions ({sorted.length})
        </p>
        {sorted.map((log, i) => (
          <LogEntry key={i} log={log} />
        ))}
      </div>
    </div>
  );
}

// ── Log entry with expandable notes ──────────────────────────────────────────

function LogEntry({ log }: { log: ExerciseLog }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const parts: string[] = [];
  if (log.actualSets) parts.push(String(log.actualSets));
  if (log.actualReps) parts.push(log.actualReps);
  if (log.actualWeightKg != null) parts.push(`${log.actualWeightKg} kg`);
  const setsLabel = parts.join(" × ");

  const volume = Math.round(log.volumePerSession);

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="font-medium text-foreground">
            {formatLogDate(log.completedAt)}
          </p>

          {setsLabel && (
            <p className="text-sm text-foreground font-mono">{setsLabel}</p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {volume > 0 && (
              <span className="flex items-center gap-1">
                <Dumbbell className="h-3 w-3" />
                {volume.toLocaleString()} kg total
              </span>
            )}
            {log.actualDurationMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {log.actualDurationMinutes} min
              </span>
            )}
          </div>
        </div>

        {log.rpe != null && (
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-semibold ${rpeBadgeColor(log.rpe)}`}>
            {rpeLabel(log.rpe)}
          </span>
        )}
      </div>

      {/* Notes — truncated, tap to expand */}
      {/* Note: notes field isn't returned by the exercise endpoint, shown if present */}
      {"notes" in log && (log as ExerciseLog & { notes?: string | null }).notes && (
        <div className="mt-2">
          <p
            className={`text-xs text-muted-foreground italic leading-relaxed ${expanded ? "" : "truncate"}`}
            onClick={() => setExpanded((v) => !v)}
          >
            {(log as ExerciseLog & { notes?: string }).notes}
          </p>
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-primary hover:underline mt-0.5"
            >
              show more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Metric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="text-center bg-muted/40 rounded-lg px-3 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-bold text-primary">{value}</p>
    </div>
  );
}

function ProgramSkeleton(): React.JSX.Element {
  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}
