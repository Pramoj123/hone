"use client";

import { use, useState, useRef, KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, Edit2, Trash2, Video, Volume2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaUploadField } from "@/components/ui/media-upload";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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
  instructions: string | null;
  tips: string | null;
  sets: string | null;
  reps: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  caloriesPerHour: number | null;
  isPublished: boolean;
}

const CATEGORIES = ["CARDIO", "STRENGTH", "HIIT", "FLEXIBILITY", "MOBILITY", "PLYOMETRICS", "CORE"];
const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

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

const editSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  category: z.string(),
  difficulty: z.string(),
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

type EditFormData = z.infer<typeof editSchema>;

interface PageProps {
  params: Promise<{ workoutId: string }>;
}

export default function WorkoutDetailPage({ params }: PageProps): React.JSX.Element {
  const { workoutId } = use(params);
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: workout, isLoading } = useQuery<Workout>({
    queryKey: ["workout", workoutId],
    queryFn: () => authApi.get<Workout>(`/workouts/${workoutId}`),
  });

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    values: workout
      ? {
          name: workout.name,
          slug: workout.slug,
          category: workout.category,
          difficulty: workout.difficulty,
          muscleGroups: workout.muscleGroups,
          equipment: workout.equipment,
          coverImageUrl: workout.coverImageUrl ?? "",
          imageUrls: workout.imageUrls ?? [],
          videoUrl: workout.videoUrl ?? "",
          audioUrl: workout.audioUrl ?? "",
          description: workout.description ?? "",
          instructions: workout.instructions ?? "",
          tips: workout.tips ?? "",
          sets: workout.sets ?? "",
          reps: workout.reps ?? "",
          restSeconds: workout.restSeconds ?? "",
          durationMinutes: workout.durationMinutes ?? "",
          caloriesPerHour: workout.caloriesPerHour ?? "",
          isPublished: workout.isPublished,
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditFormData) => authApi.patch(`/workouts/${workoutId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout", workoutId] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => authApi.delete(`/workouts/${workoutId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      router.push("/workouts");
    },
  });

  if (isLoading) return <WorkoutSkeleton />;
  if (!workout) return <div className="p-8 text-muted-foreground">Workout not found.</div>;

  const steps = workout.instructions
    ? workout.instructions.split("\n").filter(Boolean)
    : [];

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href="/workouts" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Workouts
        </Link>
        <span>/</span>
        <span className="text-foreground">{workout.name}</span>
      </nav>

      {!editing ? (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${CATEGORY_COLOR[workout.category] ?? "bg-muted text-muted-foreground"}`}>
                  {workout.category}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${DIFFICULTY_COLOR[workout.difficulty] ?? "bg-muted text-muted-foreground"}`}>
                  {workout.difficulty}
                </span>
                {!workout.isPublished && (
                  <Badge variant="outline" className="text-xs">Draft</Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-foreground">{workout.name}</h1>
              <p className="text-sm text-muted-foreground font-mono mt-1">{workout.slug}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => {
                  if (confirm("Delete this workout? This cannot be undone.")) deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>

          {/* Cover image */}
          {workout.coverImageUrl && (
            <div className="mb-6 rounded-xl overflow-hidden border border-border">
              <img
                src={workout.coverImageUrl}
                alt={workout.name}
                className="w-full max-h-72 object-cover"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Main content */}
            <div className="md:col-span-2 space-y-6">
              {workout.description && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Overview</CardTitle></CardHeader>
                  <CardContent className="text-sm text-foreground leading-relaxed">{workout.description}</CardContent>
                </Card>
              )}

              {workout.imageUrls.length > 0 && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Demonstration images</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {workout.imageUrls.map((url, index) => (
                        <div key={url} className="relative rounded-lg overflow-hidden border border-border bg-muted aspect-video">
                          <img src={url} alt={`Step ${index + 1}`} className="h-full w-full object-cover" />
                          <span className="absolute top-1.5 left-1.5 text-xs font-bold text-white bg-black/50 rounded px-1.5 py-0.5">
                            {index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {steps.length > 0 && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">How to perform</CardTitle></CardHeader>
                  <CardContent>
                    <ol className="space-y-3">
                      {steps.map((step, index) => {
                        const text = step.replace(/^\d+\.\s*/, "");
                        return (
                          <li key={index} className="flex gap-3">
                            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <p className="text-sm text-foreground leading-relaxed pt-0.5">{text}</p>
                          </li>
                        );
                      })}
                    </ol>
                  </CardContent>
                </Card>
              )}

              {workout.tips && (
                <Card className="border-yellow-200 bg-yellow-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-yellow-800">Form tips</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-yellow-900 leading-relaxed">{workout.tips}</CardContent>
                </Card>
              )}

              {/* Media */}
              {(workout.videoUrl || workout.audioUrl) && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Media</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {workout.videoUrl && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Video className="h-3.5 w-3.5" /> Video demonstration
                        </p>
                        {workout.videoUrl.includes("youtube") || workout.videoUrl.includes("youtu.be") ? (
                          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                            <iframe
                              src={workout.videoUrl.replace("watch?v=", "embed/")}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <video
                            src={workout.videoUrl}
                            controls
                            className="w-full rounded-lg bg-black"
                          />
                        )}
                      </div>
                    )}
                    {workout.audioUrl && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Volume2 className="h-3.5 w-3.5" /> Voice guide
                        </p>
                        <audio src={workout.audioUrl} controls className="w-full" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Metrics</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {workout.sets && <MetricRow label="Sets" value={workout.sets} />}
                  {workout.reps && <MetricRow label="Reps / Time" value={workout.reps} />}
                  {workout.restSeconds != null && (
                    <MetricRow label="Rest" value={`${workout.restSeconds}s`} />
                  )}
                  {workout.durationMinutes != null && (
                    <MetricRow label="Duration" value={`${workout.durationMinutes} min`} />
                  )}
                  {workout.caloriesPerHour != null && (
                    <MetricRow label="Calories/hr" value={`~${workout.caloriesPerHour}`} />
                  )}
                </CardContent>
              </Card>

              {workout.muscleGroups.length > 0 && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Muscles targeted</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {workout.muscleGroups.map((muscle) => (
                        <Badge key={muscle} variant="secondary" className="text-xs">{muscle}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {workout.equipment.length > 0 && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Equipment</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {workout.equipment.map((equipItem) => (
                        <Badge key={equipItem} variant="outline" className="text-xs">{equipItem}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      ) : (
        /* ── Edit form ── */
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-10">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-foreground">Edit workout</h1>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>

            <Section title="Basics">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
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
                    <FormLabel>Difficulty</FormLabel>
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
                  <FormControl><input type="checkbox" checked={field.value ?? true} onChange={(event) => field.onChange(event.target.checked)} className="h-4 w-4" /></FormControl>
                  <FormLabel className="!mt-0">Published</FormLabel>
                </FormItem>
              )} />
            </Section>

            <Section title="Muscles & Equipment">
              <FormField control={form.control} name="muscleGroups" render={({ field }) => (
                <FormItem>
                  <FormLabel>Muscle groups</FormLabel>
                  <TagInput values={field.value ?? []} onChange={field.onChange} placeholder="Add muscle group — press Enter" />
                </FormItem>
              )} />
              <FormField control={form.control} name="equipment" render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment</FormLabel>
                  <TagInput values={field.value ?? []} onChange={field.onChange} placeholder="Add equipment — press Enter" />
                </FormItem>
              )} />
            </Section>

            <Section title="Content">
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><textarea rows={3} className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="instructions" render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions</FormLabel>
                  <FormControl><textarea rows={8} className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none font-mono text-xs" {...field} /></FormControl>
                  <FormDescription>One step per line</FormDescription>
                </FormItem>
              )} />
              <FormField control={form.control} name="tips" render={({ field }) => (
                <FormItem>
                  <FormLabel>Form tips</FormLabel>
                  <FormControl><textarea rows={4} className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" {...field} /></FormControl>
                </FormItem>
              )} />
            </Section>

            <Section title="Metrics">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField control={form.control} name="sets" render={({ field }) => (
                  <FormItem><FormLabel>Sets</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="reps" render={({ field }) => (
                  <FormItem><FormLabel>Reps / Time</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="restSeconds" render={({ field }) => (
                  <FormItem><FormLabel>Rest (sec)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="caloriesPerHour" render={({ field }) => (
                  <FormItem><FormLabel>Cal/hour</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Duration (min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl>
                </FormItem>
              )} />
            </Section>

            <Section title="Media">
              <FormField control={form.control} name="coverImageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover image</FormLabel>
                  <MediaUploadField type="image" value={field.value ?? ""} onChange={field.onChange} />
                </FormItem>
              )} />
              <FormField control={form.control} name="imageUrls" render={({ field }) => (
                <FormItem>
                  <FormLabel>Demonstration images</FormLabel>
                  <MultiImageUpload values={field.value ?? []} onChange={field.onChange} />
                </FormItem>
              )} />
              <FormField control={form.control} name="videoUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Video demonstration</FormLabel>
                  <MediaUploadField type="video" value={field.value ?? ""} onChange={field.onChange} />
                </FormItem>
              )} />
              <FormField control={form.control} name="audioUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Audio guide</FormLabel>
                  <MediaUploadField type="audio" value={field.value ?? ""} onChange={field.onChange} />
                </FormItem>
              )} />
            </Section>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
            {updateMutation.error && (
              <p className="text-sm text-destructive">{(updateMutation.error as Error).message}</p>
            )}
          </form>
        </Form>
      )}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
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

function WorkoutSkeleton(): React.JSX.Element {
  return (
    <div className="p-8 max-w-4xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
