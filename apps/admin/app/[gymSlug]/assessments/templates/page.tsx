"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ClipboardList, Globe, ChevronRight } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateTemplateDialog } from "@/components/create-template-dialog";
import { AssignAssessmentDialog } from "@/components/assign-assessment-dialog";
import { useCurrentUser } from "@/lib/use-current-user";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TemplateField {
  id: string;
  label: string;
  type: string;
  unit?: string;
  required: boolean;
  options?: string[];
}

interface AssessmentTemplate {
  id: string;
  name: string;
  description: string | null;
  organizationId: string | null;
  isActive: boolean;
  fields: TemplateField[];
  createdBy: { id: string; name: string };
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

export default function AssessmentTemplatesPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN";

  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [preselectedTemplateId, setPreselectedTemplateId] = useState<string | undefined>();

  const { data: templates, isLoading } = useQuery<AssessmentTemplate[]>({
    queryKey: ["assessment-templates", gymSlug],
    queryFn: () =>
      authApi.get<AssessmentTemplate[]>(
        `/assessment-templates?organizationSlug=${gymSlug}`
      ),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      authApi.delete(`/gyms/${gymSlug}/assessment-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment-templates", gymSlug] });
      toast.success("Template deactivated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const systemTemplates = templates?.filter((template) => template.organizationId === null) ?? [];
  const orgTemplates = templates?.filter((template) => template.organizationId !== null) ?? [];

  function handleUseTemplate(id: string) {
    setPreselectedTemplateId(id);
    setAssignOpen(true);
  }

  return (
    <div className="p-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/${gymSlug}/assessments`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Assessments
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Assessment templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the templates used to assess member progress
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create template
        </Button>
      </div>

      {/* Section A — System templates */}
      <Section title="System templates" icon={Globe} description="Built-in templates available to all gyms — read-only">
        {isLoading ? (
          <TemplateSkeletons />
        ) : systemTemplates.length === 0 ? (
          <EmptyCard message="No system templates available." />
        ) : (
          <div className="space-y-3">
            {systemTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                readOnly
                onUse={() => handleUseTemplate(template.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Section B — Org templates */}
      <Section
        title="Your templates"
        icon={ClipboardList}
        description="Templates you've created for this gym"
      >
        {isLoading ? (
          <TemplateSkeletons />
        ) : orgTemplates.length === 0 ? (
          <EmptyCard message="No custom templates yet. Create one with the button above." />
        ) : (
          <div className="space-y-3">
            {orgTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                readOnly={false}
                isAdmin={isAdmin}
                onUse={() => handleUseTemplate(template.id)}
                onDelete={() => {
                  if (confirm(`Deactivate "${template.name}"? It will no longer be available for new assignments.`)) {
                    deactivateMutation.mutate(template.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Dialogs */}
      <CreateTemplateDialog
        gymSlug={gymSlug}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <AssignAssessmentDialog
        gymSlug={gymSlug}
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setPreselectedTemplateId(undefined);
        }}
        preselectedTemplateId={preselectedTemplateId}
      />
    </div>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  readOnly,
  isAdmin,
  onUse,
  onDelete,
}: {
  template: AssessmentTemplate;
  readOnly: boolean;
  isAdmin?: boolean;
  onUse: () => void;
  onDelete?: () => void;
}): React.JSX.Element {
  const fieldCount = template.fields?.length ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">{template.name}</p>
            {readOnly && (
              <Badge variant="outline" className="text-xs text-muted-foreground">System</Badge>
            )}
            {!template.isActive && (
              <Badge variant="outline" className="text-xs text-red-500">Inactive</Badge>
            )}
          </div>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{template.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(template.fields ?? []).slice(0, 6).map((fieldItem) => (
              <span key={fieldItem.id} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                {fieldItem.label}{fieldItem.unit ? ` (${fieldItem.unit})` : ""}
              </span>
            ))}
            {fieldCount > 6 && (
              <span className="text-xs text-muted-foreground">+{fieldCount - 6} more</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={onUse}>
            Use this template <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
          {!readOnly && isAdmin && onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Deactivate template"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {!readOnly && (
            <button
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
              title="Edit template (coming soon)"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: React.ElementType;
  description: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">{description}</p>
      {children}
    </section>
  );
}

function TemplateSkeletons(): React.JSX.Element {
  return (
    <div className="space-y-3">
      {[0, 1].map((index) => <Skeleton key={index} className="h-20 rounded-xl" />)}
    </div>
  );
}

function EmptyCard({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="py-10 text-center border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
      {message}
    </div>
  );
}
