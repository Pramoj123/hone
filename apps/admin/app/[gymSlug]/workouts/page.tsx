"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Search, Send, Clock, CheckCircle, XCircle, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface Workout {
  id: string;
  name: string;
  slug: string;
  category: string;
  difficulty: string;
  muscleGroups: string[];
  coverImageUrl: string | null;
  imageUrls: string[];
  isPublished: boolean;
  reviewStatus: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  reviewNotes: string | null;
  organizationId: string | null;
  createdBy: { id: string; name: string } | null;
}

interface PagedResponse {
  data: Workout[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

const REVIEW_STATUS_CONFIG: Record<string, { label: string; className: string; Icon: React.ElementType } | null> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground", Icon: FileEdit },
  PENDING_REVIEW: { label: "Pending review", className: "bg-yellow-100 text-yellow-700", Icon: Clock },
  APPROVED: null,
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700", Icon: XCircle },
};

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: "bg-green-100 text-green-700",
  INTERMEDIATE: "bg-yellow-100 text-yellow-700",
  ADVANCED: "bg-red-100 text-red-700",
};

export default function GymWorkoutsPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState<string>("ALL");

  const { data, isLoading } = useQuery<PagedResponse>({
    queryKey: ["gym-workouts", gymSlug, debouncedSearch, reviewFilter],
    queryFn: () => {
      const queryParams = new URLSearchParams({ limit: "50", scope: "all" });
      if (debouncedSearch) queryParams.set("search", debouncedSearch);
      if (reviewFilter !== "ALL") queryParams.set("reviewStatus", reviewFilter);
      return authApi.get<PagedResponse>(`/gyms/${gymSlug}/workouts?${queryParams}`);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => authApi.post(`/gyms/${gymSlug}/workouts/${id}/submit`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym-workouts", gymSlug] });
      toast.success("Submitted for review — our team will approve it shortly");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleSearchChange(value: string): void {
    setSearch(value);
    clearTimeout((window as Window & { _st?: ReturnType<typeof setTimeout> })._st);
    (window as Window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(
      () => setDebouncedSearch(value),
      300,
    );
  }

  const workouts = data?.data ?? [];
  const FILTER_TABS = ["ALL", "DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workout library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.meta.total ?? 0} workouts in your gym
          </p>
        </div>
        <Button onClick={() => router.push(`/${gymSlug}/workouts/new`)}>
          <Plus className="h-4 w-4 mr-2" /> New workout
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search workouts…"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setReviewFilter(tab)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                reviewFilter === tab
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {tab === "ALL" ? "All" : REVIEW_STATUS_CONFIG[tab]?.label ?? tab}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}
        </div>
      ) : workouts.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground text-sm">
          No workouts found.{" "}
          <button className="underline" onClick={() => router.push(`/${gymSlug}/workouts/new`)}>
            Create one
          </button>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="md:hidden space-y-2">
            {workouts.map((workout) => {
              const cfg = REVIEW_STATUS_CONFIG[workout.reviewStatus];
              const StatusIcon = cfg?.Icon;
              const canSubmit = workout.reviewStatus === "DRAFT" || workout.reviewStatus === "REJECTED";
              return (
                <div
                  key={workout.id}
                  onClick={() => router.push(`/${gymSlug}/workouts/${workout.id}`)}
                  className="rounded-xl border border-border bg-card p-4 cursor-pointer active:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{workout.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{workout.slug}</p>
                    </div>
                    {cfg && (
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                        cfg.className
                      )}>
                        {StatusIcon && <StatusIcon className="h-3 w-3" />}
                        {cfg.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {workout.category}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      DIFFICULTY_COLOR[workout.difficulty] ?? "bg-muted"
                    )}>
                      {workout.difficulty}
                    </span>
                    {canSubmit && (
                      <button
                        onClick={(event) => { event.stopPropagation(); submitMutation.mutate(workout.id); }}
                        className="ml-auto text-xs text-primary font-medium"
                      >
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Workout</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Difficulty</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Created by</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workouts.map((workout) => {
                  const cfg = REVIEW_STATUS_CONFIG[workout.reviewStatus];
                  const StatusIcon = cfg?.Icon;
                  const canSubmit = workout.reviewStatus === "DRAFT" || workout.reviewStatus === "REJECTED";
                  return (
                    <tr
                      key={workout.id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => router.push(`/${gymSlug}/workouts/${workout.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{workout.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{workout.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          {workout.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[workout.difficulty] ?? "bg-muted"}`}>
                          {workout.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {cfg && (
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>
                            {StatusIcon && <StatusIcon className="h-3 w-3" />}
                            {cfg.label}
                          </span>
                        )}
                        {workout.reviewNotes && (
                          <p className="text-xs text-red-600 mt-0.5 max-w-xs truncate">{workout.reviewNotes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {workout.createdBy?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                        {canSubmit && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            disabled={submitMutation.isPending}
                            onClick={() => submitMutation.mutate(workout.id)}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Submit for review
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
