"use client";

import { useDroppable } from "@dnd-kit/core";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAYS, DAY_LABELS, type RecurrenceDay, type EntryDraft, type GridState } from "./types";

const DIFFICULTY_DOT: Record<string, string> = {
  BEGINNER: "bg-green-500",
  INTERMEDIATE: "bg-yellow-500",
  ADVANCED: "bg-red-500",
};

interface DroppableCellProps {
  weekNumber: number;
  day: RecurrenceDay;
  entries: EntryDraft[];
  onRemove: (draftId: string) => void;
  onEdit: (entry: EntryDraft) => void;
}

function DroppableCell({ weekNumber, day, entries, onRemove, onEdit }: DroppableCellProps): React.JSX.Element {
  const { isOver, setNodeRef } = useDroppable({ id: `cell-w${weekNumber}-d${day}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[80px] rounded-lg border transition-colors p-1.5 space-y-1.5",
        isOver
          ? "border-primary bg-primary/5"
          : entries.length > 0
            ? "border-border bg-muted/20"
            : "border-dashed border-border/60 bg-transparent",
      )}
    >
      {entries.map((entry) => (
        <div
          key={entry.draftId}
          className="rounded-md bg-card border border-border p-1.5 group relative"
        >
          <div className="flex items-start gap-1 pr-10">
            <div
              className={cn("h-2 w-2 rounded-full mt-0.5 shrink-0", DIFFICULTY_DOT[entry.workout.difficulty] ?? "bg-muted")}
            />
            <p className="text-[11px] font-medium text-foreground leading-tight truncate">
              {entry.workout.name}
            </p>
          </div>
          {(entry.targetSets || entry.targetReps) && (
            <p className="text-[10px] text-muted-foreground mt-0.5 pl-3">
              {[entry.targetSets && `${entry.targetSets} sets`, entry.targetReps && `${entry.targetReps} reps`]
                .filter(Boolean)
                .join(" × ")}
            </p>
          )}
          {/* Action buttons */}
          <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(entry)}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="h-3 w-3" />
            </button>
            <button
              onClick={() => onRemove(entry.draftId)}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}

      {entries.length === 0 && (
        <p className="text-[10px] text-muted-foreground/40 text-center pt-2">drop here</p>
      )}
    </div>
  );
}

interface WeeklyGridProps {
  totalWeeks: number;
  activeWeek: number;
  onWeekChange: (week: number) => void;
  grid: GridState;
  onRemoveEntry: (weekNumber: number, day: RecurrenceDay, draftId: string) => void;
  onEditEntry: (entry: EntryDraft) => void;
}

export function WeeklyGrid({
  totalWeeks,
  activeWeek,
  onWeekChange,
  grid,
  onRemoveEntry,
  onEditEntry,
}: WeeklyGridProps): React.JSX.Element {
  const weekNumbers = Array.from({ length: totalWeeks }, (_, index) => index + 1);

  function weekHasEntries(week: number): boolean {
    const days = grid[week];
    if (!days) return false;
    return DAYS.some((day) => (days[day]?.length ?? 0) > 0);
  }

  const currentDays = grid[activeWeek] ?? {};

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Week tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 shrink-0">
        {weekNumbers.map((week) => (
          <button
            key={week}
            onClick={() => onWeekChange(week)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0",
              activeWeek === week
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            Week {week}
            {weekHasEntries(week) && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-2 flex-1 min-h-0 overflow-y-auto">
        {DAYS.map((day) => (
          <div key={day} className="flex flex-col gap-1.5 min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center shrink-0">
              {DAY_LABELS[day]}
            </p>
            <DroppableCell
              weekNumber={activeWeek}
              day={day}
              entries={currentDays[day] ?? []}
              onRemove={(draftId) => onRemoveEntry(activeWeek, day, draftId)}
              onEdit={onEditEntry}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
