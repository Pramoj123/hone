"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Sparkles, Zap, LayoutGrid, Loader2 } from "lucide-react";

type Mode = "daily" | "plan";

const dailySchema = z.object({
  focus: z.string().optional().or(z.literal("")),
  durationMinutes: z.string().optional().or(z.literal("")),
});

const planSchema = z.object({
  goal: z.string().optional().or(z.literal("")),
  daysPerWeek: z.string().min(1),
  totalWeeks: z.string().min(1),
  durationMinutes: z.string().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
});

type DailyForm = z.infer<typeof dailySchema>;
type PlanForm = z.infer<typeof planSchema>;

const EQUIPMENT_OPTIONS = [
  "Barbell", "Dumbbell", "Kettlebell", "Resistance Band", "Pull-up Bar",
  "Cable Machine", "Smith Machine", "Bench", "Bodyweight",
];

export default function GenerateProgramPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <GenerateProgramForm />
    </Suspense>
  );
}

function GenerateProgramForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "plan" ? "plan" : "daily");
  const [equipment, setEquipment] = useState<string[]>([]);

  const { data: quota } = useQuery<{ used: number; limit: number }>({
    queryKey: ["ai-quota"],
    queryFn: () => authApi.get("/me/ai/quota"),
    staleTime: 10_000,
  });

  const dailyForm = useForm<DailyForm>({
    resolver: zodResolver(dailySchema),
    defaultValues: { focus: "", durationMinutes: "" },
  });

  const planForm = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { goal: "", daysPerWeek: "4", totalWeeks: "4", durationMinutes: "", startDate: "" },
  });

  const dailyMutation = useMutation({
    mutationFn: (data: DailyForm) =>
      authApi.post("/me/ai/generate-daily", {
        focus: data.focus || undefined,
        durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes) : undefined,
        equipment: equipment.length ? equipment : undefined,
      }),
    onSuccess: () => {
      toast.success("Today's workout generated!");
      router.push("/dashboard/programs?tab=today");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const planMutation = useMutation({
    mutationFn: (data: PlanForm) =>
      authApi.post("/me/ai/generate-plan", {
        goal: data.goal || undefined,
        daysPerWeek: parseInt(data.daysPerWeek),
        totalWeeks: parseInt(data.totalWeeks),
        durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes) : undefined,
        startDate: data.startDate || undefined,
        equipment: equipment.length ? equipment : undefined,
      }),
    onSuccess: (response: any) => {
      toast.success("Program plan generated!");
      router.push(`/dashboard/programs/plan/${response.plan.id}?review=1`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isAtLimit = quota && quota.used >= quota.limit;
  const isPending = dailyMutation.isPending || planMutation.isPending;

  const toggleEquipment = (item: string) => {
    setEquipment((prev) => prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]);
  };

  return (
    <div className="p-4 md:p-8 max-w-lg space-y-6">
      <Link
        href="/dashboard/programs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to programs
      </Link>

      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-900/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Generator</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Generate personalized workouts using AI</p>
        </div>
        {quota && (
          <div className="ml-auto text-right shrink-0">
            <p className="text-xs text-muted-foreground">Daily quota</p>
            <p className={`text-sm font-bold ${isAtLimit ? "text-destructive" : "text-foreground"}`}>
              {quota.used} / {quota.limit}
            </p>
          </div>
        )}
      </div>

      {isAtLimit && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Daily generation limit reached. Resets at midnight UTC.
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted">
        {([["daily", "Today's workout", Zap], ["plan", "Multi-week plan", LayoutGrid]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Equipment filter */}
      <div>
        <label className="text-xs text-muted-foreground block mb-2">Available equipment (optional)</label>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleEquipment(item)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                equipment.includes(item)
                  ? "bg-primary/10 text-primary border-primary/40"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {mode === "daily" ? (
        <form onSubmit={dailyForm.handleSubmit((data) => dailyMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Focus (optional)</label>
            <Input placeholder="e.g. Upper body, Cardio, Legs…" {...dailyForm.register("focus")} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Session duration (minutes, optional)</label>
            <Input type="number" min={15} max={180} placeholder="e.g. 45" {...dailyForm.register("durationMinutes")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending || !!isAtLimit}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating…</> : <><Sparkles className="h-4 w-4 mr-2" />Generate today's workout</>}
          </Button>
        </form>
      ) : (
        <form onSubmit={planForm.handleSubmit((data) => planMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Goal (optional)</label>
            <Input placeholder="e.g. Build muscle, Lose weight, Improve endurance…" {...planForm.register("goal")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Training days/week</label>
              <Input type="number" min={1} max={7} {...planForm.register("daysPerWeek")} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Total weeks</label>
              <Input type="number" min={1} max={12} {...planForm.register("totalWeeks")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Session duration (min)</label>
              <Input type="number" min={15} max={180} placeholder="45" {...planForm.register("durationMinutes")} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Start date (optional)</label>
              <Input type="date" {...planForm.register("startDate")} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isPending || !!isAtLimit}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating plan…</> : <><Sparkles className="h-4 w-4 mr-2" />Generate program plan</>}
          </Button>
          <p className="text-xs text-muted-foreground text-center">The plan starts as a DRAFT — review and activate when ready</p>
        </form>
      )}
    </div>
  );
}
