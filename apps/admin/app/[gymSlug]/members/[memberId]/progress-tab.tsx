"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import { toast } from "sonner";
import { Loader2, ExternalLink, StickyNote, ChevronDown, ChevronUp } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignProgramDialog } from "@/components/assign-program-dialog";
import { AssignAssessmentDialog } from "@/components/assign-assessment-dialog";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler,
);

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = "last30" | "last60" | "last90";
type MetricRange = "1M" | "3M" | "6M" | "All";

interface CompliancePeriod {
  total: number;
  completed: number;
  missed: number;
  complianceRate: number;
}

interface BodyMetrics {
  dates: string[];
  weight: (number | null)[];
  bodyFat: (number | null)[];
  waist: (number | null)[];
  chest: (number | null)[];
  hips: (number | null)[];
}

interface WeeklyVolume {
  week: string;
  weekStart: string;
  totalVolume: number;
  sessionCount: number;
}

interface PR {
  workoutId: string;
  workoutName: string;
  maxWeightKg: number;
  repsAtMaxWeight: number;
  estimated1RM: number;
  achievedAt: string;
}

interface MemberProgress {
  compliance: Record<Period, CompliancePeriod>;
  bodyMetrics: BodyMetrics;
  workoutVolume: WeeklyVolume[];
  prs: PR[];
  sessionRpe: {
    dates: string[];
    rpeValues: (number | null)[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function computeDayOfWeek(isoDates: string[]): number[] {
  const counts = new Array(7).fill(0);
  for (const iso of isoDates) {
    // JS getDay: 0=Sun, convert to Mon=0..Sun=6
    const d = new Date(iso).getDay();
    counts[d === 0 ? 6 : d - 1]++;
  }
  return counts;
}

function filterMetricsByRange(metrics: BodyMetrics, range: MetricRange): BodyMetrics {
  if (range === "All") return metrics;
  const months = range === "1M" ? 1 : range === "3M" ? 3 : 6;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const indices = metrics.dates
    .map((d, i) => ({ t: new Date(d), i }))
    .filter(({ t }) => t >= cutoff)
    .map(({ i }) => i);
  return {
    dates: indices.map((i) => metrics.dates[i]),
    weight: indices.map((i) => metrics.weight[i]),
    bodyFat: indices.map((i) => metrics.bodyFat[i]),
    waist: indices.map((i) => metrics.waist[i]),
    chest: indices.map((i) => metrics.chest[i]),
    hips: indices.map((i) => metrics.hips[i]),
  };
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "2-digit",
  });
}

function fmtLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function complianceColorClass(rate: number): string {
  if (rate >= 80) return "text-green-600";
  if (rate >= 50) return "text-amber-600";
  return "text-red-600";
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  gymSlug: string;
  memberId: string;
  memberName: string;
}

export function ProgressTab({ gymSlug, memberId, memberName }: Props): React.JSX.Element {
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState<Period>("last30");
  const [metricRange, setMetricRange] = useState<MetricRange>("3M");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState("");
  const [assignProgramOpen, setAssignProgramOpen] = useState(false);
  const [assignAssessmentOpen, setAssignAssessmentOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [missedExpanded, setMissedExpanded] = useState(false);

  const { data, isLoading, error } = useQuery<MemberProgress>({
    queryKey: ["member-progress", gymSlug, memberId],
    queryFn: () => authApi.get<MemberProgress>(`/gyms/${gymSlug}/members/${memberId}/progress`),
    staleTime: 5 * 60_000,
  });

  const noteMutation = useMutation({
    mutationFn: (notes: string) =>
      authApi.patch(`/gyms/${gymSlug}/members/${memberId}`, { healthNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", gymSlug, memberId] });
      toast.success("Note saved");
      setNoteOpen(false);
      setNoteText("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <ProgressSkeleton />;
  if (error || !data) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm">
        Failed to load progress data.
      </div>
    );
  }

  const cp = data.compliance[period];
  const pending = Math.max(0, cp.total - cp.completed - cp.missed);
  const dowCounts = computeDayOfWeek(data.sessionRpe.dates);
  const filteredMetrics = filterMetricsByRange(data.bodyMetrics, metricRange);
  const hasMeasurements =
    filteredMetrics.waist.some((v) => v != null) ||
    filteredMetrics.chest.some((v) => v != null) ||
    filteredMetrics.hips.some((v) => v != null);
  const sortedPrs = [...data.prs].sort((a, b) => b.maxWeightKg - a.maxWeightKg);

  return (
    <div className="space-y-8">

      {/* ── Section D: Quick actions (pinned top) ─────────────────────────── */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setAssignProgramOpen(true)}
        >
          Assign program
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setAssignAssessmentOpen(true)}
        >
          Create assessment
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setNoteOpen((v) => !v)}
        >
          <StickyNote className="h-3.5 w-3.5" />
          Add note
          {noteOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {noteOpen && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Trainer note</p>
          <textarea
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a private note about this member…"
            className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setNoteOpen(false); setNoteText(""); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!noteText.trim() || noteMutation.isPending}
              onClick={() => noteMutation.mutate(noteText.trim())}
            >
              {noteMutation.isPending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</>
                : "Save note"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Section A: Compliance ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Compliance
          </h3>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(["last30", "last60", "last90"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "last30" ? "30d" : p === "last60" ? "60d" : "90d"}
              </button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <p className={`text-3xl font-bold ${complianceColorClass(cp.complianceRate)}`}>
                {cp.complianceRate}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Compliance rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <p className="text-3xl font-bold text-foreground">{cp.completed}</p>
              <p className="mt-1 text-xs text-muted-foreground">Sessions completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <button
                className="w-full"
                onClick={() => cp.missed > 0 && setMissedExpanded((v) => !v)}
              >
                <p className="text-3xl font-bold text-foreground">{cp.missed}</p>
                <p className="mt-1 text-xs text-muted-foreground flex items-center justify-center gap-1">
                  Sessions missed
                  {cp.missed > 0 && (
                    missedExpanded
                      ? <ChevronUp className="h-3 w-3" />
                      : <ChevronDown className="h-3 w-3" />
                  )}
                </p>
              </button>
              {missedExpanded && (
                <p className="mt-2 text-xs text-muted-foreground text-left px-1">
                  {cp.missed} past-due session{cp.missed !== 1 ? "s" : ""} with no log recorded
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Donut: session breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Session breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pt-2">
              <div style={{ width: 180, height: 180 }}>
                <Doughnut
                  data={{
                    labels: ["Completed", "Missed", "Pending"],
                    datasets: [
                      {
                        data: [cp.completed, cp.missed, pending],
                        backgroundColor: ["#1D9E75", "#E24B4A", "#888780"],
                        borderWidth: 0,
                        hoverOffset: 4,
                      },
                    ],
                  }}
                  options={{
                    cutout: "65%",
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => ` ${ctx.parsed} sessions`,
                        },
                      },
                    },
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-4 justify-center text-xs">
                {[
                  { label: "Completed", color: "#1D9E75", count: cp.completed },
                  { label: "Missed", color: "#E24B4A", count: cp.missed },
                  { label: "Pending", color: "#888780", count: pending },
                ].map(({ label, color, count }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bar: best training days */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Best training days</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Bar
                data={{
                  labels: DOW_LABELS,
                  datasets: [
                    {
                      data: dowCounts,
                      backgroundColor: "#7F77DD",
                      borderRadius: 4,
                      barThickness: 28,
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1, font: { size: 11 } },
                      grid: { color: "#f0f0f0" },
                    },
                  },
                  maintainAspectRatio: true,
                }}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Section B: Body metric trends ─────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Body metric trends
          </h3>
          {data.bodyMetrics.dates.length >= 2 && (
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {(["1M", "3M", "6M", "All"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setMetricRange(r)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    metricRange === r
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {data.bodyMetrics.dates.length < 2 ? (
          <div className="rounded-xl border-2 border-dashed border-border py-14 text-center text-sm text-muted-foreground">
            No assessment data yet — assign a weekly check-in to start tracking
          </div>
        ) : (
          <div className="space-y-4">
            {/* Weight & body fat */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Weight & body fat</CardTitle>
              </CardHeader>
              <CardContent>
                <Line
                  data={{
                    labels: filteredMetrics.dates.map(fmtDate),
                    datasets: [
                      {
                        label: "Weight (kg)",
                        data: filteredMetrics.weight,
                        borderColor: "#1D9E75",
                        backgroundColor: "transparent",
                        tension: 0.4,
                        pointRadius: 3,
                        yAxisID: "yLeft",
                      },
                      {
                        label: "Body fat (%)",
                        data: filteredMetrics.bodyFat,
                        borderColor: "#D85A30",
                        backgroundColor: "transparent",
                        borderDash: [5, 4],
                        tension: 0.4,
                        pointRadius: 3,
                        yAxisID: "yRight",
                      },
                    ],
                  }}
                  options={{
                    plugins: {
                      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                      yLeft: {
                        type: "linear",
                        position: "left",
                        ticks: { font: { size: 11 } },
                        title: { display: true, text: "kg", font: { size: 10 } },
                        grid: { color: "#f0f0f0" },
                      },
                      yRight: {
                        type: "linear",
                        position: "right",
                        ticks: { font: { size: 11 } },
                        title: { display: true, text: "%", font: { size: 10 } },
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>

            {/* Measurements — only if data exists */}
            {hasMeasurements && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Measurements</CardTitle>
                </CardHeader>
                <CardContent>
                  <Line
                    data={{
                      labels: filteredMetrics.dates.map(fmtDate),
                      datasets: [
                        {
                          label: "Waist (cm)",
                          data: filteredMetrics.waist,
                          borderColor: "#7F77DD",
                          backgroundColor: "transparent",
                          tension: 0.4,
                          pointRadius: 3,
                        },
                        {
                          label: "Chest (cm)",
                          data: filteredMetrics.chest,
                          borderColor: "#378ADD",
                          backgroundColor: "transparent",
                          tension: 0.4,
                          pointRadius: 3,
                        },
                        {
                          label: "Hips (cm)",
                          data: filteredMetrics.hips,
                          borderColor: "#D4537E",
                          backgroundColor: "transparent",
                          tension: 0.4,
                          pointRadius: 3,
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                        y: { ticks: { font: { size: 11 } }, grid: { color: "#f0f0f0" } },
                      },
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </section>

      {/* ── Section C: Workout performance ───────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Workout performance
        </h3>

        {/* Exercise select */}
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">Exercise</label>
          <select
            className="flex h-10 w-full max-w-sm rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedWorkoutId}
            onChange={(e) => setSelectedWorkoutId(e.target.value)}
          >
            <option value="">Select exercise…</option>
            {sortedPrs.map((pr) => (
              <option key={pr.workoutId} value={pr.workoutId}>
                {pr.workoutName}
              </option>
            ))}
          </select>
        </div>

        {/* Volume line chart — shown when exercise is selected */}
        {selectedWorkoutId && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Volume over time —{" "}
                {data.prs.find((p) => p.workoutId === selectedWorkoutId)?.workoutName ?? ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Line
                data={{
                  labels: data.workoutVolume.map((v) => v.week),
                  datasets: [
                    {
                      label: "Total volume (kg)",
                      data: data.workoutVolume.map((v) => v.totalVolume),
                      borderColor: "#1D9E75",
                      backgroundColor: "rgba(29,158,117,0.08)",
                      fill: true,
                      tension: 0.4,
                      pointRadius: 3,
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { display: false } },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { font: { size: 10 }, maxRotation: 40 },
                    },
                    y: {
                      beginAtZero: true,
                      ticks: { font: { size: 11 } },
                      grid: { color: "#f0f0f0" },
                    },
                  },
                }}
              />
              <p className="mt-2 text-[10px] text-muted-foreground">
                Showing weekly total volume across all exercises.
              </p>
            </CardContent>
          </Card>
        )}

        {/* PRs table */}
        {sortedPrs.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border py-14 text-center text-sm text-muted-foreground">
            No personal records logged yet
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">All-time PRs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-5 py-2.5 text-left font-medium">Exercise</th>
                      <th className="px-4 py-2.5 text-right font-medium">Max weight</th>
                      <th className="px-4 py-2.5 text-right font-medium">Reps</th>
                      <th className="px-4 py-2.5 text-right font-medium">Est. 1RM</th>
                      <th className="px-5 py-2.5 text-right font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPrs.map((pr) => (
                      <tr
                        key={pr.workoutId}
                        className="border-b border-border/50 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-5 py-2.5 font-medium text-foreground">{pr.workoutName}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground">
                          {pr.maxWeightKg} kg
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {pr.repsAtMaxWeight}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground">
                          {pr.estimated1RM} kg
                        </td>
                        <td className="px-5 py-2.5 text-right text-muted-foreground">
                          {fmtLong(pr.achievedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      <AssignProgramDialog
        open={assignProgramOpen}
        onClose={() => setAssignProgramOpen(false)}
        gymSlug={gymSlug}
        client={{ id: memberId, name: memberName }}
      />
      <AssignAssessmentDialog
        gymSlug={gymSlug}
        open={assignAssessmentOpen}
        onOpenChange={setAssignAssessmentOpen}
      />
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProgressSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <Skeleton className="h-14 rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
