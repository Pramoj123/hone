"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Video, Volume2, Image, Search } from "lucide-react";
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
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading } = useQuery<PagedResponse>({
    queryKey: ["workouts", category, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" });
      if (category !== "ALL") params.set("category", category);
      if (debouncedSearch) params.set("search", debouncedSearch);
      return authApi.get<PagedResponse>(`/workouts?${params}`);
    },
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workouts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.meta.total ?? 0} exercises in the global library
          </p>
        </div>
        <Button onClick={() => router.push("/workouts/new")}>
          <Plus className="h-4 w-4 mr-2" /> Add workout
        </Button>
      </div>

      {/* Search + category filter */}
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
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                category === c
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {c === "ALL" ? "All categories" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground text-sm">
          No workouts found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} onClick={() => router.push(`/workouts/${w.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutCard({ workout: w, onClick }: { workout: Workout; onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-border bg-card p-5 hover:border-foreground/30 hover:shadow-sm transition-all space-y-3 group"
    >
      {/* Card cover */}
      <div className="h-28 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
        {(w.coverImageUrl ?? w.imageUrls[0]) ? (
          <img src={(w.coverImageUrl ?? w.imageUrls[0])!} alt={w.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl select-none">
            {w.category === "CARDIO" ? "🏃" : w.category === "STRENGTH" ? "🏋️" : w.category === "HIIT" ? "⚡" : "💪"}
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex gap-1.5 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[w.category] ?? "bg-muted text-muted-foreground"}`}>
          {w.category}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[w.difficulty] ?? "bg-muted text-muted-foreground"}`}>
          {w.difficulty}
        </span>
      </div>

      {/* Name */}
      <div>
        <p className="font-semibold text-foreground text-sm group-hover:text-foreground transition-colors">{w.name}</p>
        {w.muscleGroups.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {w.muscleGroups.slice(0, 3).join(" · ")}
            {w.muscleGroups.length > 3 ? ` +${w.muscleGroups.length - 3}` : ""}
          </p>
        )}
      </div>

      {/* Media indicators */}
      <div className="flex gap-2 text-muted-foreground">
        {w.videoUrl && <Video className="h-3.5 w-3.5" />}
        {w.audioUrl && <Volume2 className="h-3.5 w-3.5" />}
        {w.imageUrls.length > 0 && <Image className="h-3.5 w-3.5" />}
        {!w.isPublished && (
          <Badge variant="outline" className="text-xs ml-auto py-0">Draft</Badge>
        )}
      </div>
    </button>
  );
}
