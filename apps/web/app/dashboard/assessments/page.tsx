"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Star, Clock, CheckCircle2, MessageSquare, CalendarDays, ChevronRight } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TemplateField {
  id: string;
  label: string;
  type: string;
  unit?: string;
  required: boolean;
}

interface Assessment {
  id: string;
  status: "PENDING" | "SUBMITTED" | "REVIEWED";
  responses: Record<string, unknown>;
  weekNumber: number | null;
  year: number | null;
  scheduledDate: string | null;
  completedAt: string | null;
  trainerNotes: string | null;
  overallRating: number | null;
  template: { id: string; name: string; fields: TemplateField[] };
  trainer: { id: string; name: string } | null;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function StatusBadge({ status }: { status: Assessment["status"] }): React.JSX.Element {
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-900/20 text-amber-400 border border-amber-900/40">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  }
  if (status === "SUBMITTED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-900/20 text-blue-400 border border-blue-900/40">
        <CheckCircle2 className="h-3 w-3" /> Submitted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-900/20 text-green-400 border border-green-900/40">
      <CheckCircle2 className="h-3 w-3" /> Reviewed
    </span>
  );
}

function StarRow({ rating }: { rating: number | null }): React.JSX.Element | null {
  if (!rating) return null;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${index < rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "pending" | "completed";

export default function AssessmentsPage(): React.JSX.Element {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pending");

  const { data, isLoading } = useQuery<{ data: Assessment[]; meta: { total: number } }>({
    queryKey: ["me-assessments"],
    queryFn: () => authApi.get("/me/assessments?limit=100"),
    staleTime: 30_000,
  });

  const all = data?.data ?? [];
  const pending = all.filter((assessment) => assessment.status === "PENDING");
  const completed = all.filter((assessment) => assessment.status === "SUBMITTED" || assessment.status === "REVIEWED");
  const displayed = tab === "pending" ? pending : completed;

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assessments</h1>
        <p className="text-muted-foreground text-sm mt-1">Check-ins assigned by your trainer</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["pending", "completed"] as Tab[]).map((tabItem) => {
          const count = tabItem === "pending" ? pending.length : completed.length;
          return (
            <button
              key={tabItem}
              onClick={() => setTab(tabItem)}
              aria-label={tabItem === "pending" ? "Pending" : `Completed (${count})`}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                tab === tabItem
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabItem === "pending" ? "Pending" : "Completed"}
              {count > 0 && (
                <span aria-hidden="true" className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  tab === tabItem ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-3">
          {displayed.map((assessment) =>
            tab === "pending" ? (
              <PendingCard
                key={assessment.id}
                assessment={assessment}
                onClick={() => router.push(`/dashboard/assessments/${assessment.id}`)}
              />
            ) : (
              <CompletedCard
                key={assessment.id}
                assessment={assessment}
                onClick={() => router.push(`/dashboard/assessments/${assessment.id}`)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Pending card ──────────────────────────────────────────────────────────────

function PendingCard({
  assessment,
  onClick,
}: {
  assessment: Assessment;
  onClick: () => void;
}): React.JSX.Element {
  const dateLabel = assessment.scheduledDate
    ? new Date(assessment.scheduledDate).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      })
    : `Assigned ${daysAgo(assessment.createdAt)}`;

  return (
    <div className="rounded-xl border border-amber-900/30 bg-card px-5 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <StatusBadge status="PENDING" />
        </div>
        <p className="font-semibold text-foreground text-sm mt-1.5">{assessment.template.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {assessment.trainer ? `Assigned by ${assessment.trainer.name}` : "Assigned by your trainer"}
          {assessment.weekNumber && assessment.year ? ` · Week ${assessment.weekNumber}, ${assessment.year}` : ""}
        </p>
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          <span>{dateLabel}</span>
        </div>
      </div>
      <Button size="sm" onClick={onClick} className="shrink-0 self-center">
        Fill in now <ChevronRight className="h-3.5 w-3.5 ml-1" />
      </Button>
    </div>
  );
}

// ── Completed card ────────────────────────────────────────────────────────────

function CompletedCard({
  assessment,
  onClick,
}: {
  assessment: Assessment;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <StatusBadge status={assessment.status} />
          <StarRow rating={assessment.overallRating} />
        </div>
        <p className="font-semibold text-foreground text-sm mt-1.5">{assessment.template.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {assessment.trainer ? `by ${assessment.trainer.name}` : ""}
          {assessment.weekNumber && assessment.year ? ` · Week ${assessment.weekNumber}, ${assessment.year}` : ""}
        </p>
        {assessment.completedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Submitted{" "}
            {new Date(assessment.completedAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
        )}
        {assessment.status === "REVIEWED" && assessment.trainerNotes && (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
            <p className="line-clamp-2 italic">{assessment.trainerNotes}</p>
          </div>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={onClick} className="shrink-0 self-center">
        View details <ChevronRight className="h-3.5 w-3.5 ml-1" />
      </Button>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }): React.JSX.Element {
  return (
    <div className="py-16 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
      {tab === "pending"
        ? "No pending assessments — your trainer will assign these when needed."
        : "No completed assessments yet. Fill in your first one when your trainer assigns it."}
    </div>
  );
}
