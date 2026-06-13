"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, Dumbbell } from "lucide-react";

interface Workout {
  id: string;
  name: string;
  slug: string;
  category: string;
  difficulty: string;
  coverImageUrl: string | null;
  muscleGroups: string[];
  equipment: string[];
  durationMinutes: number | null;
  sets: string | null;
  reps: string | null;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

const schema = z.object({
  workoutId: z.string().min(1, "Select a workout"),
  targetSets: z.string().optional().or(z.literal("")),
  targetReps: z.string().optional().or(z.literal("")),
  targetDurationMinutes: z.string().optional().or(z.literal("")),
  targetWeightKg: z.string().optional().or(z.literal("")),
  scheduledDate: z.string().optional().or(z.literal("")),
  isRecurring: z.boolean().default(false),
  recurrenceDays: z.array(z.string()).default([]),
  notes: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function NewProgramPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const { data: workoutsData, isLoading } = useQuery<{ data: Workout[] }>({
    queryKey: ["workouts-picker", search],
    queryFn: () => authApi.get(`/workouts?search=${encodeURIComponent(search)}&limit=30&globalOnly=true`),
    staleTime: 60_000,
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isRecurring: false, recurrenceDays: [] },
  });

  const isRecurring = watch("isRecurring");
  const recurrenceDays = watch("recurrenceDays");

  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      authApi.post("/me/programs", {
        workoutId: data.workoutId,
        targetSets: data.targetSets || undefined,
        targetReps: data.targetReps || undefined,
        targetDurationMinutes: data.targetDurationMinutes ? parseInt(data.targetDurationMinutes) : undefined,
        targetWeightKg: data.targetWeightKg ? parseFloat(data.targetWeightKg) : undefined,
        scheduledDate: (!isRecurring && data.scheduledDate) ? data.scheduledDate : undefined,
        isRecurring: data.isRecurring,
        recurrenceDays: data.isRecurring ? data.recurrenceDays : [],
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      toast.success("Program created");
      router.push("/dashboard/programs");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const workouts = workoutsData?.data ?? [];

  return (
    <div className="p-4 md:p-8 max-w-lg space-y-6">
      <Link
        href="/dashboard/programs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to programs
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">New program</h1>
        <p className="text-muted-foreground text-sm mt-1">Add a workout to your schedule</p>
      </div>

      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-5">
        {/* Workout picker */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Workout</label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search workouts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {selectedWorkout && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 mb-2">
              <Dumbbell className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedWorkout.name}</p>
                <p className="text-xs text-muted-foreground">{selectedWorkout.category} · {selectedWorkout.difficulty}</p>
              </div>
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setSelectedWorkout(null); setValue("workoutId", ""); }}>
                Change
              </button>
            </div>
          )}
          {!selectedWorkout && (
            isLoading ? (
              <div className="space-y-1.5">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {workouts.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                    onClick={() => { setSelectedWorkout(w); setValue("workoutId", w.id); }}
                  >
                    <span className="font-medium">{w.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{w.category} · {w.difficulty}</span>
                  </button>
                ))}
                {workouts.length === 0 && (
                  <p className="px-3 py-4 text-sm text-muted-foreground text-center">No workouts found</p>
                )}
              </div>
            )
          )}
          {errors.workoutId && <p className="text-xs text-destructive mt-1">{errors.workoutId.message}</p>}
        </div>

        {/* Targets */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Sets</label>
            <Input placeholder="e.g. 3" {...register("targetSets")} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Reps</label>
            <Input placeholder="e.g. 10" {...register("targetReps")} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Duration (min)</label>
            <Input type="number" placeholder="e.g. 30" {...register("targetDurationMinutes")} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Weight (kg)</label>
            <Input type="number" step="0.5" placeholder="e.g. 60" {...register("targetWeightKg")} />
          </div>
        </div>

        {/* Recurring toggle */}
        <div className="flex items-center gap-3">
          <input
            id="recurring"
            type="checkbox"
            className="rounded border-border"
            {...register("isRecurring")}
          />
          <label htmlFor="recurring" className="text-sm text-foreground cursor-pointer">Recurring workout</label>
        </div>

        {isRecurring ? (
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Days of week</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const current = recurrenceDays ?? [];
                    setValue("recurrenceDays", current.includes(day) ? current.filter((d) => d !== day) : [...current, day]);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    recurrenceDays?.includes(day)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Scheduled date (optional)</label>
            <Input type="date" {...register("scheduledDate")} />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Notes (optional)</label>
          <Input placeholder="Any notes…" {...register("notes")} />
        </div>

        <Button type="submit" className="w-full" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating…" : "Create program"}
        </Button>

        {createMutation.error && (
          <p className="text-sm text-destructive">{(createMutation.error as Error).message}</p>
        )}
      </form>
    </div>
  );
}
