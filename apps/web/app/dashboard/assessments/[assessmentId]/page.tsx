"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Star, TrendingUp, Target } from "lucide-react";

interface Assessment {
  id: string;
  weekNumber: number;
  year: number;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipsCm: number | null;
  performanceNotes: string | null;
  goalsNextWeek: string | null;
  overallRating: number | null;
  trainer: { id: string; name: string };
  createdAt: string;
}

interface PageProps {
  params: Promise<{ assessmentId: string }>;
}

export default function AssessmentDetailPage({ params }: PageProps): React.JSX.Element {
  const { assessmentId } = use(params);

  const { data: a, isLoading } = useQuery<Assessment>({
    queryKey: ["me-assessment", assessmentId],
    queryFn: () => authApi.get<Assessment>(`/me/assessments/${assessmentId}`),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-lg space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (!a) return <div className="p-8 text-muted-foreground">Assessment not found.</div>;

  const hasMeasurements = a.weightKg || a.bodyFatPct || a.waistCm || a.chestCm || a.hipsCm;

  return (
    <div className="p-8 max-w-lg space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard/assessments" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Assessments
        </Link>
        <span>/</span>
        <span className="text-foreground">Week {a.weekNumber}, {a.year}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Week {a.weekNumber}, {a.year}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            by {a.trainer.name} · {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {a.overallRating && (
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-5 w-5 ${i < a.overallRating! ? "text-primary fill-primary" : "text-muted"}`} />
            ))}
          </div>
        )}
      </div>

      {/* Measurements */}
      {hasMeasurements && (
        <Card>
          <CardHeader><CardTitle>Measurements</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {a.weightKg && <Stat label="Weight" value={`${a.weightKg} kg`} />}
              {a.bodyFatPct && <Stat label="Body fat" value={`${a.bodyFatPct}%`} />}
              {a.waistCm && <Stat label="Waist" value={`${a.waistCm} cm`} />}
              {a.chestCm && <Stat label="Chest" value={`${a.chestCm} cm`} />}
              {a.hipsCm && <Stat label="Hips" value={`${a.hipsCm} cm`} />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance notes */}
      {a.performanceNotes && (
        <div className="rounded-xl bg-muted/40 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Performance</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{a.performanceNotes}</p>
        </div>
      )}

      {/* Goals */}
      {a.goalsNextWeek && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-primary">Goals for next week</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{a.goalsNextWeek}</p>
        </div>
      )}

      {!hasMeasurements && !a.performanceNotes && !a.goalsNextWeek && (
        <p className="text-sm text-muted-foreground italic">No details added for this assessment.</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-3 text-center">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
