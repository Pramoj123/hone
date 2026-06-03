export const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export type RecurrenceDay = (typeof DAYS)[number];

export const DAY_LABELS: Record<RecurrenceDay, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun",
};

export interface Workout {
  id: string;
  name: string;
  slug: string;
  category: string;
  difficulty: string;
  muscleGroups: string[];
  durationMinutes: number | null;
  coverImageUrl: string | null;
}

export interface EntryDraft {
  draftId: string;
  workoutId: string;
  workout: Workout;
  notes?: string;
  targetSets?: number;
  targetReps?: number;
  targetWeightKg?: number;
  targetDurationMinutes?: number;
}

export type DayGrid = Partial<Record<RecurrenceDay, EntryDraft[]>>;
export type GridState = Record<number, DayGrid>;

export interface PlanDetails {
  clientId: string;
  clientName: string;
  name: string;
  description?: string;
  totalWeeks: number;
  startDate: string;
}

export interface ProgramPlanEntry {
  id: string;
  workoutId: string;
  workout: Workout;
  weekNumber: number;
  dayOfWeek: RecurrenceDay;
  notes: string | null;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationMinutes: number | null;
}

export interface ProgramPlan {
  id: string;
  name: string;
  description: string | null;
  totalWeeks: number;
  startDate: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  clientId: string;
  trainerId: string;
  client: { id: string; name: string; email: string; memberNumber: string | null };
  trainer: { id: string; name: string; email: string };
  entries: ProgramPlanEntry[];
}

export function flattenGrid(grid: GridState): Array<{
  workoutId: string;
  weekNumber: number;
  dayOfWeek: RecurrenceDay;
  notes?: string;
  targetSets?: number;
  targetReps?: number;
  targetWeightKg?: number;
  targetDurationMinutes?: number;
}> {
  const result = [];
  for (const [week, days] of Object.entries(grid)) {
    for (const [day, entries] of Object.entries(days)) {
      for (const entry of entries ?? []) {
        result.push({
          workoutId: entry.workoutId,
          weekNumber: Number(week),
          dayOfWeek: day as RecurrenceDay,
          notes: entry.notes,
          targetSets: entry.targetSets,
          targetReps: entry.targetReps,
          targetWeightKg: entry.targetWeightKg,
          targetDurationMinutes: entry.targetDurationMinutes,
        });
      }
    }
  }
  return result;
}

export function buildGridFromEntries(entries: ProgramPlanEntry[]): GridState {
  const grid: GridState = {};
  for (const entry of entries) {
    if (!grid[entry.weekNumber]) grid[entry.weekNumber] = {};
    const cell = grid[entry.weekNumber][entry.dayOfWeek] ?? [];
    cell.push({
      draftId: entry.id,
      workoutId: entry.workoutId,
      workout: entry.workout,
      notes: entry.notes ?? undefined,
      targetSets: entry.targetSets ?? undefined,
      targetReps: entry.targetReps ?? undefined,
      targetWeightKg: entry.targetWeightKg ?? undefined,
      targetDurationMinutes: entry.targetDurationMinutes ?? undefined,
    });
    grid[entry.weekNumber][entry.dayOfWeek] = cell;
  }
  return grid;
}

let _counter = 0;
export function newDraftId(): string {
  return `draft-${Date.now()}-${_counter++}`;
}
