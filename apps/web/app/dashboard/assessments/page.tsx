"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, TrendingUp, Target } from "lucide-react";

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

function Stars({ rating }: { rating: number | null }): React.JSX.Element {
  if (!rating) return <span className="text-muted-foreground text-xs">Not rated</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < rating ? "text-primary fill-primary" : "text-muted"}`} />
      ))}
    </div>
  );
}

export default function AssessmentsPage(): React.JSX.Element {
  const { data, isLoading } = useQuery<{
    data: Assessment[];
    meta: { total: number; totalPages: number; page: number };
  }>({
    queryKey: ["me-assessments"],
    queryFn: () => authApi.get("/me/assessments?limit=10"),
  });

  const assessments = data?.data ?? [];

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assessments</h1>
        <p className="text-muted-foreground text-sm mt-1">Weekly check-ins from your trainer</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : assessments.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
          No assessments yet. Your trainer will add one after your first session.
        </div>
      ) : (
        <div className="space-y-4">
          {assessments.map((a, idx) => {
            const hasMeasurements = a.weightKg || a.bodyFatPct || a.waistCm || a.chestCm || a.hipsCm;
            return (
              <Card key={a.id} className={idx === 0 ? "border-primary/30" : ""}>
                {/* Header */}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {idx === 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                          Latest
                        </span>
                      )}
                      <CardTitle>Week {a.weekNumber}, {a.year}</CardTitle>
                    </div>
                    <Stars rating={a.overallRating} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    by {a.trainer.name} · {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Measurements */}
                  {hasMeasurements && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Measurements</p>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {a.weightKg && <MeasurementBadge label="Weight" value={`${a.weightKg} kg`} />}
                        {a.bodyFatPct && <MeasurementBadge label="Body fat" value={`${a.bodyFatPct}%`} />}
                        {a.waistCm && <MeasurementBadge label="Waist" value={`${a.waistCm} cm`} />}
                        {a.chestCm && <MeasurementBadge label="Chest" value={`${a.chestCm} cm`} />}
                        {a.hipsCm && <MeasurementBadge label="Hips" value={`${a.hipsCm} cm`} />}
                      </div>
                    </div>
                  )}

                  {/* Trainer notes */}
                  {a.performanceNotes && (
                    <div className="rounded-lg bg-muted/40 px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-semibold text-foreground">Performance</p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{a.performanceNotes}</p>
                    </div>
                  )}

                  {/* Goals next week */}
                  {a.goalsNextWeek && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-semibold text-primary">Goals for next week</p>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{a.goalsNextWeek}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MeasurementBadge({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-center">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
