"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Eye, Settings2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { AssignAssessmentDialog } from "@/components/assign-assessment-dialog";
import {
  AssessmentReviewDialog,
  type Assessment,
} from "@/components/assessment-review-dialog";
import { useCurrentUser } from "@/lib/use-current-user";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PagedResponse {
  data: Assessment[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface Member {
  id: string;
  name: string;
  email: string;
}

interface AssessmentTemplate {
  id: string;
  name: string;
  organizationId: string | null;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING:   { label: "Pending",   cls: "bg-amber-100 text-amber-700 border-amber-200" },
  SUBMITTED: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  REVIEWED:  { label: "Reviewed",  cls: "bg-green-100 text-green-700 border-green-200" },
} as const;

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

export default function AssessmentsPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN";

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [templateFilter, setTemplateFilter] = useState<string>("");
  const [memberSearch, setMemberSearch] = useState<string>("");

  // Dialog state
  const [assignOpen, setAssignOpen] = useState(false);
  const [reviewAssessment, setReviewAssessment] = useState<Assessment | null>(null);

  // Data
  const { data: pagedData, isLoading } = useQuery<PagedResponse>({
    queryKey: ["assessments", gymSlug, statusFilter, clientFilter, templateFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter) params.set("status", statusFilter);
      if (clientFilter) params.set("clientId", clientFilter);
      if (templateFilter) params.set("templateId", templateFilter);
      return authApi.get<PagedResponse>(`/gyms/${gymSlug}/assessments?${params}`);
    },
    staleTime: 15_000,
  });

  const { data: members } = useQuery<Member[]>({
    queryKey: ["members", gymSlug],
    queryFn: () => authApi.get<Member[]>(`/gyms/${gymSlug}/members`),
  });

  const { data: templates } = useQuery<AssessmentTemplate[]>({
    queryKey: ["assessment-templates", gymSlug],
    queryFn: () =>
      authApi.get<AssessmentTemplate[]>(`/assessment-templates?organizationSlug=${gymSlug}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      authApi.delete(`/gyms/${gymSlug}/assessments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments", gymSlug] });
      toast.success("Assessment deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const assessments = pagedData?.data ?? [];
  const total = pagedData?.meta.total ?? 0;

  const filteredMembers = (members ?? []).filter(
    (member) =>
      !memberSearch ||
      member.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      member.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // ── Table columns ──────────────────────────────────────────────────────────

  const columns: Column<Assessment>[] = [
    {
      key: "client",
      header: "Client",
      cell: (row) => (
        <div>
          <p className="font-medium text-foreground text-sm">{row.client.name}</p>
          <p className="text-xs text-muted-foreground">{row.client.email}</p>
        </div>
      ),
    },
    {
      key: "template",
      header: "Template",
      cell: (row) => (
        <span className="text-sm text-foreground">{row.template.name}</span>
      ),
    },
    {
      key: "scheduled",
      header: "Scheduled",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.weekNumber && row.year
            ? `Wk ${row.weekNumber}/${row.year}`
            : row.scheduledDate
            ? new Date(row.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            : <span className="italic">—</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const cfg = STATUS_CONFIG[row.status];
        return (
          <Badge className={`${cfg.cls} border text-xs`}>{cfg.label}</Badge>
        );
      },
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.completedAt
            ? new Date(row.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            : <span className="italic">Awaiting</span>}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => setReviewAssessment(row)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> View
          </Button>
          {isAdmin && (
            <button
              onClick={() => {
                if (confirm("Delete this assessment permanently?")) {
                  deleteMutation.mutate(row.id);
                }
              }}
              className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
      headerClassName: "text-right",
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assessments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${total} assessment${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href={`/${gymSlug}/assessments/templates`}>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-1.5" /> Templates
            </Button>
          </Link>
          <Button onClick={() => setAssignOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Assign assessment
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground w-full sm:w-auto sm:min-w-[140px]"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="REVIEWED">Reviewed</option>
        </select>

        {/* Template filter */}
        <select
          value={templateFilter}
          onChange={(event) => setTemplateFilter(event.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground w-full sm:w-auto sm:min-w-[180px]"
        >
          <option value="">All templates</option>
          {(templates ?? []).map((template) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>

        {/* Client filter */}
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search client…"
            value={memberSearch}
            onChange={(event) => {
              setMemberSearch(event.target.value);
              if (!event.target.value) setClientFilter("");
            }}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground w-full sm:w-44"
          />
          {memberSearch && filteredMembers.length > 0 && (
            <select
              size={1}
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground w-full sm:w-auto sm:min-w-[180px]"
            >
              <option value="">All clients</option>
              {filteredMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Clear filters */}
        {(statusFilter || clientFilter || templateFilter) && (
          <button
            className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground underline transition-colors"
            onClick={() => {
              setStatusFilter("");
              setClientFilter("");
              setTemplateFilter("");
              setMemberSearch("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={assessments}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No assessments found. Assign one using the button above."
        onRowClick={(row) => setReviewAssessment(row)}
        mobileCard={(row) => {
          const cfg = STATUS_CONFIG[row.status];
          return (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground text-sm truncate">{row.client.name}</p>
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cls} shrink-0`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{row.template.name}</p>
              <p className="text-xs text-muted-foreground">
                {row.completedAt
                  ? `Submitted ${new Date(row.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                  : "Awaiting submission"}
              </p>
            </div>
          );
        }}
      />

      {/* Dialogs */}
      <AssignAssessmentDialog
        gymSlug={gymSlug}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />
      <AssessmentReviewDialog
        gymSlug={gymSlug}
        assessment={reviewAssessment}
        open={!!reviewAssessment}
        onOpenChange={(open) => { if (!open) setReviewAssessment(null); }}
      />
    </div>
  );
}
