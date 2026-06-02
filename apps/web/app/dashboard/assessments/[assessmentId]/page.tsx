"use client";

import { use, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Star, CheckCircle2, MessageSquare, Clock } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateField {
  id: string;
  label: string;
  type: "number" | "text" | "select" | "textarea";
  unit?: string;
  required: boolean;
  options?: string[];
}

export interface Assessment {
  id: string;
  status: "PENDING" | "SUBMITTED" | "REVIEWED";
  responses: Record<string, unknown>;
  weekNumber: number | null;
  year: number | null;
  scheduledDate: string | null;
  completedAt: string | null;
  trainerNotes: string | null;
  overallRating: number | null;
  template: { id: string; name: string; description: string | null; fields: TemplateField[] };
  trainer: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ── Page shell ────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ assessmentId: string }>;
}

export default function AssessmentDetailPage({ params }: PageProps): React.JSX.Element {
  const { assessmentId } = use(params);

  const { data: assessment, isLoading } = useQuery<Assessment>({
    queryKey: ["me-assessment", assessmentId],
    queryFn: () => authApi.get<Assessment>(`/me/assessments/${assessmentId}`),
  });

  if (isLoading) return <PageSkeleton />;
  if (!assessment) {
    return (
      <div className="p-4 md:p-8 max-w-xl">
        <Link href="/dashboard/assessments" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Assessments
        </Link>
        <p className="text-muted-foreground">Assessment not found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard/assessments" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Assessments
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{assessment.template.name}</span>
      </nav>

      {assessment.status === "PENDING" ? (
        <SubmissionForm assessment={assessment} />
      ) : (
        <ReadOnlyView assessment={assessment} />
      )}
    </div>
  );
}

// ── Dynamic zod schema builder ────────────────────────────────────────────────

function buildSchema(fields: TemplateField[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    if (field.type === "number") {
      const base = z.preprocess(
        (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
        field.required
          ? z.number({ required_error: `${field.label} is required`, invalid_type_error: `${field.label} must be a number` })
          : z.number().optional()
      );
      shape[field.id] = base;
    } else {
      const base = field.required
        ? z.string().min(1, `${field.label} is required`)
        : z.string().optional();
      shape[field.id] = base;
    }
  }
  return z.object(shape);
}

function buildDefaultValues(
  fields: TemplateField[],
  existing: Record<string, unknown> = {}
): Record<string, unknown> {
  const vals: Record<string, unknown> = {};
  for (const field of fields) {
    vals[field.id] = existing[field.id] ?? "";
  }
  return vals;
}

// ── Mode A — Submission form ──────────────────────────────────────────────────

function SubmissionForm({ assessment }: { assessment: Assessment }): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<Record<string, unknown> | null>(null);

  const fields = assessment.template.fields ?? [];
  const schema = useMemo(() => buildSchema(fields), [fields]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(fields, assessment.responses),
  });

  const mutation = useMutation({
    mutationFn: (responses: Record<string, unknown>) =>
      authApi.patch(`/me/assessments/${assessment.id}/submit`, { responses }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["me-assessment", assessment.id] });
      toast.success("Assessment submitted!");
      router.push("/dashboard/assessments");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(values: Record<string, unknown>) {
    setPendingValues(values);
    setConfirmOpen(true);
  }

  function confirmSubmit() {
    if (!pendingValues) return;
    mutation.mutate(pendingValues);
  }

  const dateLabel = assessment.scheduledDate
    ? `Due ${new Date(assessment.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`
    : assessment.weekNumber && assessment.year
    ? `Week ${assessment.weekNumber}, ${assessment.year}`
    : null;

  return (
    <>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-900/20 text-amber-400 border border-amber-900/40">
            <Clock className="h-3 w-3" /> Pending
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mt-2">{assessment.template.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {assessment.trainer ? `Assigned by ${assessment.trainer.name}` : "Assigned by your trainer"}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </p>
        {assessment.template.description && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {assessment.template.description}
          </p>
        )}
      </div>

      {/* Dynamic form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {fields.map((fieldDef) => (
            <FormField
              key={fieldDef.id}
              control={form.control as any}
              name={fieldDef.id}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {fieldDef.label}
                    {fieldDef.required && <span className="text-destructive ml-0.5">*</span>}
                  </FormLabel>
                  <FormControl>
                    <FieldInput fieldDef={fieldDef} field={field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">
              This assessment has no fields configured.
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Submit assessment
          </Button>
        </form>
      </Form>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit assessment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Once submitted, you cannot edit your responses. Your trainer will be notified.
          </p>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Go back
            </Button>
            <Button onClick={confirmSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting…" : "Yes, submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Field input renderer ──────────────────────────────────────────────────────

function FieldInput({
  fieldDef,
  field,
}: {
  fieldDef: TemplateField;
  field: { value: unknown; onChange: (value: unknown) => void; onBlur: () => void; name: string };
}): React.JSX.Element {
  const strValue = field.value === undefined || field.value === null ? "" : String(field.value);

  if (fieldDef.type === "number") {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.1"
          placeholder={fieldDef.unit ? `0 ${fieldDef.unit}` : "0"}
          value={strValue}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={field.onBlur}
          className="flex-1 text-base"
        />
        {fieldDef.unit && (
          <span className="text-sm text-muted-foreground w-12 shrink-0">{fieldDef.unit}</span>
        )}
      </div>
    );
  }

  if (fieldDef.type === "textarea") {
    return (
      <textarea
        rows={3}
        placeholder={`Enter ${fieldDef.label.toLowerCase()}…`}
        value={strValue}
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={field.onBlur}
        className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-base resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    );
  }

  if (fieldDef.type === "select") {
    return (
      <select
        value={strValue}
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={field.onBlur}
        className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Select…</option>
        {(fieldDef.options ?? []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  // text (default)
  return (
    <Input
      type="text"
      placeholder={`Enter ${fieldDef.label.toLowerCase()}…`}
      value={strValue}
      onChange={(event) => field.onChange(event.target.value)}
      onBlur={field.onBlur}
      className="text-base"
    />
  );
}

// ── Mode B — Read-only view ───────────────────────────────────────────────────

function ReadOnlyView({ assessment }: { assessment: Assessment }): React.JSX.Element {
  const fields = assessment.template.fields ?? [];
  const responses = assessment.responses ?? {};
  const isReviewed = assessment.status === "REVIEWED";

  const dateLabel = assessment.weekNumber && assessment.year
    ? `Week ${assessment.weekNumber}, ${assessment.year}`
    : assessment.scheduledDate
    ? new Date(assessment.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {assessment.status === "SUBMITTED" ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-900/20 text-blue-400 border border-blue-900/40">
              <CheckCircle2 className="h-3 w-3" /> Submitted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-900/20 text-green-400 border border-green-900/40">
              <CheckCircle2 className="h-3 w-3" /> Reviewed
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground mt-2">{assessment.template.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {assessment.trainer ? `Assigned by ${assessment.trainer.name}` : ""}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </p>
        {assessment.completedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Submitted{" "}
            {new Date(assessment.completedAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Responses */}
      {fields.length > 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Your responses
            </p>
          </div>
          <dl className="divide-y divide-border">
            {fields.map((templateField) => {
              const val = responses[templateField.id];
              const display =
                val === undefined || val === null || val === ""
                  ? <span className="text-muted-foreground italic text-sm">Not answered</span>
                  : (
                    <span className="text-sm font-medium text-foreground">
                      {String(val)}{templateField.unit ? <span className="text-muted-foreground ml-1 font-normal">{templateField.unit}</span> : null}
                    </span>
                  );

              return (
                <div key={templateField.id} className="flex items-start gap-4 px-5 py-3">
                  <dt className="text-sm text-muted-foreground w-40 shrink-0 pt-0.5">{templateField.label}</dt>
                  <dd className="flex-1">{display}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No fields in this assessment.</p>
      )}

      {/* Trainer feedback (REVIEWED only) */}
      {isReviewed && (assessment.overallRating || assessment.trainerNotes) && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-primary">Trainer feedback</p>
          </div>

          {assessment.overallRating && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Overall rating</p>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={`h-5 w-5 ${index < assessment.overallRating! ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
            </div>
          )}

          {assessment.trainerNotes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Notes</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {assessment.trainerNotes}
              </p>
            </div>
          )}

          {assessment.completedAt && (
            <p className="text-xs text-muted-foreground">
              Reviewed on{" "}
              {new Date(assessment.updatedAt).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          )}
        </div>
      )}
    </>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function PageSkeleton(): React.JSX.Element {
  return (
    <div className="p-4 md:p-8 max-w-xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <div className="space-y-4 pt-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 rounded-xl" />
    </div>
  );
}
