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
  const [showManualLog, setShowManualLog] = useState(false);
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
      queryClient.invalidateQueries({ queryKey: ["me-programs-all"] });
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
  const lastLog = program.logs[0] ?? null;

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
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

      {/* Previous session */}
      {lastLog && (
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Last session</p>
          <div className="flex items-center gap-4 flex-wrap text-sm">
            {lastLog.actualSets && <span className="font-semibold text-foreground">{lastLog.actualSets} sets</span>}
            {lastLog.actualWeightKg && <span className="text-foreground">{lastLog.actualWeightKg} kg</span>}
            {lastLog.actualDurationMinutes && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />{lastLog.actualDurationMinutes} min
              </span>
            )}
            {lastLog.rpe && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                RPE {lastLog.rpe}/10
              </span>
            )}
          </div>
          {lastLog.sets && lastLog.sets.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {lastLog.sets.filter(setItem => setItem.completed).map((setItem) => (
                <span key={setItem.setNumber} className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                  {setItem.weightKg}kg × {setItem.reps}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(lastLog.completedAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
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

      {/* Primary CTAs */}
      {canLog && (
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full h-14 text-base font-bold gap-2"
            onClick={() => router.push(`/dashboard/programs/${programId}/session`)}
          >
            <Play className="h-5 w-5 fill-current" />
            Start workout
          </Button>
          <button
            onClick={() => setShowManualLog((prev) => !prev)}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showManualLog ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Log manually
          </button>
        </div>
      )}

      {/* Manual log form */}
      {canLog && showManualLog && (
        <div className="rounded-xl border border-border bg-card px-5 py-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Log workout manually</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Actual sets</label>
              <Input type="number" placeholder={displaySets ? String(displaySets) : "—"} value={logForm.actualSets} onChange={(event) => setLogForm((prev) => ({ ...prev, actualSets: event.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Actual reps</label>
              <Input placeholder={displayReps ? String(displayReps) : "e.g. 10"} value={logForm.actualReps} onChange={(event) => setLogForm((prev) => ({ ...prev, actualReps: event.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Weight used (kg)</label>
              <Input type="number" placeholder="Optional" value={logForm.actualWeightKg} onChange={(event) => setLogForm((prev) => ({ ...prev, actualWeightKg: event.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Duration (min)</label>
              <Input type="number" placeholder={displayDuration ? String(displayDuration) : "Optional"} value={logForm.actualDurationMinutes} onChange={(event) => setLogForm((prev) => ({ ...prev, actualDurationMinutes: event.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Effort (RPE {logForm.rpe > 0 ? logForm.rpe : "—"}/10)</label>
            <div className="flex gap-1.5">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((rpeValue) => (
                <button key={rpeValue} type="button" onClick={() => setLogForm((prev) => ({ ...prev, rpe: rpeValue }))}
                  className={`flex-1 h-8 rounded-md text-xs font-bold transition-colors ${rpeValue <= logForm.rpe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
                  {rpeValue}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Notes</label>
            <textarea rows={2} className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="How did it go?" value={logForm.notes} onChange={(event) => setLogForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </div>
          <Button onClick={submitLog} disabled={logMutation.isPending} className="w-full">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {logMutation.isPending ? "Saving…" : "Save log"}
          </Button>
        </div>
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
                  {workout.muscleGroups.map((muscle) => <span key={muscle} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{muscle}</span>)}
                </div>
              </CardContent>
            </Card>
          )}
          {workout.equipment?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Equipment</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {workout.equipment.map((equipItem) => <span key={equipItem} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{equipItem}</span>)}
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
              {steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{index + 1}</span>
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

      {/* Log history */}
      {program.logs.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Session history</h2>
          <div className="space-y-2">
            {program.logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border bg-card px-5 py-4 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">
                    {new Date(log.completedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  {log.rpe && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">RPE {log.rpe}/10</span>}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {log.actualSets && <span>{log.actualSets} sets</span>}
                  {log.actualWeightKg && <span>{log.actualWeightKg} kg avg</span>}
                  {log.actualDurationMinutes && <span>{log.actualDurationMinutes} min</span>}
                </div>
                {log.sets && log.sets.length > 0 && (
                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    {log.sets.filter(setItem => setItem.completed).map((setItem) => (
                      <span key={setItem.setNumber} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{setItem.weightKg}kg × {setItem.reps}</span>
                    ))}
                  </div>
                )}
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
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}
