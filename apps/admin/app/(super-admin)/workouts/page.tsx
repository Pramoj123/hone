"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Video, Volume2, Image, Search, CheckCircle, XCircle } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Workout {
  id: string;
  name: string;
  slug: string;
  category: string;
  difficulty: string;
  muscleGroups: string[];
  equipment: string[];
  coverImageUrl: string | null;
  imageUrls: string[];
  videoUrl: string | null;
  audioUrl: string | null;
  description: string | null;
  sets: string | null;
  reps: string | null;
  durationMinutes: number | null;
  caloriesPerHour: number | null;
  isPublished: boolean;
  reviewStatus: string;
  reviewNotes: string | null;
  organization: { id: string; name: string; slug: string } | null;
}

interface PagedResponse {
  data: Workout[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const CATEGORIES = ["ALL", "STRENGTH", "CARDIO", "HIIT", "PLYOMETRICS", "CORE", "FLEXIBILITY", "MOBILITY"];

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: "bg-green-100 text-green-700",
  INTERMEDIATE: "bg-yellow-100 text-yellow-700",
  ADVANCED: "bg-red-100 text-red-700",
};

const CATEGORY_COLOR: Record<string, string> = {
  STRENGTH: "bg-blue-100 text-blue-700",
  CARDIO: "bg-orange-100 text-orange-700",
  HIIT: "bg-red-100 text-red-700",
  PLYOMETRICS: "bg-purple-100 text-purple-700",
  CORE: "bg-teal-100 text-teal-700",
  FLEXIBILITY: "bg-pink-100 text-pink-700",
  MOBILITY: "bg-indigo-100 text-indigo-700",
};

export default function WorkoutsPage(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"library" | "review">("library");
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Workout | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const { data, isLoading } = useQuery<PagedResponse>({
    queryKey: ["workouts", category, debouncedSearch, activeTab],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" });
      if (activeTab === "review") {
        params.set("reviewStatus", "PENDING_REVIEW");
      } else {
        if (category !== "ALL") params.set("category", category);
        if (debouncedSearch) params.set("search", debouncedSearch);
      }
      return authApi.get<PagedResponse>(`/workouts?${params}`);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => authApi.post(`/workouts/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Workout approved and published globally");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      authApi.post(`/workouts/${id}/reject`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      setRejectTarget(null);
      setRejectNotes("");
      toast.success("Workout rejected — gym notified");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleSearchChange(value: string): void {
    setSearch(value);
    clearTimeout((window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(
      () => setDebouncedSearch(value),
      300,
    );
  }

  const workouts = data?.data ?? [];
  const pendingCount = activeTab === "review" ? workouts.length : undefined;

  return (
    <div className="p-8">
      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject workout</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rejecting <span className="font-medium text-foreground">{rejectTarget?.name}</span>. Provide a reason so the gym can revise it.
          </p>
          <textarea
            rows={4}
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm resize-none mt-2"
            placeholder="Reason for rejection…"
            value={rejectNotes}
            onChange={(event) => setRejectNotes(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectNotes(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectNotes.trim() || rejectMutation.isPending}
              onClick={() => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, notes: rejectNotes })}
            >
              {rejectMutation.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workouts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === "library"
              ? `${data?.meta.total ?? 0} exercises in the global library`
              : `${data?.meta.total ?? 0} pending review`}
          </p>
        </div>
        {activeTab === "library" && (
          <Button onClick={() => router.push("/workouts/new")}>
            <Plus className="h-4 w-4 mr-2" /> Add workout
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(["library", "review"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "library" ? "Global library" : (
              <span className="flex items-center gap-2">
                Review queue
                {pendingCount !== undefined && pendingCount > 0 && (
                  <span className="h-5 w-5 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center font-bold">
                    {pendingCount}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + category filter — library only */}
      {activeTab === "library" && (
        <div className="flex flex-col gap-3 mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search workouts…"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  category === cat
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {cat === "ALL" ? "All categories" : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground text-sm">
          {activeTab === "review" ? "No workouts pending review." : "No workouts found."}
        </div>
      ) : activeTab === "review" ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Workout</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Submitted by</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Difficulty</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {workouts.map((workout) => (
                <tr key={workout.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{workout.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{workout.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {workout.organization?.name ?? "—"}{" "}
                    {workout.organization && <span className="font-mono">({workout.organization.slug})</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[workout.category] ?? "bg-muted"}`}>{workout.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[workout.difficulty] ?? "bg-muted"}`}>{workout.difficulty}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-green-700 border-green-200 hover:bg-green-50"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(workout.id)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setRejectTarget(workout)}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} onClick={() => router.push(`/workouts/${workout.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutCard({ workout, onClick }: { workout: Workout; onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-border bg-card p-5 hover:border-foreground/30 hover:shadow-sm transition-all space-y-3 group"
    >
      {/* Card cover */}
      <div className="h-28 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
        {(workout.coverImageUrl ?? workout.imageUrls[0]) ? (
          <img src={(workout.coverImageUrl ?? workout.imageUrls[0])!} alt={workout.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl select-none">
            {workout.category === "CARDIO" ? "🏃" : workout.category === "STRENGTH" ? "🏋️" : workout.category === "HIIT" ? "⚡" : "💪"}
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex gap-1.5 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[workout.category] ?? "bg-muted text-muted-foreground"}`}>
          {workout.category}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[workout.difficulty] ?? "bg-muted text-muted-foreground"}`}>
          {workout.difficulty}
        </span>
      </div>

      {/* Name */}
      <div>
        <p className="font-semibold text-foreground text-sm group-hover:text-foreground transition-colors">{workout.name}</p>
        {workout.muscleGroups.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {workout.muscleGroups.slice(0, 3).join(" · ")}
            {workout.muscleGroups.length > 3 ? ` +${workout.muscleGroups.length - 3}` : ""}
          </p>
        )}
      </div>

      {/* Media indicators */}
      <div className="flex gap-2 text-muted-foreground">
        {workout.videoUrl && <Video className="h-3.5 w-3.5" />}
        {workout.audioUrl && <Volume2 className="h-3.5 w-3.5" />}
        {workout.imageUrls.length > 0 && <Image className="h-3.5 w-3.5" />}
        {!workout.isPublished && (
          <Badge variant="outline" className="text-xs ml-auto py-0">Draft</Badge>
        )}
      </div>
    </button>
  );
}
