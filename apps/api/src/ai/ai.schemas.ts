import { z } from 'zod';

const DayOfWeek = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);

export const DailyWorkoutSchema = z.object({
  workouts: z.array(
    z.object({
      workoutId: z.string(),
      targetSets: z.string().optional().nullable(),
      targetReps: z.string().optional().nullable(),
      targetDurationMinutes: z.number().int().positive().optional().nullable(),
      targetWeightKg: z.number().positive().optional().nullable(),
      notes: z.string().optional().nullable(),
    }),
  ).min(1).max(8),
});

export const PlanWorkoutSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  entries: z.array(
    z.object({
      weekNumber: z.number().int().positive(),
      dayOfWeek: DayOfWeek,
      workoutId: z.string(),
      targetSets: z.number().int().positive().optional().nullable(),
      targetReps: z.number().int().positive().optional().nullable(),
      targetDurationMinutes: z.number().int().positive().optional().nullable(),
      targetWeightKg: z.number().positive().optional().nullable(),
      notes: z.string().optional().nullable(),
    }),
  ).min(1),
});

export type DailyWorkoutResponse = z.infer<typeof DailyWorkoutSchema>;
export type PlanWorkoutResponse = z.infer<typeof PlanWorkoutSchema>;
