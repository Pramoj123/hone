"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";

// ── Types ───────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  status: string;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationMinutes: number | null;
  notes: string | null;
  workout: {
    id: string;
    name: string;
    category: string;
    difficulty: string;
    coverImageUrl: string | null;
    muscleGroups: string[];
    sets: string | null;
    reps: string | null;
    restSeconds: number | null;
    durationMinutes: number | null;
  };
  trainer: { name: string };
  logs: Array<{
    actualWeightKg: number | null;
    sets: Array<{ setNumber: number; weightKg: number; reps: number; completed: boolean }> | null;
  }>;
}

interface CompletedSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
}

type Phase = "presession" | "active" | "resting" | "summary";

const CATEGORY_EMOJI: Record<string, string> = {
  CARDIO: "🏃", STRENGTH: "🏋️", HIIT: "⚡", CORE: "🎯",
  FLEXIBILITY: "🧘", MOBILITY: "🔄", PLYOMETRICS: "💥",
};

// ── Page component ───────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ programId: string }>;
}

export default function SessionPage({ params }: PageProps): React.JSX.Element {
  const { programId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: program, isLoading } = useQuery<Program>({
    queryKey: ["me-program", programId],
    queryFn: () => authApi.get<Program>(`/me/programs/${programId}`),
  });

  const logMutation = useMutation({
    mutationFn: (payload: object) => authApi.post(`/me/programs/${programId}/logs`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-programs-all"] });
      queryClient.invalidateQueries({ queryKey: ["me-program", programId] });
      queryClient.invalidateQueries({ queryKey: ["me-logs"] });
      toast.success("Workout saved! Great work 💪");
      router.push("/dashboard/programs");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return <LoadingScreen />;
  if (!program) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f1117] flex items-center justify-center text-muted-foreground">
        Program not found.
      </div>
    );
  }

  return (
    <SessionUI
      program={program}
      onSave={(payload) => logMutation.mutate(payload)}
      isSaving={logMutation.isPending}
      onExit={() => router.push(`/dashboard/programs/${programId}`)}
    />
  );
}

// ── Session UI ───────────────────────────────────────────────────────────────

