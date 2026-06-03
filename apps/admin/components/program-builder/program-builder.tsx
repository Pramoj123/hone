"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronRight, ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutPicker } from "./workout-picker";
import { WeeklyGrid } from "./weekly-grid";
import { EntryConfigModal } from "./entry-config-modal";
import {
  DAYS, DAY_LABELS,
  type Workout, type EntryDraft, type GridState, type PlanDetails,
  type ProgramPlan, type RecurrenceDay,
  flattenGrid, buildGridFromEntries, newDraftId,
} from "./types";

// ── Step 1 form ────────────────────────────────────────────────────────────

const step1Schema = z.object({
  clientId: z.string().min(1, "Select a client"),
  name: z.string().min(2, "Plan name required"),
  description: z.string().optional(),
  totalWeeks: z.coerce.number().int().min(1).max(52),
  startDate: z.string().min(1, "Start date required"),
});
type Step1Form = z.infer<typeof step1Schema>;

function nextMonday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun … 6=Sat
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const d = new Date(today);
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().slice(0, 10);
}

// ── Main component ─────────────────────────────────────────────────────────

interface ProgramBuilderProps {
  gymSlug: string;
  existingPlanId?: string;
}

export function ProgramBuilder({ gymSlug, existingPlanId }: ProgramBuilderProps): React.JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(existingPlanId ? 2 : 1);
  const [planId, setPlanId] = useState<string | null>(existingPlanId ?? null);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);
  const [grid, setGrid] = useState<GridState>({});
  const [activeWeek, setActiveWeek] = useState(1);
  const [draggingWorkout, setDraggingWorkout] = useState<Workout | null>(null);
  const [editingEntry, setEditingEntry] = useState<EntryDraft | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Load existing plan for edit mode ────────────────────────────────────

  const { data: existingPlan } = useQuery<ProgramPlan>({
    queryKey: ["program-plan", existingPlanId],
    queryFn: () => authApi.get(`/gyms/${gymSlug}/program-plans/${existingPlanId}`),
    enabled: !!existingPlanId,
  });

  useEffect(() => {
    if (existingPlan) {
      setPlanDetails({
        clientId: existingPlan.clientId,
        clientName: existingPlan.client.name,
        name: existingPlan.name,
        description: existingPlan.description ?? undefined,
        totalWeeks: existingPlan.totalWeeks,
        startDate: existingPlan.startDate.slice(0, 10),
      });
      setGrid(buildGridFromEntries(existingPlan.entries));
    }
  }, [existingPlan]);

  // ── Workout list for picker ──────────────────────────────────────────────

  const { data: workoutsData, isLoading: workoutsLoading } = useQuery<{ data: Workout[] }>({
    queryKey: ["gym-workouts-builder", gymSlug],
    queryFn: () => authApi.get(`/gyms/${gymSlug}/workouts?limit=100&scope=all`),
    staleTime: 5 * 60_000,
  });
  const workouts = workoutsData?.data ?? [];

  // ── Members list for client selector ────────────────────────────────────

  const { data: members } = useQuery<Array<{ id: string; name: string; email: string; memberNumber: string | null }>>({
    queryKey: ["members", gymSlug],
    queryFn: () => authApi.get(`/gyms/${gymSlug}/members`),
    staleTime: 5 * 60_000,
  });

  // ── Step 1: Create plan ──────────────────────────────────────────────────

  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: { totalWeeks: 4, startDate: nextMonday() },
  });

  const createPlanMutation = useMutation({
    mutationFn: (data: Step1Form) =>
      authApi.post<ProgramPlan>(`/gyms/${gymSlug}/program-plans`, data),
    onSuccess: (plan) => {
      setPlanId(plan.id);
      const client = members?.find((member) => member.id === plan.clientId);
      setPlanDetails({
        clientId: plan.clientId,
        clientName: plan.client.name ?? client?.name ?? "",
        name: plan.name,
        description: plan.description ?? undefined,
        totalWeeks: plan.totalWeeks,
        startDate: plan.startDate.slice(0, 10),
      });
      setStep(2);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ── Step 2: Save entries ─────────────────────────────────────────────────

  const saveEntriesMutation = useMutation({
    mutationFn: () =>
      authApi.put<ProgramPlan>(`/gyms/${gymSlug}/program-plans/${planId}/entries`, {
        entries: flattenGrid(grid),
      }),
    onSuccess: () => toast.success("Draft saved"),
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleSaveAndAdvance(): Promise<void> {
    await saveEntriesMutation.mutateAsync();
    setStep(3);
  }

  // ── Step 3: Activate ─────────────────────────────────────────────────────

  const activateMutation = useMutation({
    mutationFn: () =>
      authApi.post<{ plan: ProgramPlan; programsCreated: number }>(
        `/gyms/${gymSlug}/program-plans/${planId}/activate`,
        {},
      ),
    onSuccess: ({ plan, programsCreated }) => {
      toast.success(`Plan activated — ${programsCreated} programs created for ${plan.client.name}`);
      router.push(`/${gymSlug}/members/${plan.clientId}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ── DnD handlers ─────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent): void {
    const { workout } = event.active.data.current as { workout: Workout };
    setDraggingWorkout(workout);
  }

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      setDraggingWorkout(null);
      const { active, over } = event;
      if (!over) return;

      const workout = (active.data.current as { workout: Workout }).workout;
      const overId = over.id as string;

      // Parse cell id: cell-w{week}-d{day}
      const match = overId.match(/^cell-w(\d+)-d([A-Z]+)$/);
      if (!match) return;

      const week = Number(match[1]);
      const day = match[2] as RecurrenceDay;

      setGrid((prev) => {
        const weekGrid = prev[week] ?? {};
        const dayEntries = weekGrid[day] ?? [];
        return {
          ...prev,
          [week]: {
            ...weekGrid,
            [day]: [...dayEntries, { draftId: newDraftId(), workoutId: workout.id, workout }],
          },
        };
      });
    },
    [],
  );

  function removeEntry(weekNumber: number, day: RecurrenceDay, draftId: string): void {
    setGrid((prev) => {
      const weekGrid = prev[weekNumber] ?? {};
      const dayEntries = (weekGrid[day] ?? []).filter((entry) => entry.draftId !== draftId);
      return { ...prev, [weekNumber]: { ...weekGrid, [day]: dayEntries } };
    });
  }

  function updateEntry(updated: EntryDraft): void {
    setGrid((prev) => {
      const next = { ...prev };
      for (const [week, days] of Object.entries(next)) {
        const weekNum = Number(week);
        for (const day of DAYS) {
          const dayEntries = days[day];
          if (!dayEntries) continue;
          const idx = dayEntries.findIndex((entry) => entry.draftId === updated.draftId);
          if (idx !== -1) {
            next[weekNum] = {
              ...days,
              [day]: dayEntries.map((entry, index) => (index === idx ? updated : entry)),
            };
            return next;
          }
        }
      }
      return next;
    });
    setEditingEntry(null);
  }

  const totalEntries = flattenGrid(grid).length;
  const activeWeeksCount = Object.keys(grid).filter((week) =>
    DAYS.some((day) => (grid[Number(week)][day]?.length ?? 0) > 0),
  ).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Step indicator */}
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-2 max-w-xl">
          {(["Plan details", "Build schedule", "Review & activate"] as const).map((label, index) => {
            const stepNum = (index + 1) as 1 | 2 | 3;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step > stepNum ? "bg-green-500 text-white" :
                  step === stepNum ? "bg-foreground text-background" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {step > stepNum ? <CheckCircle2 className="h-3.5 w-3.5" /> : stepNum}
                </div>
                <span className={`text-sm ${step === stepNum ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {index < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className="flex-1 p-6 md:p-8 max-w-lg">
          <h1 className="text-2xl font-bold text-foreground mb-1">New program plan</h1>
          <p className="text-sm text-muted-foreground mb-6">Define the plan basics before building the schedule.</p>

          <form
            onSubmit={step1Form.handleSubmit((data) => createPlanMutation.mutate(data))}
            className="space-y-5"
          >
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Client <span className="text-destructive">*</span>
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...step1Form.register("clientId")}
              >
                <option value="">Select client…</option>
                {(members ?? []).map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.memberNumber ? `(${member.memberNumber})` : ""}
                  </option>
                ))}
              </select>
              {step1Form.formState.errors.clientId && (
                <p className="text-xs text-destructive mt-1">{step1Form.formState.errors.clientId.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Plan name <span className="text-destructive">*</span>
              </label>
              <Input placeholder="e.g. 8-week strength block" {...step1Form.register("name")} />
              {step1Form.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">{step1Form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Description (optional)</label>
              <textarea
                rows={2}
                placeholder="Brief overview of this plan…"
                className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                {...step1Form.register("description")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Total weeks <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  {...step1Form.register("totalWeeks")}
                />
                {step1Form.formState.errors.totalWeeks && (
                  <p className="text-xs text-destructive mt-1">{step1Form.formState.errors.totalWeeks.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Start date <span className="text-destructive">*</span>
                </label>
                <Input type="date" {...step1Form.register("startDate")} />
                {step1Form.formState.errors.startDate && (
                  <p className="text-xs text-destructive mt-1">{step1Form.formState.errors.startDate.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={createPlanMutation.isPending} className="w-full sm:w-auto">
              {createPlanMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</>
              ) : (
                <>Continue <ChevronRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && planDetails && (
        <div className="flex flex-col flex-1 min-h-0">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: Workout picker */}
              <div className="w-[260px] shrink-0 border-r border-border flex flex-col overflow-hidden">
                <WorkoutPicker workouts={workouts} isLoading={workoutsLoading} />
              </div>

              {/* Right: Weekly grid */}
              <div className="flex-1 flex flex-col min-w-0 p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div>
                    <h2 className="font-semibold text-foreground">{planDetails.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {planDetails.clientName} · {planDetails.totalWeeks} weeks from{" "}
                      {new Date(planDetails.startDate).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <WeeklyGrid
                  totalWeeks={planDetails.totalWeeks}
                  activeWeek={activeWeek}
                  onWeekChange={setActiveWeek}
                  grid={grid}
                  onRemoveEntry={removeEntry}
                  onEditEntry={(entry) => setEditingEntry(entry)}
                />
              </div>
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {draggingWorkout && (
                <div className="rounded-lg border border-primary bg-card shadow-lg p-3 w-52 opacity-95">
                  <p className="text-sm font-medium text-foreground truncate">{draggingWorkout.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{draggingWorkout.difficulty}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Bottom bar */}
          <div className="border-t border-border bg-card px-4 py-3 flex items-center gap-3 shrink-0">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <div className="flex-1 text-xs text-muted-foreground">
              {totalEntries} exercise{totalEntries !== 1 ? "s" : ""} scheduled across{" "}
              {activeWeeksCount} week{activeWeeksCount !== 1 ? "s" : ""}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={saveEntriesMutation.isPending}
              onClick={() => saveEntriesMutation.mutate()}
            >
              {saveEntriesMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save draft"}
            </Button>
            <Button
              size="sm"
              disabled={totalEntries === 0 || saveEntriesMutation.isPending}
              onClick={handleSaveAndAdvance}
            >
              Review & activate <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && planDetails && (
        <div className="flex-1 p-6 md:p-8 max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Edit schedule
            </button>
            <h1 className="text-2xl font-bold text-foreground">Review plan</h1>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border border-border bg-card p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Client", value: planDetails.clientName },
              { label: "Plan", value: planDetails.name },
              { label: "Start date", value: new Date(planDetails.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
              { label: "Duration", value: `${planDetails.totalWeeks} week${planDetails.totalWeeks !== 1 ? "s" : ""}` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          {/* Schedule table */}
          <div className="rounded-xl border border-border overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {["Week", "Day", "Workout", "Sets × Reps", "Weight (kg)"].map((header) => (
                    <th key={header} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flattenGrid(grid).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No entries in this plan.
                    </td>
                  </tr>
                ) : (
                  flattenGrid(grid).map((entry, index) => {
                    const workout = workouts.find((workout) => workout.id === entry.workoutId);
                    return (
                      <tr key={index} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-muted-foreground">{entry.weekNumber}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{DAY_LABELS[entry.dayOfWeek]}</td>
                        <td className="px-4 py-2.5 font-medium text-foreground">{workout?.name ?? entry.workoutId}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {entry.targetSets && entry.targetReps
                            ? `${entry.targetSets} × ${entry.targetReps}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {entry.targetWeightKg ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending || totalEntries === 0}
              size="lg"
            >
              {activateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Activate plan</>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">{totalEntries} workouts scheduled</p>
          </div>
        </div>
      )}

      {/* Entry config modal */}
      <EntryConfigModal
        entry={editingEntry}
        onSave={updateEntry}
        onClose={() => setEditingEntry(null)}
      />
    </div>
  );
}
