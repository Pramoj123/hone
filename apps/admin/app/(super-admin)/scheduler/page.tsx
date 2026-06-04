"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Play, RefreshCw, CheckCircle2, XCircle, Clock, CalendarClock, Timer,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobSummary {
  jobId: string | number;
  processedOn: number | null;
  finishedOn: number | null;
  returnValue: { created: number; skipped: number } | null;
  failedReason?: string;
}

interface JobsResponse {
  completed: JobSummary[];
  failed: JobSummary[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTs(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function duration(job: JobSummary): string {
  if (!job.processedOn || !job.finishedOn) return "—";
  const ms = job.finishedOn - job.processedOn;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SchedulerPage(): React.JSX.Element {
  const [triggerJobId, setTriggerJobId] = useState<string | number | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<JobsResponse>({
    queryKey: ["scheduler-jobs"],
    queryFn: () => authApi.get("/admin/scheduler/jobs"),
    refetchInterval: triggerJobId ? 2000 : false, // poll while a job is in-flight
  });

  const triggerMutation = useMutation({
    mutationFn: () =>
      authApi.post<{ jobId: string | number; message: string }>(
        "/admin/scheduler/trigger-weekly",
        {},
      ),
    onSuccess: ({ jobId }) => {
      setTriggerJobId(jobId);
      toast.success(`Job ${jobId} queued — watching for result…`);
      refetch();
      // Stop polling after 30s whether job completed or not
      setTimeout(() => setTriggerJobId(null), 30_000);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const completed = data?.completed ?? [];
  const failed = data?.failed ?? [];

  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recurring scheduler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generates next-week workout programs for all recurring assignments.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            disabled={triggerMutation.isPending}
            onClick={() => triggerMutation.mutate()}
          >
            <Play className="h-4 w-4 mr-2" />
            {triggerMutation.isPending ? "Queuing…" : "Trigger now"}
          </Button>
        </div>
      </div>

      {/* Schedule info */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Timer className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Automatic schedule</p>
            <p className="text-xs text-muted-foreground font-mono">0 23 * * 0</p>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:border-l sm:border-border sm:pl-4">
          {[
            { label: "Runs on", value: "Every Sunday" },
            { label: "Time (UTC)", value: "23:00" },
            { label: "Retry policy", value: "3× exponential (60s base)" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active job indicator */}
      {triggerJobId && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Clock className="h-4 w-4 animate-pulse" />
          Job #{triggerJobId} is processing — auto-refreshing…
        </div>
      )}

      {/* Completed jobs */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Completed jobs
          <span className="text-xs font-normal text-muted-foreground">(last 10)</span>
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : completed.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
            No completed jobs yet. Trigger one above.
          </p>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {["Job ID", "Processed at", "Duration", "Created", "Skipped"].map((header) => (
                    <th key={header} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {completed.map((job) => (
                  <tr key={job.jobId} className={`hover:bg-muted/20 transition-colors ${String(job.jobId) === String(triggerJobId) ? "bg-green-50" : ""}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">#{job.jobId}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                        {formatTs(job.processedOn)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{duration(job)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-green-700">{job.returnValue?.created ?? "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{job.returnValue?.skipped ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Failed jobs */}
      {failed.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            Failed jobs
            <span className="text-xs font-normal text-muted-foreground">(last 10)</span>
          </h2>

          <div className="border border-red-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-red-50 border-b border-red-200">
                <tr>
                  {["Job ID", "Processed at", "Reason"].map((header) => (
                    <th key={header} className="text-left px-4 py-2.5 text-xs font-medium text-red-700 uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {failed.map((job) => (
                  <tr key={job.jobId} className="hover:bg-red-50/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">#{job.jobId}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatTs(job.processedOn)}</td>
                    <td className="px-4 py-2.5 text-red-600 text-xs">{job.failedReason ?? "Unknown error"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
