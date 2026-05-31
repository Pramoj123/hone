"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Calendar, RotateCcw, CheckCircle2, Clock, XCircle, Dumbbell } from "lucide-react";

interface Workout {
  id: string;
  name: string;
  slug: string;
  category: string;
  difficulty: string;
  coverImageUrl: string | null;
  sets: string | null;
  reps: string | null;
  durationMinutes: number | null;
}

interface Trainer {
  id: string;
  name: string;
  role: string;
}

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
  workout: { id: string; name: string; category: string; difficulty: string };
  trainer: { id: string; name: string };
  _count: { logs: number };
}

interface PagedResponse {
  data: Program[];
  meta: { total: number };
}

const STATUS_CONFIG: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
  PENDING:   { label: "Pending",   className: "bg-muted text-muted-foreground",        Icon: Clock },
  ACTIVE:    { label: "Active",    className: "bg-blue-100 text-blue-700",             Icon: Dumbbell },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700",           Icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700",              Icon: XCircle },
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface Props {
  gymSlug: string;
  memberId: string;
}

export function ProgramsTab({ gymSlug, memberId }: Props): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const canPickTrainer = currentUser?.role === "ORG_ADMIN" || currentUser?.role === "BRANCH_MANAGER" || currentUser?.role === "SUPER_ADMIN";

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"search" | "configure">("search");
  const [workoutSearch, setWorkoutSearch] = useState("");
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [scheduleType, setScheduleType] = useState<"date" | "recurring" | "none">("date");
  const [trainerId, setTrainerId] = useState("");
  const [form, setForm] = useState({
    targetSets: "", targetReps: "", targetWeightKg: "",
    targetDurationMinutes: "", scheduledDate: "",
    recurrenceDays: [] as string[], notes: "", status: "ACTIVE",
  });

  const { data: programs, isLoading } = useQuery<PagedResponse>({
    queryKey: ["programs", gymSlug, memberId],
    queryFn: () => authApi.get<PagedResponse>(`/gyms/${gymSlug}/programs?clientId=${memberId}&limit=50`),
  });

  const { data: workoutResults } = useQuery<{ data: Workout[] }>({
    queryKey: ["workout-search", gymSlug, workoutSearch],
    queryFn: () => {
      const p = new URLSearchParams({ scope: "all", limit: "20" });
      if (workoutSearch) p.set("search", workoutSearch);
      return authApi.get<{ data: Workout[] }>(`/gyms/${gymSlug}/workouts?${p}`);
    },
    enabled: step === "search",
  });

  const { data: staffData } = useQuery<{ data: Trainer[] }>({
    queryKey: ["staff", gymSlug],
    queryFn: () => authApi.get<{ data: Trainer[] }>(`/gyms/${gymSlug}/staff?limit=100`),
    enabled: canPickTrainer && step === "configure",
  });

  const assignMutation = useMutation({
    mutationFn: (data: object) => authApi.post(`/gyms/${gymSlug}/programs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs", gymSlug, memberId] });
      toast.success("Program assigned successfully");
      handleClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      authApi.patch(`/gyms/${gymSlug}/programs/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs", gymSlug, memberId] });
      toast.success("Status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleClose(): void {
    setOpen(false);
    setStep("search");
    setSelectedWorkout(null);
    setWorkoutSearch("");
    setTrainerId("");
    setForm({ targetSets: "", targetReps: "", targetWeightKg: "", targetDurationMinutes: "", scheduledDate: "", recurrenceDays: [], notes: "", status: "ACTIVE" });
    setScheduleType("date");
  }

  function handleSubmit(): void {
    if (!selectedWorkout) return;
    const payload: Record<string, unknown> = {
      workoutId: selectedWorkout.id,
      clientId: memberId,
      status: form.status,
      notes: form.notes || undefined,
      targetSets: form.targetSets || undefined,
      targetReps: form.targetReps || undefined,
      targetWeightKg: form.targetWeightKg ? Number(form.targetWeightKg) : undefined,
      targetDurationMinutes: form.targetDurationMinutes ? Number(form.targetDurationMinutes) : undefined,
    };
    if (trainerId) payload.trainerId = trainerId;
    if (scheduleType === "date") {
      payload.scheduledDate = form.scheduledDate || undefined;
      payload.isRecurring = false;
    } else if (scheduleType === "recurring") {
      payload.isRecurring = true;
      payload.recurrenceDays = form.recurrenceDays;
    } else {
      payload.isRecurring = false;
    }
    assignMutation.mutate(payload);
  }

  const list = programs?.data ?? [];
  const trainers = (staffData?.data ?? []).filter((s) => s.role === "TRAINER" || s.role === "BRANCH_MANAGER");

  function scheduleLabel(p: Program): React.ReactNode {
    if (p.isRecurring) {
      return <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" />{p.recurrenceDays.join(", ")}</span>;
    }
    if (p.scheduledDate) {
      return (
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(p.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      );
    }
    return <span className="italic">On-demand</span>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{programs?.meta.total ?? 0} programs assigned</p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Assign program
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
          No programs assigned yet.
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Workout</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Schedule</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Target</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Trainer</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((p) => {
                const cfg = STATUS_CONFIG[p.status];
                const Icon = cfg.Icon;
                return (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.workout.name}</p>
                      <p className="text-xs text-muted-foreground">{p.workout.category} · {p.workout.difficulty}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="text-xs px-2 py-0.5 rounded-full font-medium border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                        value={p.status}
                        disabled={statusMutation.isPending}
                        onChange={(e) => statusMutation.mutate({ id: p.id, status: e.target.value })}
                        style={{ appearance: "none" }}
                      >
                        {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                          <option key={s} value={s}>{c.label}</option>
                        ))}
                      </select>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium pointer-events-none ml-1 ${cfg.className}`}>
                        <Icon className="h-3 w-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{scheduleLabel(p)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {[p.targetSets && `${p.targetSets} sets`, p.targetReps && `${p.targetReps} reps`].filter(Boolean).join(" × ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.trainer.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p._count.logs}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{step === "search" ? "Select a workout" : `Configure — ${selectedWorkout?.name}`}</DialogTitle>
          </DialogHeader>

          {step === "search" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search workouts…" value={workoutSearch} onChange={(e) => setWorkoutSearch(e.target.value)} autoFocus />
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {(workoutResults?.data ?? []).map((w) => (
                  <button key={w.id} onClick={() => { setSelectedWorkout(w); setStep("configure"); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:border-foreground/30 hover:bg-muted/30 transition-colors">
                    <p className="font-medium text-foreground text-sm">{w.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{w.category} · {w.difficulty}{w.sets ? ` · ${w.sets} sets` : ""}{w.reps ? ` · ${w.reps} reps` : ""}</p>
                  </button>
                ))}
                {(workoutResults?.data ?? []).length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-6">No workouts found.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-1">
              {/* Trainer selector — managers/admins only */}
              {canPickTrainer && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Assign trainer</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                    value={trainerId}
                    onChange={(e) => setTrainerId(e.target.value)}
                  >
                    <option value="">Myself ({currentUser?.name})</option>
                    {trainers.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.role.replace("_", " ")})</option>)}
                  </select>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Initial status</label>
                <select className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                  value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  {Object.keys(STATUS_CONFIG).map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
              </div>

              {/* Targets */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Target sets</label>
                  <Input placeholder={selectedWorkout?.sets ?? "e.g. 3"} value={form.targetSets} onChange={(e) => setForm((f) => ({ ...f, targetSets: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Target reps</label>
                  <Input placeholder={selectedWorkout?.reps ?? "e.g. 10-12"} value={form.targetReps} onChange={(e) => setForm((f) => ({ ...f, targetReps: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Weight (kg)</label>
                  <Input type="number" placeholder="Optional" value={form.targetWeightKg} onChange={(e) => setForm((f) => ({ ...f, targetWeightKg: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Duration (min)</label>
                  <Input type="number" placeholder={selectedWorkout?.durationMinutes?.toString() ?? "Optional"} value={form.targetDurationMinutes} onChange={(e) => setForm((f) => ({ ...f, targetDurationMinutes: e.target.value }))} />
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Schedule</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {(["date", "recurring", "none"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setScheduleType(t)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${scheduleType === t ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                      {t === "date" ? "Specific date" : t === "recurring" ? "Recurring" : "On-demand"}
                    </button>
                  ))}
                </div>
                {scheduleType === "date" && (
                  <Input type="date" value={form.scheduledDate} onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
                )}
                {scheduleType === "recurring" && (
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((d) => (
                      <button key={d} type="button"
                        onClick={() => setForm((f) => ({ ...f, recurrenceDays: f.recurrenceDays.includes(d) ? f.recurrenceDays.filter((x) => x !== d) : [...f.recurrenceDays, d] }))}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${form.recurrenceDays.includes(d) ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                )}
                {scheduleType === "none" && (
                  <p className="text-xs text-muted-foreground italic">Client can do this whenever it suits them.</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes for client</label>
                <textarea rows={2} className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm resize-none"
                  placeholder="Optional instructions or context…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          )}

          <DialogFooter>
            {step === "configure" && <Button variant="outline" onClick={() => setStep("search")}>Back</Button>}
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            {step === "configure" && (
              <Button onClick={handleSubmit} disabled={assignMutation.isPending}>
                {assignMutation.isPending ? "Assigning…" : "Assign program"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
