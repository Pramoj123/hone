"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Clock } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

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
  completedAt: string | null;
  trainerNotes: string | null;
  overallRating: number | null;
  weekNumber: number | null;
  year: number | null;
  scheduledDate: string | null;
  template: {
    id: string;
    name: string;
    fields: TemplateField[];
  };
  client: {
    id: string;
    name: string;
    email: string;
    photoUrl: string | null;
    branchId: string | null;
  };
  trainer: { id: string; name: string; email: string } | null;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  overallRating: z.number().int().min(1).max(5).optional(),
  trainerNotes: z.string().optional(),
  status: z.enum(["PENDING", "SUBMITTED", "REVIEWED"]).optional(),
});
type FormData = z.infer<typeof schema>;

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING:   { label: "Pending",   cls: "bg-amber-100 text-amber-700 border-amber-200" },
  SUBMITTED: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  REVIEWED:  { label: "Reviewed",  cls: "bg-green-100 text-green-700 border-green-200" },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  gymSlug: string;
  assessment: Assessment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AssessmentReviewDialog({
  gymSlug, assessment, open, onOpenChange,
}: Props): React.JSX.Element {
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { trainerNotes: "", overallRating: undefined, status: undefined },
  });

  // Sync form when assessment changes
  useEffect(() => {
    if (assessment) {
      form.reset({
        trainerNotes: assessment.trainerNotes ?? "",
        overallRating: assessment.overallRating ?? undefined,
        status: assessment.status === "SUBMITTED" ? "REVIEWED" : assessment.status,
      });
    }
  }, [assessment, form]);

  const mutation = useMutation({
    mutationFn: (payload: object) =>
      authApi.patch(`/gyms/${gymSlug}/assessments/${assessment!.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments", gymSlug] });
      toast.success("Assessment review saved");
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(data: FormData) {
    const payload: Record<string, unknown> = {};
    if (data.trainerNotes !== undefined) payload.trainerNotes = data.trainerNotes || undefined;
    if (data.overallRating !== undefined) payload.overallRating = data.overallRating;
    if (data.status !== undefined) payload.status = data.status;
    mutation.mutate(payload);
  }

  if (!assessment) return <></>;

  const fields = assessment.template.fields ?? [];
  const responses = assessment.responses ?? {};
  const statusCfg = STATUS_CONFIG[assessment.status];
  const isPending = assessment.status === "PENDING";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-8 pt-8 pb-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg">{assessment.template.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {assessment.weekNumber && assessment.year
                  ? `Week ${assessment.weekNumber}, ${assessment.year}`
                  : assessment.scheduledDate
                  ? new Date(assessment.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                  : "No date set"}
              </p>
            </div>
            <Badge className={`${statusCfg.cls} border shrink-0`}>{statusCfg.label}</Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Left — client info + responses */}
          <div className="flex-1 overflow-y-auto px-8 py-6 border-r border-border space-y-6">
            {/* Client header */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-base font-semibold text-muted-foreground shrink-0">
                {assessment.client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{assessment.client.name}</p>
                <p className="text-xs text-muted-foreground">{assessment.client.email}</p>
              </div>
            </div>

            {/* Responses */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Client responses
              </p>

              {isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center border border-dashed border-border rounded-lg">
                  <Clock className="h-4 w-4" />
                  Awaiting client submission
                </div>
              ) : fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">No fields defined in this template.</p>
              ) : (
                <dl className="space-y-3">
                  {fields.map((fieldItem) => {
                    const val = responses[fieldItem.id];
                    const display =
                      val === undefined || val === null || val === ""
                        ? <span className="text-muted-foreground italic">Not answered</span>
                        : <span>{String(val)}{fieldItem.unit ? <span className="text-muted-foreground ml-1">{fieldItem.unit}</span> : null}</span>;

                    return (
                      <div key={fieldItem.id} className="flex items-start gap-3 rounded-lg bg-muted/30 px-4 py-3">
                        <dt className="text-xs text-muted-foreground w-36 shrink-0 pt-0.5 leading-relaxed">
                          {fieldItem.label}
                          {fieldItem.required && <span className="text-destructive ml-0.5">*</span>}
                        </dt>
                        <dd className="text-sm font-medium text-foreground flex-1 break-words">
                          {display}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </div>

            {/* Submitted at */}
            {assessment.completedAt && (
              <p className="text-xs text-muted-foreground">
                Submitted {new Date(assessment.completedAt).toLocaleString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </div>

          {/* Right — trainer review form */}
          <div className="w-80 shrink-0 overflow-y-auto px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Trainer review
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Star rating */}
                <FormField control={form.control} name="overallRating" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall rating</FormLabel>
                    <div className="flex gap-1.5 mt-1">
                      {[1, 2, 3, 4, 5].map((starValue) => (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => field.onChange(field.value === starValue ? undefined : starValue)}
                          className="transition-colors"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              field.value !== undefined && starValue <= field.value
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/40 hover:text-amber-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Notes */}
                <FormField control={form.control} name="trainerNotes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trainer notes</FormLabel>
                    <FormControl>
                      <textarea
                        rows={6}
                        placeholder="Observations, recommendations, next steps…"
                        className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Status */}
                {assessment.status === "SUBMITTED" && (
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mark as</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          {...field}
                        >
                          <option value="SUBMITTED">Submitted (no change)</option>
                          <option value="REVIEWED">Reviewed</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {mutation.error && (
                  <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
                )}

                <Button type="submit" className="w-full" disabled={mutation.isPending || isPending}>
                  {mutation.isPending ? "Saving…" : isPending ? "Awaiting submission" : "Save review"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
