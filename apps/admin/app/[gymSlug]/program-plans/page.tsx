"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Zap, CalendarDays, BookOpen,
  CheckCircle2, Clock, XCircle, FileEdit, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/lib/use-current-user";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProgramPlan {
  id: string;
  name: string;
  description: string | null;
  totalWeeks: number;
  startDate: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  trainerId: string;
  clientId: string;
  client: { id: string; name: string; email: string; memberNumber: string | null };
  trainer: { id: string; name: string; email: string };
  _count: { entries: number };
  createdAt: string;
}

interface PagedResponse {
  data: ProgramPlan[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProgramPlan["status"], {
  label: string;
  className: string;
  Icon: React.ElementType;
}> = {
  DRAFT:     { label: "Draft",     className: "bg-muted text-muted-foreground border border-border",       Icon: FileEdit },
  ACTIVE:    { label: "Active",    className: "bg-blue-100 text-blue-700 border border-blue-200",          Icon: Zap },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700 border border-green-200",       Icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 border border-red-200",            Icon: XCircle },
};

function StatusBadge({ status }: { status: ProgramPlan["status"] }): React.JSX.Element {
  const { label, className, Icon } = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProgramPlansPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const isTrainer = currentUser?.role === "TRAINER";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [myPlansOnly, setMyPlansOnly] = useState(isTrainer);

  const { data, isLoading } = useQuery<PagedResponse>({
    queryKey: ["program-plans", gymSlug, statusFilter, myPlansOnly],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (myPlansOnly) params.set("trainerId", "me");
      return authApi.get(`/gyms/${gymSlug}/program-plans?${params}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authApi.delete(`/gyms/${gymSlug}/program-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-plans", gymSlug] });
      toast.success("Plan deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) =>
      authApi.post<{ plan: ProgramPlan; programsCreated: number }>(
        `/gyms/${gymSlug}/program-plans/${id}/activate`,
        {},
      ),
    onSuccess: ({ plan, programsCreated }) => {
      queryClient.invalidateQueries({ queryKey: ["program-plans", gymSlug] });
      toast.success(`Plan activated — ${programsCreated} programs created for ${plan.client.name}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const plans = (data?.data ?? []).filter((plan) =>
    search
      ? plan.name.toLowerCase().includes(search.toLowerCase()) ||
        plan.client.name.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const STATUS_FILTERS = ["ALL", "DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Program plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${data?.meta.total ?? 0} plan${(data?.meta.total ?? 0) !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={() => router.push(`/${gymSlug}/program-plans/new`)}>
          <Plus className="h-4 w-4 mr-2" /> New plan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Search plans or clients…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {!isTrainer && (
            <Button
              variant={myPlansOnly ? "default" : "outline"}
              size="sm"
              className="sm:self-start"
              onClick={() => setMyPlansOnly((prev) => !prev)}
            >
              {myPlansOnly ? "My plans only" : "All trainers"}
            </Button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                statusFilter === status
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {status === "ALL" ? "All" : STATUS_CONFIG[status as ProgramPlan["status"]].label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground text-sm">
          No plans found.{" "}
          <button className="underline" onClick={() => router.push(`/${gymSlug}/program-plans/new`)}>
            Create one
          </button>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {plans.map((plan) => (
              <MobileCard
                key={plan.id}
                plan={plan}
                gymSlug={gymSlug}
                currentUserId={currentUser?.id ?? ""}
                isAdmin={!isTrainer}
                onEdit={() => router.push(`/${gymSlug}/program-plans/${plan.id}/edit`)}
                onDelete={() => deleteMutation.mutate(plan.id)}
                onActivate={() => activateMutation.mutate(plan.id)}
                isPending={deleteMutation.isPending || activateMutation.isPending}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {["Plan", "Client", "Trainer", "Weeks", "Workouts", "Start date", "Status", ""].map((header) => (
                    <th key={header} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.map((plan) => (
                  <DesktopRow
                    key={plan.id}
                    plan={plan}
                    gymSlug={gymSlug}
                    currentUserId={currentUser?.id ?? ""}
                    isAdmin={!isTrainer}
                    onEdit={() => router.push(`/${gymSlug}/program-plans/${plan.id}/edit`)}
                    onDelete={() => deleteMutation.mutate(plan.id)}
                    onActivate={() => activateMutation.mutate(plan.id)}
                    isPending={deleteMutation.isPending || activateMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Shared action logic ────────────────────────────────────────────────────────

interface ActionProps {
  plan: ProgramPlan;
  gymSlug: string;
  currentUserId: string;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onActivate: () => void;
  isPending: boolean;
}

function canDelete(plan: ProgramPlan, currentUserId: string, isAdmin: boolean): boolean {
  return plan.status === "DRAFT" && (isAdmin || plan.trainerId === currentUserId);
}

function canActivate(plan: ProgramPlan, currentUserId: string, isAdmin: boolean): boolean {
  return (
    plan.status === "DRAFT" &&
    plan._count.entries > 0 &&
    (isAdmin || plan.trainerId === currentUserId)
  );
}

// ── Desktop row ───────────────────────────────────────────────────────────────

function DesktopRow({
  plan, currentUserId, isAdmin,
  onEdit, onDelete, onActivate, isPending,
}: ActionProps): React.JSX.Element {
  const startDate = new Date(plan.startDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{plan.name}</p>
        {plan.description && (
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{plan.description}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="text-foreground">{plan.client.name}</p>
        {plan.client.memberNumber && (
          <p className="text-xs text-muted-foreground font-mono">{plan.client.memberNumber}</p>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{plan.trainer.name}</td>
      <td className="px-4 py-3 text-muted-foreground">{plan.totalWeeks}w</td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          {plan._count.entries}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {startDate}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={plan.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          {canActivate(plan, currentUserId, isAdmin) && (
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isPending} onClick={onActivate}>
              <Zap className="h-3 w-3 mr-1" /> Activate
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {canDelete(plan, currentUserId, isAdmin) && (
            <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" disabled={isPending} onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────

function MobileCard({
  plan, currentUserId, isAdmin,
  onEdit, onDelete, onActivate, isPending,
}: ActionProps): React.JSX.Element {
  const startDate = new Date(plan.startDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{plan.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{plan.client.name}</p>
        </div>
        <StatusBadge status={plan.status} />
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {plan.totalWeeks} weeks
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" /> {plan._count.entries} workouts
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" /> {startDate}
        </span>
      </div>

      <div className="flex gap-2 pt-1">
        {canActivate(plan, currentUserId, isAdmin) && (
          <Button size="sm" className="flex-1 text-xs h-8" disabled={isPending} onClick={onActivate}>
            <Zap className="h-3 w-3 mr-1" /> Activate
          </Button>
        )}
        <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={onEdit}>
          <Pencil className="h-3 w-3 mr-1" /> Edit
        </Button>
        {canDelete(plan, currentUserId, isAdmin) && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
            disabled={isPending}
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
