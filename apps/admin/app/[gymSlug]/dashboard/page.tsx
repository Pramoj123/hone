"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Users, TrendingUp, Dumbbell, AlertTriangle } from "lucide-react";
import { authApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = 30 | 60 | 90;

interface TrainerRow {
  trainerId: string;
  trainerName: string;
  clientCount: number;
  avgComplianceRate: number;
  totalSessionsCompleted: number;
  atRiskClients: number;
}

interface TopWorkout {
  workoutId: string;
  workoutName: string;
  logCount: number;
}

type DayKey = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

interface OrgAnalytics {
  overview: {
    avgComplianceRate: number;
    totalSessions: number;
    activeClientCount: number;
    atRiskCount: number;
  };
  byTrainer: TrainerRow[];
  topWorkouts: TopWorkout[];
  activityByDay: Record<DayKey, number>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

// API returns Sun-Sat keys; we display Mon-Sun
const DOW_DISPLAY: { key: DayKey; label: string }[] = [
  { key: "MON", label: "Mon" },
  { key: "TUE", label: "Tue" },
  { key: "WED", label: "Wed" },
  { key: "THU", label: "Thu" },
  { key: "FRI", label: "Fri" },
  { key: "SAT", label: "Sat" },
  { key: "SUN", label: "Sun" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function complianceClass(rate: number): string {
  if (rate >= 80) return "text-green-600 font-semibold";
  if (rate >= 50) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

export default function GymDashboard({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);
  const [period, setPeriod] = useState<Period>(30);

  const { data, isLoading } = useQuery<OrgAnalytics>({
    queryKey: ["org-analytics", gymSlug, period],
    queryFn: () =>
      authApi.get<OrgAnalytics>(`/gyms/${gymSlug}/analytics/compliance?period=${period}`),
    staleTime: 3 * 60_000,
  });

  const sortedTrainers = [...(data?.byTrainer ?? [])].sort(
    (a, b) => b.avgComplianceRate - a.avgComplianceRate,
  );

  const atRiskTrainers = sortedTrainers.filter((t) => t.atRiskClients > 0);

  const dowCounts = DOW_DISPLAY.map(({ key }) => data?.activityByDay[key] ?? 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl space-y-8">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview for <span className="font-medium text-foreground">{gymSlug}</span>
          </p>
        </div>

        {/* Period toggle */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {([30, 60, 90] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 1: KPI cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          label="Active members"
          value={data?.overview.activeClientCount}
          isLoading={isLoading}
          hint={`≥1 session in last ${period}d`}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          label={`Avg compliance (${period}d)`}
          value={data?.overview.avgComplianceRate}
          suffix="%"
          isLoading={isLoading}
          colorClass={
            data
              ? data.overview.avgComplianceRate >= 80
                ? "text-green-600"
                : data.overview.avgComplianceRate >= 50
                ? "text-amber-600"
                : "text-red-600"
              : undefined
          }
        />
        <KpiCard
          icon={<Dumbbell className="h-4 w-4 text-muted-foreground" />}
          label={`Sessions (${period}d)`}
          value={data?.overview.totalSessions}
          isLoading={isLoading}
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
          label="At risk (14d)"
          value={data?.overview.atRiskCount}
          isLoading={isLoading}
          hint="0 sessions in last 14 days"
          colorClass={
            data && data.overview.atRiskCount > 0 ? "text-red-600" : undefined
          }
        />
      </div>

      {/* ── Row 2: Charts ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Left 3/5: Activity by day of week — vertical bars */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Activity by day of week</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 rounded-lg" />
            ) : (
              <div style={{ height: 210 }}>
                <Bar
                  data={{
                    labels: DOW_DISPLAY.map((d) => d.label),
                    datasets: [
                      {
                        data: dowCounts,
                        backgroundColor: "#534AB7",
                        borderRadius: 5,
                        barThickness: 36,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => ` ${ctx.parsed.y} sessions`,
                        },
                      },
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { font: { size: 12 } } },
                      y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { size: 11 } },
                        grid: { color: "#f0f0f0" },
                      },
                    },
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 2/5: When members train — horizontal bars */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">When your members train</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 rounded-lg" />
            ) : (
              <div style={{ height: 210 }}>
                <Bar
                  data={{
                    labels: DOW_DISPLAY.map((d) => d.label),
                    datasets: [
                      {
                        data: dowCounts,
                        backgroundColor: "#1D9E75",
                        borderRadius: 4,
                        barThickness: 16,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => ` ${ctx.parsed.x} sessions`,
                        },
                      },
                    },
                    scales: {
                      x: {
                        beginAtZero: true,
                        ticks: { font: { size: 11 }, stepSize: 1 },
                        grid: { color: "#f0f0f0" },
                      },
                      y: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } },
                      },
                    },
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Tables ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Trainer compliance leaderboard */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Trainer compliance leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 rounded" />)}
              </div>
            ) : sortedTrainers.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No trainer data for this period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trainer</TableHead>
                    <TableHead className="text-right">Clients</TableHead>
                    <TableHead className="text-right">Compliance</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTrainers.map((trainer, idx) => (
                    <TableRow key={trainer.trainerId}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4 shrink-0">
                            {idx + 1}
                          </span>
                          {trainer.trainerName}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {trainer.clientCount}
                      </TableCell>
                      <TableCell className={`text-right ${complianceClass(trainer.avgComplianceRate)}`}>
                        {trainer.avgComplianceRate}%
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {trainer.totalSessionsCompleted}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* At-risk clients — grouped by trainer since the endpoint returns counts not individuals */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">At-risk clients</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 rounded" />)}
              </div>
            ) : atRiskTrainers.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-green-100 mb-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm font-medium text-green-700">All clients are active</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No members with 0 sessions in the last 14 days.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trainer</TableHead>
                    <TableHead className="text-right">At risk</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRiskTrainers.map((trainer) => (
                    <TableRow key={trainer.trainerId}>
                      <TableCell className="font-medium">{trainer.trainerName}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center justify-end gap-1 text-red-600 font-semibold text-sm">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {trainer.atRiskClients}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                          <Link href={`/${gymSlug}/members`}>
                            View clients
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Top workouts ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Top workouts — last {period} days
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (data?.topWorkouts ?? []).length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            No workout sessions logged in this period yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(data?.topWorkouts ?? []).map((workout, idx) => (
              <TopWorkoutCard key={workout.workoutId} workout={workout} rank={idx + 1} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  suffix = "",
  hint,
  isLoading,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  suffix?: string;
  hint?: string;
  isLoading: boolean;
  colorClass?: string;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="pt-1">
        {isLoading ? (
          <Skeleton className="h-9 w-20 mt-1" />
        ) : (
          <>
            <p className={`text-3xl font-bold ${colorClass ?? "text-foreground"}`}>
              {value ?? 0}{suffix}
            </p>
            {hint && (
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{hint}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Top workout card ──────────────────────────────────────────────────────────

const RANK_COLORS = [
  "bg-yellow-50 border-yellow-200",
  "bg-zinc-50 border-zinc-200",
  "bg-orange-50 border-orange-200",
  "bg-muted/40 border-border",
  "bg-muted/40 border-border",
];

function guessWorkoutEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("run") || n.includes("cardio") || n.includes("cycling")) return "🏃";
  if (n.includes("hiit") || n.includes("circuit")) return "⚡";
  if (n.includes("core") || n.includes("abs") || n.includes("plank")) return "🎯";
  if (n.includes("stretch") || n.includes("yoga") || n.includes("flex")) return "🧘";
  if (n.includes("mobility")) return "🔄";
  return "🏋️";
}

function TopWorkoutCard({
  workout,
  rank,
}: {
  workout: TopWorkout;
  rank: number;
}): React.JSX.Element {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${RANK_COLORS[rank - 1] ?? RANK_COLORS[4]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xl">{guessWorkoutEmoji(workout.workoutName)}</span>
        <span className="text-xs font-bold text-muted-foreground">#{rank}</span>
      </div>
      <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
        {workout.workoutName}
      </p>
      <p className="text-xs text-muted-foreground">
        {workout.logCount} session{workout.logCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
