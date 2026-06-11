"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";

interface PR {
  workoutId: string;
  workoutName: string;
  maxWeightKg: number;
  repsAtMaxWeight: number;
  estimated1RM: number;
  achievedAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PRBoard(): React.JSX.Element {
  const { data, isLoading } = useQuery<{ data: PR[] }>({
    queryKey: ["progress", "prs"],
    queryFn: () => authApi.get<{ data: PR[] }>("/me/progress/prs"),
    staleTime: 5 * 60 * 1000,
  });

  const prs = data?.data ?? [];

  if (isLoading) {
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Personal Records</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Personal Records</h2>
        <div className="py-14 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
          Complete your first workout to see personal records
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-4">
        Personal Records
        <span className="ml-2 text-sm font-normal text-muted-foreground">{prs.length} exercises</span>
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {prs.map((pr) => (
          <div
            key={pr.workoutId}
            className="relative rounded-xl border border-border bg-card px-5 py-4 flex flex-col gap-2"
          >
            {/* Trophy icon */}
            <div className="absolute top-3 right-3">
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>

            {/* Exercise name */}
            <p className="font-medium text-foreground text-sm leading-tight pr-6">
              {pr.workoutName}
            </p>

            {/* Max weight */}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{pr.maxWeightKg}</span>
              <span className="text-sm text-muted-foreground">kg</span>
            </div>

            {/* Reps */}
            <p className="text-xs text-muted-foreground">× {pr.repsAtMaxWeight} reps</p>

            {/* Estimated 1RM */}
            <p className="text-xs text-muted-foreground">
              ~{pr.estimated1RM} kg est. 1RM
            </p>

            {/* Date */}
            <p className="text-xs text-muted-foreground mt-auto">{formatDate(pr.achievedAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
