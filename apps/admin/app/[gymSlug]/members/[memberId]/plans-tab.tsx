"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Zap, CalendarDays, BookOpen,
  CheckCircle2, Clock, XCircle, FileEdit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
  trainer: { id: string; name: string };
  _count: { entries: number };
  createdAt: string;
}

interface PagedResponse {
  data: ProgramPlan[];
  meta: { total: number };
}

interface PlansTabProps {
  gymSlug: string;
  memberId: string;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProgramPlan["status"], {
  label: string; className: string; Icon: React.ElementType;
}> = {
  DRAFT:     { label: "Draft",     className: "bg-muted text-muted-foreground border border-border",         Icon: FileEdit },
  ACTIVE:    { label: "Active",    className: "bg-blue-100 text-blue-700 border border-blue-200",            Icon: Zap },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700 border border-green-200",         Icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 border border-red-200",              Icon: XCircle },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PlansTab({ gymSlug, memberId }: PlansTabProps): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const { data, isLoading } = useQuery<PagedResponse>({
    queryKey: ["member-plans", gymSlug, memberId],
    queryFn: () =>
      authApi.get(`/gyms/${gymSlug}/program-plans?clientId=${memberId}&limit=50`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authApi.delete(`/gyms/${gymSlug}/program-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-plans", gymSlug, memberId] });
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
    onSuccess: ({ programsCreated }) => {
      queryClient.invalidateQueries({ queryKey: ["member-plans", gymSlug, memberId] });
      toast.success(`Plan activated — ${programsCreated} programs created`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const plans = data?.data ?? [];
  const isAdmin = currentUser?.role === "ORG_ADMIN" || currentUser?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-4 pt-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading…" : `${data?.meta.total ?? 0} program plan${(data?.meta.total ?? 0) !== 1 ? "s" : ""}`}
        </p>
        <Button
          size="sm"
          onClick={() => router.push(`/${gymSlug}/program-plans/new?clientId=${memberId}`)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Create plan
        </Button>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="py-14 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
          No program plans yet.{" "}
          <button
            className="underline text-foreground"
            onClick={() => router.push(`/${gymSlug}/program-plans/new?clientId=${memberId}`)}
          >
            Create one for this client
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => {
            const { label, className, Icon } = STATUS_CONFIG[plan.status];
            const startDate = new Date(plan.startDate).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            });
            const isDraft = plan.status === "DRAFT";
            const canEdit = isAdmin || plan.trainerId === currentUser?.id;
            const canActivate = isDraft && plan._count.entries > 0 && canEdit;
            const canDelete = isDraft && canEdit;

            return (
              <div
                key={plan.id}
                className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{plan.name}</p>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                      className,
                    )}>
                      <Icon className="h-3 w-3" /> {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {plan.totalWeeks}w
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {plan._count.entries} workouts
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> {startDate}
                    </span>
                    <span className="text-muted-foreground/70">by {plan.trainer.name}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {canActivate && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      disabled={activateMutation.isPending}
                      onClick={() => activateMutation.mutate(plan.id)}
                    >
                      <Zap className="h-3 w-3 mr-1" /> Activate
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => router.push(`/${gymSlug}/program-plans/${plan.id}/edit`)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(plan.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
