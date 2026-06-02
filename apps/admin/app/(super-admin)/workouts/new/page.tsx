"use client";

import { useRef, KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaUploadField } from "@/components/ui/media-upload";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const CATEGORIES = ["CARDIO", "STRENGTH", "HIIT", "FLEXIBILITY", "MOBILITY", "PLYOMETRICS", "CORE"];
const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

const workoutSchema = z.object({
  name: z.string().min(2, "Required"),
  slug: z.string().min(2, "Required").regex(/^[a-z0-9-]+$/, "Lowercase, numbers, hyphens only"),
  category: z.enum(["CARDIO", "STRENGTH", "HIIT", "FLEXIBILITY", "MOBILITY", "PLYOMETRICS", "CORE"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  muscleGroups: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  coverImageUrl: z.string().optional().or(z.literal("")),
  imageUrls: z.array(z.string()).optional(),
  videoUrl: z.string().optional().or(z.literal("")),
  audioUrl: z.string().optional().or(z.literal("")),
  description: z.string().optional(),
  instructions: z.string().optional(),
  tips: z.string().optional(),
  sets: z.string().optional(),
  reps: z.string().optional(),
  restSeconds: z.coerce.number().int().min(0).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(1).optional().or(z.literal("")),
  caloriesPerHour: z.coerce.number().int().min(0).optional().or(z.literal("")),
  isPublished: z.boolean().optional(),
});

type WorkoutFormData = z.infer<typeof workoutSchema>;

export default function NewWorkoutPage(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      name: "", slug: "", category: "STRENGTH", difficulty: "INTERMEDIATE",
      muscleGroups: [], equipment: [],
      coverImageUrl: "", imageUrls: [], videoUrl: "", audioUrl: "",
      description: "", instructions: "", tips: "",
      sets: "", reps: "", isPublished: true,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: WorkoutFormData) => authApi.post<{ id: string }>("/workouts", data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      router.push(`/workouts/${res.id}`);
    },
  });

  function handleNameChange(value: string): void {
    form.setValue("name", value);
    form.setValue("slug", value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  }

  return (
    <div className="p-8 max-w-3xl">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href="/workouts" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Workouts
        </Link>
        <span>/</span>
        <span className="text-foreground">New workout</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground mb-8">Add workout</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-10">

          <Section title="Basics">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name <Req /></FormLabel>
                  <FormControl>
                    <Input placeholder="Barbell Back Squat" {...field} onChange={(event) => handleNameChange(event.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug <Req /></FormLabel>
                  <FormControl><Input placeholder="barbell-back-squat" {...field} /></FormControl>
                  <FormDescription>URL identifier — auto-generated from name</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category <Req /></FormLabel>
                  <FormControl>
                    <select className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm" {...field}>
                      {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="difficulty" render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty <Req /></FormLabel>
                  <FormControl>
                    <select className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm" {...field}>
                      {DIFFICULTIES.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="isPublished" render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <input type="checkbox" checked={field.value ?? true} onChange={(event) => field.onChange(event.target.checked)} className="h-4 w-4" />
                </FormControl>
                <FormLabel className="!mt-0">Published (visible to trainers and members)</FormLabel>
              </FormItem>
            )} />
          </Section>

          <Section title="Muscles & Equipment">
            <FormField control={form.control} name="muscleGroups" render={({ field }) => (
              <FormItem>
                <FormLabel>Muscle groups</FormLabel>
                <TagInput values={field.value ?? []} onChange={field.onChange} placeholder="e.g. Quadriceps — press Enter" />
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="equipment" render={({ field }) => (
              <FormItem>
                <FormLabel>Equipment required</FormLabel>
                <TagInput values={field.value ?? []} onChange={field.onChange} placeholder="e.g. Barbell — press Enter" />
                <FormMessage />
              </FormItem>
            )} />
          </Section>

          <Section title="Content">
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <textarea rows={3} className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" placeholder="Brief overview of the exercise and its benefits…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="instructions" render={({ field }) => (
              <FormItem>
                <FormLabel>Step-by-step instructions</FormLabel>
                <FormControl>
                  <textarea rows={8} className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none font-mono text-xs" placeholder={"1. Start position...\n2. Inhale and...\n3. Drive through..."} {...field} />
                </FormControl>
                <FormDescription>Each step on a new line — shown as a numbered list</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tips" render={({ field }) => (
              <FormItem>
                <FormLabel>Form tips & common mistakes</FormLabel>
                <FormControl>
                  <textarea rows={4} className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" placeholder="Keep your back flat throughout. Avoid letting your knees cave inward…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </Section>

          <Section title="Metrics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField control={form.control} name="sets" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sets</FormLabel>
                  <FormControl><Input placeholder="3-4" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reps" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reps / Duration</FormLabel>
                  <FormControl><Input placeholder="8-12 or 30 sec" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="restSeconds" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rest (seconds)</FormLabel>
                  <FormControl><Input type="number" placeholder="90" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="caloriesPerHour" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cal/hour</FormLabel>
                  <FormControl><Input type="number" placeholder="400" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="durationMinutes" render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Duration (minutes) — for cardio</FormLabel>
                <FormControl><Input type="number" placeholder="30" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </Section>

          <Section title="Media">
            <FormField control={form.control} name="coverImageUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Cover image</FormLabel>
                <MediaUploadField type="image" value={field.value ?? ""} onChange={field.onChange} />
                <FormDescription>Hero image shown on the workout card and at the top of the detail page</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="imageUrls" render={({ field }) => (
              <FormItem>
                <FormLabel>Demonstration images</FormLabel>
                <MultiImageUpload values={field.value ?? []} onChange={field.onChange} />
                <FormDescription>Multiple images showing technique, angles, or step-by-step form</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="videoUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Video demonstration</FormLabel>
                <MediaUploadField type="video" value={field.value ?? ""} onChange={field.onChange} />
                <FormDescription>MP4 file or YouTube URL</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="audioUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Audio guide</FormLabel>
                <MediaUploadField type="audio" value={field.value ?? ""} onChange={field.onChange} />
                <FormDescription>Voice walkthrough played while the member performs the exercise</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </Section>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save workout"}
            </Button>
          </div>

          {mutation.error && (
            <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}
        </form>
      </Form>
    </div>
  );
}

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (values: string[]) => void; placeholder?: string }): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const value = inputRef.current?.value.trim();
    if (value && !values.includes(value)) onChange([...values, value]);
    if (inputRef.current) inputRef.current.value = "";
  }
  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((tagValue) => (
            <span key={tagValue} className="inline-flex items-center gap-1 bg-muted text-foreground text-xs px-2 py-1 rounded-md">
              {tagValue}
              <button type="button" onClick={() => onChange(values.filter((item) => item !== tagValue))} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input ref={inputRef} placeholder={placeholder} onKeyDown={handleKeyDown} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">{title}</p>
      {children}
    </div>
  );
}

function Req(): React.JSX.Element {
  return <span className="text-destructive ml-0.5">*</span>;
}