function SessionUI({
  program,
  onSave,
  isSaving,
  onExit,
}: {
  program: Program;
  onSave: (payload: object) => void;
  isSaving: boolean;
  onExit: () => void;
}): React.JSX.Element {
  const workout = program.workout;

  // Derived targets
  const totalSets = program.targetSets ?? (workout.sets ? parseInt(workout.sets) : null) ?? 3;
  const defaultReps = program.targetReps ?? (workout.reps ? parseInt(workout.reps) : null) ?? 10;
  const defaultWeight = program.targetWeightKg ?? null;
  const restSecs = workout.restSeconds ?? 60;

  // Session state
  const [phase, setPhase] = useState<Phase>("presession");
  const [currentSet, setCurrentSet] = useState(1); // 1-indexed
  const [completedSets, setCompletedSets] = useState<CompletedSet[]>([]);
  const [weight, setWeight] = useState(defaultWeight !== null ? String(defaultWeight) : "");
  const [reps, setReps] = useState(String(defaultReps));
  const [restLeft, setRestLeft] = useState(restSecs);
  const [sessionStartMs, setSessionStartMs] = useState(0);
  const [rpe, setRpe] = useState(0);
  const [notes, setNotes] = useState("");
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Rest timer via recursive setTimeout
  const restTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "resting") return;
    if (restLeft <= 0) {
      setPhase("active");
      return;
    }
    restTimerRef.current = setTimeout(() => {
      setRestLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) setPhase("active");
        return next;
      });
    }, 1000);
    return () => {
      if (restTimerRef.current) clearTimeout(restTimerRef.current);
    };
  }, [phase, restLeft]);

  function startSession() {
    setPhase("active");
    setSessionStartMs(Date.now());
  }

  function completeSet() {
    const weightKg = parseFloat(weight) || 0;
    const repsCount = parseInt(reps) || 0;
    const set: CompletedSet = { setNumber: currentSet, weightKg, reps: repsCount, completed: true };
    const newSets = [...completedSets, set];
    setCompletedSets(newSets);

    if (currentSet >= totalSets) {
      setPhase("summary");
    } else {
      setPhase("resting");
      setRestLeft(restSecs);
      setCurrentSet((n) => n + 1);
      setWeight(defaultWeight !== null ? String(defaultWeight) : "");
      setReps(String(defaultReps));
    }
  }

  function skipSet() {
    const weightKg = parseFloat(weight) || 0;
    const repsCount = parseInt(reps) || 0;
    const set: CompletedSet = { setNumber: currentSet, weightKg, reps: repsCount, completed: false };
    const newSets = [...completedSets, set];
    setCompletedSets(newSets);

    if (currentSet >= totalSets) {
      setPhase("summary");
    } else {
      setCurrentSet((n) => n + 1);
      setWeight(defaultWeight !== null ? String(defaultWeight) : "");
      setReps(String(defaultReps));
    }
  }

  function skipRest() {
    if (restTimerRef.current) clearTimeout(restTimerRef.current);
    setPhase("active");
  }

  function handleSave() {
    const doneSets = completedSets.filter((setItem) => setItem.completed);
    const durationMinutes = sessionStartMs
      ? Math.max(1, Math.round((Date.now() - sessionStartMs) / 60_000))
      : undefined;
    const avgWeight = doneSets.length
      ? Math.round((doneSets.reduce((acc, setItem) => acc + setItem.weightKg, 0) / doneSets.length) * 10) / 10
      : undefined;

    onSave({
      sets: completedSets,
      actualSets: doneSets.length,
      actualWeightKg: avgWeight,
      actualDurationMinutes: durationMinutes,
      rpe: rpe || undefined,
      notes: notes || undefined,
      completedAt: new Date().toISOString(),
    });
  }

  function tryExit() {
    if (completedSets.length > 0) {
      setShowExitDialog(true);
    } else {
      onExit();
    }
  }

  const totalVolume = completedSets
    .filter((setItem) => setItem.completed)
    .reduce((acc, setItem) => acc + setItem.weightKg * setItem.reps, 0);

  const durationMinutes = sessionStartMs
    ? Math.max(0, Math.round((Date.now() - sessionStartMs) / 60_000))
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#0f1117] flex flex-col overflow-hidden">

      {/* ── Pre-session ── */}
      {phase === "presession" && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0">
            <span className="text-lg font-bold text-foreground">hone<span className="text-primary">.</span></span>
            <button onClick={onExit} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              ✕ Cancel
            </button>
          </div>

          {/* Cover */}
          {workout.coverImageUrl && (
            <div className="h-48 shrink-0 overflow-hidden">
              <img src={workout.coverImageUrl} alt={workout.name} className="w-full h-full object-cover opacity-70" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{workout.category}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{workout.difficulty}</span>
              </div>
              <h1 className="text-3xl font-black text-foreground">{workout.name}</h1>
              {workout.muscleGroups?.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">{workout.muscleGroups.join(" · ")}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Sets" value={String(totalSets)} />
              <StatBox label="Reps" value={String(defaultReps)} />
              <StatBox label="Rest" value={`${restSecs}s`} />
            </div>
            {defaultWeight && <StatBox label="Target weight" value={`${defaultWeight} kg`} wide />}

            {program.notes && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-xs font-semibold text-primary mb-1">Trainer note</p>
                <p className="text-sm text-foreground">{program.notes}</p>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="px-6 pb-8 pt-4 shrink-0 border-t border-border">
            <Button size="lg" className="w-full h-14 text-lg font-black gap-3" onClick={startSession}>
              Let's go →
            </Button>
          </div>
        </div>
      )}

      {/* ── Active set ── */}
      {phase === "active" && (
        <div className="flex flex-col h-full">
          {/* Top bar */}
          <div className="px-6 py-4 shrink-0 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{workout.name}</p>
              <p className="text-sm text-foreground font-semibold mt-0.5">
                Set {currentSet} of {totalSets}
              </p>
            </div>
            <button onClick={tryExit} className="text-muted-foreground hover:text-foreground transition-colors">✕</button>
          </div>

          {/* Progress bar */}
          <div className="px-6 shrink-0">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${((currentSet - 1) / totalSets) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{currentSet - 1} done</span>
              <span>{totalSets - currentSet + 1} left</span>
            </div>
          </div>

          {/* Set number (large) */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
            <div className="text-center">
              <p className="text-[80px] font-black text-primary leading-none">{currentSet}</p>
              <p className="text-muted-foreground text-sm mt-1">of {totalSets} sets</p>
            </div>

            {/* Inputs */}
            <div className="w-full max-w-xs space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-2 text-center">Weight (kg)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                    placeholder="0"
                    className="w-full bg-card border border-border rounded-xl px-4 py-5 text-3xl font-bold text-center text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-2 text-center">Reps</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={reps}
                    onChange={(event) => setReps(event.target.value)}
                    placeholder="0"
                    className="w-full bg-card border border-border rounded-xl px-4 py-5 text-3xl font-bold text-center text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="px-6 pb-8 pt-4 shrink-0 space-y-3">
            <Button size="lg" className="w-full h-14 text-base font-bold" onClick={completeSet}>
              ✓ Complete set
            </Button>
            <button onClick={skipSet} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
              Skip this set
            </button>
          </div>
        </div>
      )}

      {/* ── Rest timer ── */}
      {phase === "resting" && (
        <div className="flex flex-col h-full items-center justify-center px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-6">Rest</p>
          <div className="relative flex items-center justify-center">
            {/* Circular indicator */}
            <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#1a1d27" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="44" fill="none" stroke="#ccff00" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - restLeft / restSecs)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute text-center">
              <p className="text-5xl font-black text-foreground">{restLeft}</p>
              <p className="text-xs text-muted-foreground">seconds</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">Next up</p>
            <p className="text-lg font-bold text-foreground mt-1">Set {currentSet} of {totalSets}</p>
            {(weight || defaultWeight) && (
              <p className="text-sm text-muted-foreground mt-1">
                {weight || defaultWeight} kg × {reps || defaultReps} reps
              </p>
            )}
          </div>

          <button
            onClick={skipRest}
            className="mt-10 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip rest →
          </button>
        </div>
      )}

      {/* ── Summary ── */}
      {phase === "summary" && (
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="px-6 py-4 shrink-0">
            <h1 className="text-2xl font-black text-foreground">Workout complete!</h1>
            <p className="text-muted-foreground text-sm mt-1">{workout.name}</p>
          </div>

          <div className="px-6 space-y-6 flex-1">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <SummaryBox
                label="Volume"
                value={totalVolume > 0 ? `${totalVolume.toLocaleString()} kg` : "—"}
              />
              <SummaryBox
                label="Duration"
                value={durationMinutes > 0 ? `${durationMinutes} min` : "—"}
              />
              <SummaryBox
                label="Sets done"
                value={`${completedSets.filter(setItem => setItem.completed).length}/${totalSets}`}
              />
            </div>

            {/* Per-set breakdown */}
            {completedSets.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Sets</p>
                <div className="space-y-2">
                  {completedSets.map((setItem) => (
                    <div key={setItem.setNumber} className={`flex items-center gap-3 rounded-lg px-4 py-3 ${setItem.completed ? "bg-card border border-border" : "bg-muted/30 border border-dashed border-border opacity-60"}`}>
                      <span className={`h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${setItem.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {setItem.setNumber}
                      </span>
                      <span className="text-sm font-semibold text-foreground flex-1">
                        {setItem.completed ? `${setItem.weightKg || 0} kg × ${setItem.reps || 0} reps` : "Skipped"}
                      </span>
                      {setItem.completed && setItem.weightKg > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(setItem.weightKg * setItem.reps)} kg vol
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RPE */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">
                How hard was it? (RPE {rpe > 0 ? `${rpe}/10` : "—"})
              </label>
              <div className="flex gap-1.5">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((rpeValue) => (
                  <button
                    key={rpeValue}
                    onClick={() => setRpe(rpeValue)}
                    className={`flex-1 h-10 rounded-lg text-xs font-bold transition-colors ${
                      rpeValue <= rpe
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {rpeValue}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>Easy</span><span>Max effort</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-2">
                Notes (optional)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="How did it feel? Any PRs or form notes…"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground resize-none placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Save */}
          <div className="px-6 pb-8 pt-4 shrink-0 space-y-3 border-t border-border mt-4">
            <Button size="lg" className="w-full h-14 text-base font-bold" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "💾 Save workout"}
            </Button>
            <button
              onClick={() => {
                setCompletedSets([]);
                setCurrentSet(1);
                setPhase("presession");
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Discard session
            </button>
          </div>
        </div>
      )}

      {/* ── Exit dialog ── */}
      {showExitDialog && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Leave workout?</h2>
            <p className="text-sm text-muted-foreground">
              You have {completedSets.filter(setItem => setItem.completed).length} set{completedSets.filter(setItem => setItem.completed).length !== 1 ? "s" : ""} completed. What would you like to do?
            </p>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => { setShowExitDialog(false); setPhase("summary"); }}
              >
                Save what I've done
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setShowExitDialog(false); }}
              >
                Keep going
              </Button>
              <button
                className="w-full text-sm text-destructive hover:text-destructive/80 transition-colors py-2"
                onClick={onExit}
              >
                Discard and leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatBox({ label, value, wide }: { label: string; value: string; wide?: boolean }): React.JSX.Element {
  return (
    <div className={`bg-card border border-border rounded-xl px-4 py-4 text-center ${wide ? "col-span-3" : ""}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-black text-primary">{value}</p>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-4 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-black text-foreground">{value}</p>
    </div>
  );
}

function LoadingScreen(): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 bg-[#0f1117] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Loading workout…</p>
      </div>
    </div>
  );
}
