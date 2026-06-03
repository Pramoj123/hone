"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Workout } from "./types";

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: "bg-green-100 text-green-700",
  INTERMEDIATE: "bg-yellow-100 text-yellow-700",
  ADVANCED: "bg-red-100 text-red-700",
};

function toLabel(value: string): string {
  return value === "HIIT" ? "HIIT" : value.charAt(0) + value.slice(1).toLowerCase();
}

interface DraggableCardProps {
  workout: Workout;
}

function DraggableCard({ workout }: DraggableCardProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `picker-${workout.id}`,
    data: { workout },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing select-none hover:border-foreground/20 transition-colors touch-none"
    >
      <p className="text-sm font-medium text-foreground leading-tight truncate">{workout.name}</p>
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[workout.difficulty] ?? "bg-muted text-muted-foreground"}`}>
          {toLabel(workout.difficulty)}
        </span>
        {workout.durationMinutes && (
          <span className="text-[10px] text-muted-foreground">{workout.durationMinutes} min</span>
        )}
      </div>
      {workout.muscleGroups.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {workout.muscleGroups.slice(0, 3).join(" · ")}
        </p>
      )}
    </div>
  );
}

interface WorkoutPickerProps {
  workouts: Workout[];
  isLoading: boolean;
}

export function WorkoutPicker({ workouts, isLoading }: WorkoutPickerProps): React.JSX.Element {
  const [search, setSearch] = useState("");

  const filtered = search
    ? workouts.filter((workout) =>
        workout.name.toLowerCase().includes(search.toLowerCase()) ||
        workout.muscleGroups.some((muscle) => muscle.toLowerCase().includes(search.toLowerCase())),
      )
    : workouts;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border shrink-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Workout library
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No workouts found</p>
        ) : (
          filtered.map((workout) => <DraggableCard key={workout.id} workout={workout} />)
        )}
      </div>

      <div className="p-3 border-t border-border shrink-0">
        <p className="text-[10px] text-muted-foreground text-center">
          Drag workouts onto day cells →
        </p>
      </div>
    </div>
  );
}
