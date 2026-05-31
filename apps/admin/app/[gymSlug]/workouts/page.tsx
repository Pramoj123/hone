"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Search, Send, Clock, CheckCircle, XCircle, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const REVIEW_STATUS_CONFIG: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground", Icon: FileEdit },
  PENDING_REVIEW: { label: "Pending review", className: "bg-yellow-100 text-yellow-700", Icon: Clock },
  APPROVED: { label: "Approved — global", className: "bg-green-100 text-green-700", Icon: CheckCircle },
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
      const p = new URLSearchParams({ limit: "50" });
      if (debouncedSearch) p.set("search", debouncedSearch);
      if (reviewFilter !== "ALL") p.set("reviewStatus", reviewFilter);
      return authApi.get<PagedResponse>(`/gyms/${gymSlug}/workouts?${p}`);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => authApi.post(`/gyms/${gymSlug}/workouts/${id}/submit`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym-workouts", gymSlug] });
      toast.success("Submitted for review — our team will approve it shortly");
    },
    onError: (err: Error) => toast.error(err.message),
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
    <div className="p-8">
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
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search workouts…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
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

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : workouts.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground text-sm">
          No workouts found.{" "}
          <button className="underline" onClick={() => router.push(`/${gymSlug}/workouts/new`)}>
            Create one
          </button>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
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
              {workouts.map((w) => {
                const cfg = REVIEW_STATUS_CONFIG[w.reviewStatus];
                const Icon = cfg?.Icon;
                const canSubmit = w.reviewStatus === "DRAFT" || w.reviewStatus === "REJECTED";
                return (
                  <tr
                    key={w.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/${gymSlug}/workouts/${w.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{w.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{w.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {w.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[w.difficulty] ?? "bg-muted"}`}>
                        {w.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg?.className}`}>
                        {Icon && <Icon className="h-3 w-3" />}
                        {cfg?.label}
                      </span>
                      {w.reviewNotes && (
                        <p className="text-xs text-red-600 mt-0.5 max-w-xs truncate">{w.reviewNotes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {w.createdBy?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {canSubmit && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          disabled={submitMutation.isPending}
                          onClick={() => submitMutation.mutate(w.id)}
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
      )}
    </div>
  );
}
