"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, TrendingUp, Target, ChevronRight } from "lucide-react";

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

const PAGE_SIZE = 5;

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
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{
    data: Assessment[];
    meta: { total: number; totalPages: number; page: number };
  }>({
    queryKey: ["me-assessments", page],
    queryFn: () => authApi.get(`/me/assessments?limit=${PAGE_SIZE}&page=${page}`),
  });

  const assessments = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assessments</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {data?.meta.total ?? 0} weekly check-ins from your trainer
        </p>
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
        <>
          <div className="space-y-4">
            {assessments.map((a, idx) => {
              const hasMeasurements = a.weightKg || a.bodyFatPct || a.waistCm;
              const isLatest = page === 1 && idx === 0;
              return (
                <Card
                  key={a.id}
                  className={`cursor-pointer hover:border-primary/30 transition-colors ${isLatest ? "border-primary/30" : ""}`}
                  onClick={() => router.push(`/dashboard/assessments/${a.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isLatest && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                            Latest
                          </span>
                        )}
                        <CardTitle>Week {a.weekNumber}, {a.year}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Stars rating={a.overallRating} />
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      by {a.trainer.name} · {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {hasMeasurements && (
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {a.weightKg && <span>Weight: <span className="text-foreground font-medium">{a.weightKg} kg</span></span>}
                        {a.bodyFatPct && <span>Body fat: <span className="text-foreground font-medium">{a.bodyFatPct}%</span></span>}
                        {a.waistCm && <span>Waist: <span className="text-foreground font-medium">{a.waistCm} cm</span></span>}
                      </div>
                    )}

                    {a.performanceNotes && (
                      <div className="flex items-start gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground line-clamp-2">{a.performanceNotes}</p>
                      </div>
                    )}

                    {a.goalsNextWeek && (
                      <div className="flex items-start gap-2">
                        <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-foreground line-clamp-1">{a.goalsNextWeek}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
