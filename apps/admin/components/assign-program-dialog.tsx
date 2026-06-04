"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LayoutGrid, Dumbbell, Calendar, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Workout {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  durationMinutes: number | null;
}

interface WorkoutsResponse {
  data: Workout[];
}

interface AssignProgramDialogProps {
  open: boolean;
  onClose: () => void;
  gymSlug: string;
  client: { id: string; name: string };
}

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: "bg-green-100 text-green-700",
  INTERMEDIATE: "bg-yellow-100 text-yellow-700",
  ADVANCED: "bg-red-100 text-red-700",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function AssignProgramDialog({
  open, onClose, gymSlug, client,
}: AssignProgramDialogProps): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"quick" | "plan">("quick");
  const [search, setSearch] = useState("");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>("");

  const { data: workoutsData, isLoading: workoutsLoading } = useQuery<WorkoutsResponse>({
    queryKey: ["gym-workouts-assign", gymSlug],
    queryFn: () => authApi.get(`/gyms/${gymSlug}/workouts?limit=100&scope=all`),
    staleTime: 5 * 60_000,
    enabled: open,
  });

  const workouts = (workoutsData?.data ?? []).filter((workout) =>
    search ? workout.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const assignMutation = useMutation({
    mutationFn: () =>
      authApi.post(`/gyms/${gymSlug}/programs`, {
        clientId: client.id,
        workoutId: selectedWorkoutId,
        scheduledDate: scheduledDate || undefined,
        status: "PENDING",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs", gymSlug] });
      queryClient.invalidateQueries({ queryKey: ["my-clients", gymSlug] });
      toast.success(`Workout assigned to ${client.name}`);
      handleClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleClose(): void {
    setSearch("");
    setSelectedWorkoutId(null);
    setScheduledDate("");
    setTab("quick");
    onClose();
  }

  function handleBuildPlan(): void {
    handleClose();
    router.push(`/${gymSlug}/program-plans/new?clientId=${client.id}`);
  }

  const selectedWorkout = workouts.find((workout) => workout.id === selectedWorkoutId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign program — {client.name}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-4">
          <button
            onClick={() => setTab("quick")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "quick"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Dumbbell className="h-3.5 w-3.5 inline mr-1.5" />
            Quick assign
          </button>
          <button
            onClick={() => setTab("plan")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "plan"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5 inline mr-1.5" />
            Multi-week plan
          </button>
        </div>

        {/* Quick assign tab */}
        {tab === "quick" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assign a single workout to {client.name}.
            </p>

            <Input
              placeholder="Search workouts…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="max-h-52 overflow-y-auto space-y-1.5 border border-border rounded-lg p-2">
              {workoutsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
              ) : workouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No workouts found</p>
              ) : (
                workouts.map((workout) => (
                  <button
                    key={workout.id}
                    onClick={() => setSelectedWorkoutId(workout.id)}
                    className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
                      selectedWorkoutId === workout.id
                        ? "bg-foreground text-background"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span className="truncate">{workout.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                      selectedWorkoutId === workout.id
                        ? "bg-background/20 text-background"
                        : (DIFFICULTY_COLOR[workout.difficulty] ?? "bg-muted text-muted-foreground")
                    }`}>
                      {workout.difficulty.charAt(0) + workout.difficulty.slice(1).toLowerCase()}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                <Calendar className="h-3.5 w-3.5 inline mr-1" />
                Schedule date (optional)
              </label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(event) => setScheduledDate(event.target.value)}
              />
            </div>

            {selectedWorkout && (
              <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm">
                <span className="font-medium text-foreground">{selectedWorkout.name}</span>
                {scheduledDate && (
                  <span className="text-muted-foreground ml-2">
                    · {new Date(scheduledDate).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!selectedWorkoutId || assignMutation.isPending}
                onClick={() => assignMutation.mutate()}
              >
                {assignMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Assigning…</>
                ) : "Assign workout"}
              </Button>
            </div>
          </div>
        )}

        {/* Multi-week plan tab */}
        {tab === "plan" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Build a multi-week structured program for {client.name} using the
              full program builder. You'll be able to drag and drop workouts onto
              a weekly schedule across up to 52 weeks.
            </p>

            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">What you get:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  Drag-and-drop workouts onto a weekly grid
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  Set target sets, reps, weight per workout
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  Auto-generates WorkoutProgram records on activation
                </li>
              </ul>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleBuildPlan}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                Open plan builder
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
