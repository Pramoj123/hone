"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email: string;
  memberNumber: string | null;
}

interface AssessmentTemplate {
  id: string;
  name: string;
  organizationId: string | null;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  templateId: z.string().min(1, "Select a template"),
  clientId: z.string().min(1, "Select a client"),
  scheduledDate: z.string().optional(),
  weekNumber: z.coerce.number().int().min(1).max(53).optional().or(z.literal("")),
  year: z.coerce.number().int().min(2020).optional().or(z.literal("")),
  trainerNotes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  gymSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedTemplateId?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AssignAssessmentDialog({
  gymSlug, open, onOpenChange, preselectedTemplateId,
}: Props): React.JSX.Element {
  const queryClient = useQueryClient();
  const [memberSearch, setMemberSearch] = useState("");

  const { data: members } = useQuery<Member[]>({
    queryKey: ["members", gymSlug],
    queryFn: () => authApi.get<Member[]>(`/gyms/${gymSlug}/members`),
    enabled: open,
  });

  const { data: templates } = useQuery<AssessmentTemplate[]>({
    queryKey: ["assessment-templates", gymSlug],
    queryFn: () =>
      authApi.get<AssessmentTemplate[]>(`/assessment-templates?organizationSlug=${gymSlug}`),
    enabled: open,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      templateId: preselectedTemplateId ?? "",
      clientId: "",
      scheduledDate: "",
      weekNumber: "",
      year: "",
      trainerNotes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: object) =>
      authApi.post(`/gyms/${gymSlug}/assessments`, payload),
    onSuccess: (_, payload: any) => {
      queryClient.invalidateQueries({ queryKey: ["assessments", gymSlug] });
      const client = members?.find((member) => member.id === payload.clientId);
      toast.success(`Assessment assigned${client ? ` to ${client.name}` : ""}`);
      handleClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleClose() {
    onOpenChange(false);
    form.reset();
    setMemberSearch("");
  }

  function onSubmit(data: FormData) {
    const payload: Record<string, unknown> = {
      templateId: data.templateId,
      clientId: data.clientId,
    };
    if (data.scheduledDate) payload.scheduledDate = data.scheduledDate;
    if (data.weekNumber) payload.weekNumber = Number(data.weekNumber);
    if (data.year) payload.year = Number(data.year);
    if (data.trainerNotes) payload.trainerNotes = data.trainerNotes;
    mutation.mutate(payload);
  }

  const systemTemplates = templates?.filter((template) => template.organizationId === null) ?? [];
  const orgTemplates = templates?.filter((template) => template.organizationId !== null) ?? [];

  const filteredMembers = (members ?? []).filter(
    (member) =>
      !memberSearch ||
      member.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      member.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (member.memberNumber ?? "").toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-8 pt-8 pb-4 border-b border-border shrink-0">
          <DialogTitle>Assign assessment</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-5">

              {/* Template */}
              <FormField control={form.control} name="templateId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Template <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      {...field}
                    >
                      <option value="">Select template…</option>
                      {systemTemplates.length > 0 && (
                        <optgroup label="System templates">
                          {systemTemplates.map((template) => (
                            <option key={template.id} value={template.id}>{template.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {orgTemplates.length > 0 && (
                        <optgroup label="Your templates">
                          {orgTemplates.map((template) => (
                            <option key={template.id} value={template.id}>{template.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Client — search + select */}
              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Client <span className="text-destructive">*</span></FormLabel>
                  <div className="space-y-1.5">
                    <Input
                      placeholder="Search by name, email, member #…"
                      value={memberSearch}
                      onChange={(event) => setMemberSearch(event.target.value)}
                    />
                    <FormControl>
                      <select
                        size={5}
                        className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        {...field}
                      >
                        <option value="">— select client —</option>
                        {filteredMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}{member.memberNumber ? ` (${member.memberNumber})` : ""} — {member.email}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Scheduled date */}
              <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled date <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Week + Year (for weekly check-ins) */}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="weekNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Week # <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={53} placeholder="e.g. 24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="year" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input type="number" min={2020} placeholder="2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Notes */}
              <FormField control={form.control} name="trainerNotes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes for client <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      placeholder="Any specific instructions or context…"
                      className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
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
                  {mutation.isPending ? "Assigning…" : "Assign assessment"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
