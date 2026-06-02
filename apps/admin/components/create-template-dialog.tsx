"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ChevronDown, X } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

// ── Types ────────────────────────────────────────────────────────────────────

export type FieldType = "number" | "text" | "select" | "textarea";

interface FieldDraft {
  _id: string;         // internal key — becomes `id` in the DTO
  label: string;
  type: FieldType;
  unit: string;
  required: boolean;
  options: string[];   // only used when type === "select"
  _optionInput: string; // ephemeral input state
}

// ── Top-level form schema (name + description only) ──────────────────────────

const schema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function makeField(): FieldDraft {
  return { _id: genId(), label: "", type: "number", unit: "", required: false, options: [], _optionInput: "" };
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  number: "Number",
  text: "Text",
  select: "Select (dropdown)",
  textarea: "Long text",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  gymSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateTemplateDialog({ gymSlug, open, onOpenChange }: Props): React.JSX.Element {
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<FieldDraft[]>([makeField()]);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  const mutation = useMutation({
    mutationFn: (payload: object) =>
      authApi.post(`/gyms/${gymSlug}/assessment-templates`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment-templates", gymSlug] });
      toast.success("Template created");
      handleClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleClose() {
    onOpenChange(false);
    form.reset();
    setFields([makeField()]);
    setFieldsError(null);
  }

  function addField() {
    setFields((prev) => [...prev, makeField()]);
    setFieldsError(null);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, fieldIndex) => fieldIndex !== index));
  }

  function moveField(index: number, dir: "up" | "down") {
    setFields((prev) => {
      const next = [...prev];
      const swap = dir === "up" ? index - 1 : index + 1;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  }

  function updateField(index: number, patch: Partial<FieldDraft>) {
    setFields((prev) => prev.map((fieldDraft, fieldIndex) => (fieldIndex === index ? { ...fieldDraft, ...patch } : fieldDraft)));
  }

  function addOption(index: number) {
    const field = fields[index];
    const opt = field._optionInput.trim();
    if (!opt) return;
    if (field.options.includes(opt)) return;
    updateField(index, { options: [...field.options, opt], _optionInput: "" });
  }

  function removeOption(fieldIndex: number, optIndex: number) {
    setFields((prev) =>
      prev.map((fieldDraft, idx) =>
        idx === fieldIndex ? { ...fieldDraft, options: fieldDraft.options.filter((_, optI) => optI !== optIndex) } : fieldDraft
      )
    );
  }

  function onSubmit(data: FormData) {
    // Validate fields array
    if (fields.length === 0) {
      setFieldsError("Add at least one field");
      return;
    }
    for (const fieldDraft of fields) {
      if (!fieldDraft.label.trim()) {
        setFieldsError("All fields must have a label");
        return;
      }
      if (fieldDraft.type === "select" && fieldDraft.options.length < 2) {
        setFieldsError(`Select field "${fieldDraft.label}" needs at least 2 options`);
        return;
      }
    }
    setFieldsError(null);

    mutation.mutate({
      name: data.name,
      description: data.description || undefined,
      fields: fields.map((fieldDraft) => ({
        id: fieldDraft._id,
        label: fieldDraft.label.trim(),
        type: fieldDraft.type,
        unit: fieldDraft.unit.trim() || undefined,
        required: fieldDraft.required,
        options: fieldDraft.type === "select" ? fieldDraft.options : undefined,
      })),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-8 pt-8 pb-4 border-b border-border shrink-0">
          <DialogTitle>Create assessment template</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">

              {/* Name + description */}
              <div className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Weekly check-in" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <textarea
                        rows={2}
                        placeholder="What is this assessment for?"
                        className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Fields builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2 flex-1">
                    Fields ({fields.length})
                  </p>
                </div>

                {fields.map((field, index) => (
                  <FieldRow
                    key={field._id}
                    field={field}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === fields.length - 1}
                    onChange={(patch) => updateField(index, patch)}
                    onRemove={() => removeField(index)}
                    onMoveUp={() => moveField(index, "up")}
                    onMoveDown={() => moveField(index, "down")}
                    onAddOption={() => addOption(index)}
                    onRemoveOption={(optIndex) => removeOption(index, optIndex)}
                  />
                ))}

                {fieldsError && (
                  <p className="text-sm text-destructive">{fieldsError}</p>
                )}

                <Button type="button" variant="outline" size="sm" onClick={addField} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Add field
                </Button>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-border shrink-0">
              {mutation.error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-4">
                  {(mutation.error as Error).message}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving…" : "Create template"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Field row ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: FieldDraft;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<FieldDraft>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddOption: () => void;
  onRemoveOption: (optIndex: number) => void;
}

function FieldRow({
  field, index, isFirst, isLast,
  onChange, onRemove, onMoveUp, onMoveDown, onAddOption, onRemoveOption,
}: FieldRowProps): React.JSX.Element {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
      {/* Row header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Field {index + 1}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onMoveUp} disabled={isFirst}
            className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={isLast}
            className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onRemove}
            className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Label + Type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Label <span className="text-destructive">*</span></label>
          <Input
            placeholder="e.g. Weight"
            value={field.label}
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Type</label>
          <select
            value={field.type}
            onChange={(event) => onChange({ type: event.target.value as FieldType, options: [] })}
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Unit (number only) + Required */}
      <div className="flex items-center gap-4">
        {field.type === "number" && (
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1.5">Unit <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              placeholder="kg, cm, bpm…"
              value={field.unit}
              onChange={(event) => onChange({ unit: event.target.value })}
            />
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(event) => onChange({ required: event.target.checked })}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          Required
        </label>
      </div>

      {/* Options builder (select only) */}
      {field.type === "select" && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground block">Options <span className="text-destructive">*</span> (min 2)</label>
          {field.options.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {field.options.map((option, optIndex) => (
                <span key={optIndex} className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full border border-border">
                  {option}
                  <button type="button" onClick={() => onRemoveOption(optIndex)} className="hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Add option…"
              value={field._optionInput}
              onChange={(event) => onChange({ _optionInput: event.target.value })}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onAddOption(); } }}
            />
            <Button type="button" variant="outline" size="sm" onClick={onAddOption}>
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
