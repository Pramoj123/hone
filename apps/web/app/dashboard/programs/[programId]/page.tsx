"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Calendar, RotateCcw, CheckCircle2,
  ChevronDown, ChevronUp, Dumbbell,
} from "lucide-react";

interface WorkoutLog {
  id: string;
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
  targetSets: string | null;
  targetReps: string | null;
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
    durationMinutes: number | null;
    muscleGroups: string[];
    equipment: string[];
    videoUrl: string | null;
  };
  trainer: { id: string; name: string };
  logs: WorkoutLog[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  CARDIO: "🏃", STRENGTH: "🏋️", HIIT: "⚡", CORE: "🎯",
  FLEXIBILITY: "🧘", MOBILITY: "🔄", PLYOMETRICS: "💥",
};

interface PageProps {
  params: Promise<{ programId: string }>;
}

export default function ProgramDetailPage({ params }: PageProps): React.JSX.Element {
  const { programId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showLog, setShowLog] = useState(false);
  const [logForm, setLogForm] = useState({
    actualSets: "", actualReps: "", actualWeightKg: "",
    actualDurationMinutes: "", rpe: 0, notes: "",
  });

  const { data: program, isLoading } = useQuery<Program>({
    queryKey: ["me-program", programId],
    queryFn: () => authApi.get<Program>(`/me/programs/${programId}`),
  });

  const logMutation = useMutation({
    mutationFn: (data: object) => authApi.post(`/me/programs/${programId}/logs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-program", programId] });
      queryClient.invalidateQueries({ queryKey: ["me-programs"] });
      setShowLog(false);
      setLogForm({ actualSets: "", actualReps: "", actualWeightKg: "", actualDurationMinutes: "", rpe: 0, notes: "" });
    },
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

  const w = program.workout;
  const steps = w.instructions ? w.instructions.split("\n").filter(Boolean) : [];
  const displaySets = program.targetSets ?? w.sets;
  const displayReps = program.targetReps ?? w.reps;
  const displayDuration = program.targetDurationMinutes ?? w.durationMinutes;
  const canLog = program.status === "ACTIVE" || program.status === "PENDING";

  return (
    <div className="p-8 max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard/programs" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Programs
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{w.name}</span>
      </nav>

      {/* Cover + header */}
      {w.coverImageUrl ? (
        <div className="rounded-xl overflow-hidden border border-border h-48">
          <img src={w.coverImageUrl} alt={w.name} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="h-32 rounded-xl bg-muted flex items-center justify-center text-5xl">
          {CATEGORY_EMOJI[w.category] ?? "💪"}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              {w.category}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {w.difficulty}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{w.name}</h1>
          <p className="text-xs text-muted-foreground mt-1">Assigned by {program.trainer.name}</p>
        </div>

        {/* Schedule badge */}
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

      {/* Targets */}
      {(displaySets || displayReps || displayDuration || program.targetWeightKg) && (
        <Card>
          <CardHeader><CardTitle>Your targets</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {displaySets && <Metric label="Sets" value={displaySets} />}
              {displayReps && <Metric label="Reps / Time" value={displayReps} />}
              {program.targetWeightKg && <Metric label="Weight" value={`${program.targetWeightKg} kg`} />}
              {displayDuration && <Metric label="Duration" value={`${displayDuration} min`} />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trainer notes */}
      {program.notes && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
          <p className="text-xs font-semibold text-primary mb-1.5">Trainer note</p>
          <p className="text-sm text-foreground leading-relaxed">{program.notes}</p>
        </div>
      )}

      {/* Description */}
      {w.description && (
        <Card>
          <CardHeader><CardTitle>About this exercise</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{w.description}</p></CardContent>
        </Card>
      )}

      {/* Muscle groups + equipment */}
      {(w.muscleGroups.length > 0 || w.equipment.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {w.muscleGroups.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Muscles</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {w.muscleGroups.map((m) => (
                    <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{m}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {w.equipment.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Equipment</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {w.equipment.map((e) => (
                    <span key={e} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{e}</span>
                  ))}
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
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed pt-0.5">
                    {step.replace(/^\d+\.\s*/, "")}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      {w.tips && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4">
          <p className="text-xs font-semibold text-yellow-400 mb-1.5">Form tips</p>
          <p className="text-sm text-foreground leading-relaxed">{w.tips}</p>
        </div>
      )}

      {/* Video */}
      {w.videoUrl && (
        <Card>
          <CardHeader><CardTitle>Video demonstration</CardTitle></CardHeader>
          <CardContent>
            {w.videoUrl.includes("youtube") || w.videoUrl.includes("youtu.be") ? (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <iframe
                  src={w.videoUrl.replace("watch?v=", "embed/")}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video src={w.videoUrl} controls className="w-full rounded-lg bg-black" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Log workout */}
      {canLog && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            onClick={() => setShowLog((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              Log this workout
            </span>
            {showLog ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showLog && (
            <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Actual sets</label>
                  <Input type="number" placeholder={displaySets ?? "—"} value={logForm.actualSets} onChange={(e) => setLogForm((f) => ({ ...f, actualSets: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Actual reps</label>
                  <Input placeholder={displayReps ?? "e.g. 12, 10, 9"} value={logForm.actualReps} onChange={(e) => setLogForm((f) => ({ ...f, actualReps: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Weight used (kg)</label>
                  <Input type="number" placeholder="Optional" value={logForm.actualWeightKg} onChange={(e) => setLogForm((f) => ({ ...f, actualWeightKg: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Duration (min)</label>
                  <Input type="number" placeholder={displayDuration?.toString() ?? "Optional"} value={logForm.actualDurationMinutes} onChange={(e) => setLogForm((f) => ({ ...f, actualDurationMinutes: e.target.value }))} />
                </div>
              </div>

              {/* RPE */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Effort (RPE {logForm.rpe > 0 ? logForm.rpe : "—"}/10)
                </label>
                <div className="flex gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLogForm((f) => ({ ...f, rpe: n }))}
                      className={`flex-1 h-8 rounded-md text-xs font-bold transition-colors ${
                        n <= logForm.rpe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Easy</span><span>Max effort</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">How did it go?</label>
                <textarea
                  rows={3}
                  className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="How did you feel? Any notes…"
                  value={logForm.notes}
                  onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <Button onClick={submitLog} disabled={logMutation.isPending} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {logMutation.isPending ? "Saving…" : "Save workout log"}
              </Button>

              {logMutation.error && (
                <p className="text-sm text-destructive">{(logMutation.error as Error).message}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Log history */}
      {program.logs.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Log history</h2>
          <div className="space-y-2">
            {program.logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border bg-card px-5 py-4 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">
                    {new Date(log.completedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  {log.rpe && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      RPE {log.rpe}/10
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {log.actualSets && <span>{log.actualSets} sets</span>}
                  {log.actualReps && <span>{log.actualReps} reps</span>}
                  {log.actualWeightKg && <span>{log.actualWeightKg} kg</span>}
                  {log.actualDurationMinutes && <span>{log.actualDurationMinutes} min</span>}
                </div>
                {log.notes && <p className="text-xs text-muted-foreground mt-2 italic">{log.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

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
    <div className="p-8 max-w-2xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}
