"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Dumbbell, ClipboardList, Star } from "lucide-react";

interface Me {
  id: string;
  name: string;
}

interface Workout {
  name: string;
  category: string;
  coverImageUrl: string | null;
}

interface Program {
  id: string;
  status: string;
  targetSets: string | null;
  targetReps: string | null;
  scheduledDate: string | null;
  isRecurring: boolean;
  recurrenceDays: string[];
  workout: Workout;
}

interface Assessment {
  id: string;
  weekNumber: number;
  year: number;
  overallRating: number | null;
  performanceNotes: string | null;
  createdAt: string;
}

const DAY_MAP: Record<number, string> = { 0: "SUN", 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT" };

const CATEGORY_EMOJI: Record<string, string> = {
  CARDIO: "🏃", STRENGTH: "🏋️", HIIT: "⚡", CORE: "🎯",
  FLEXIBILITY: "🧘", MOBILITY: "🔄", PLYOMETRICS: "💥",
};

export default function DashboardPage(): React.JSX.Element {
  const router = useRouter();
  const today = DAY_MAP[new Date().getDay()];

  const { data: me } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: () => authApi.get<Me>("/auth/me"),
  });

  const { data: programs, isLoading: programsLoading } = useQuery<{ data: Program[] }>({
    queryKey: ["me-programs", "active"],
    queryFn: () => authApi.get<{ data: Program[] }>("/me/programs?status=ACTIVE&limit=50"),
  });

  const { data: assessments } = useQuery<{ data: Assessment[] }>({
    queryKey: ["me-assessments", "recent"],
    queryFn: () => authApi.get<{ data: Assessment[] }>("/me/assessments?limit=1"),
  });

  const allActive = programs?.data ?? [];
  const todayPrograms = allActive.filter((program) =>
    program.isRecurring
      ? program.recurrenceDays.includes(today)
      : program.scheduledDate
        ? new Date(program.scheduledDate).toDateString() === new Date().toDateString()
        : false
  );
  const upcomingPrograms = allActive.filter((program) => !todayPrograms.includes(program)).slice(0, 3);
  const latestAssessment = assessments?.data[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold text-foreground">
          {greeting},{" "}
          <span className="text-primary">{me?.name?.split(" ")[0] ?? "there"}</span>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Today's workouts */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Today
        </h2>
        {programsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : todayPrograms.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
            No workouts scheduled for today.{" "}
            <button className="text-primary underline underline-offset-2" onClick={() => router.push("/dashboard/programs")}>
              View all programs
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {todayPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} onClick={() => router.push(`/dashboard/programs/${program.id}`)} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      {upcomingPrograms.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Other active programs
          </h2>
          <div className="space-y-2">
            {upcomingPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} onClick={() => router.push(`/dashboard/programs/${program.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* Latest assessment */}
      {latestAssessment && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Latest assessment
          </h2>
          <button
            onClick={() => router.push("/dashboard/assessments")}
            className="w-full text-left rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Week {latestAssessment.weekNumber}, {latestAssessment.year}
                </span>
              </div>
              {latestAssessment.overallRating && (
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < latestAssessment.overallRating! ? "text-primary fill-primary" : "text-muted"}`}
                    />
                  ))}
                </div>
              )}
            </div>
            {latestAssessment.performanceNotes && (
              <p className="text-xs text-muted-foreground line-clamp-2">{latestAssessment.performanceNotes}</p>
            )}
          </button>
        </section>
      )}

      {/* Quick links */}
      <section className="grid grid-cols-2 gap-3">
        <QuickLink icon={Dumbbell} label="All programs" onClick={() => router.push("/dashboard/programs")} />
        <QuickLink icon={ClipboardList} label="Assessments" onClick={() => router.push("/dashboard/assessments")} />
      </section>
    </div>
  );
}

function ProgramCard({ program: p, onClick }: { program: Program; onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 hover:bg-card/80 transition-colors group"
    >
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg overflow-hidden">
        {p.workout.coverImageUrl
          ? <img src={p.workout.coverImageUrl} alt="" className="h-full w-full object-cover" />
          : CATEGORY_EMOJI[p.workout.category] ?? "💪"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{p.workout.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {[p.targetSets && `${p.targetSets} sets`, p.targetReps && `${p.targetReps} reps`]
            .filter(Boolean).join(" · ") || p.workout.category}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

function QuickLink({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      {label}
    </button>
  );
}
