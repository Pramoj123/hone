"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, UserPlus } from "lucide-react";

interface MembershipRequest {
  id: string;
  status: "PENDING" | "ACTIVE" | "ENDED";
  requestNote: string | null;
  memberNumber: string | null;
  joinedAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  createdAt: string;
  organization: { id: string; name: string; slug: string };
  branch: { id: string; name: string } | null;
  decidedBy: { id: string; name: string } | null;
  user: {
    id: string;
    name: string;
    email: string;
    photoUrl: string | null;
    phone: string | null;
    createdAt: string;
  };
}

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
}

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

const approveSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  memberNumber: z.string().optional().or(z.literal("")),
});
type ApproveForm = z.infer<typeof approveSchema>;

export default function JoinRequestsPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"PENDING" | "ENDED">("PENDING");
  const [approveTarget, setApproveTarget] = useState<MembershipRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<MembershipRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useQuery<{ data: MembershipRequest[]; meta: { total: number } }>({
    queryKey: ["join-requests", gymSlug, tab],
    queryFn: () => authApi.get(`/gyms/${gymSlug}/membership-requests?status=${tab}&limit=50`),
    staleTime: 30_000,
  });

  const { data: branchesData } = useQuery<Branch[]>({
    queryKey: ["branches", gymSlug],
    queryFn: () => authApi.get(`/gyms/${gymSlug}/branches`),
    staleTime: 300_000,
  });

  const branches = branchesData ?? [];

  const approveForm = useForm<ApproveForm>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      branchId: branches.find((b) => b.isDefault)?.id ?? "",
      memberNumber: "",
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveForm }) =>
      authApi.post(`/gyms/${gymSlug}/membership-requests/${id}/approve`, {
        branchId: data.branchId,
        memberNumber: data.memberNumber || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests", gymSlug] });
      setApproveTarget(null);
      approveForm.reset();
      toast.success("Membership approved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      authApi.post(`/gyms/${gymSlug}/membership-requests/${id}/reject`, {
        reason: rejectReason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests", gymSlug] });
      setRejectTarget(null);
      setRejectReason("");
      toast.success("Membership request rejected");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const requests = data?.data ?? [];

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Join requests</h1>
          <p className="text-sm text-muted-foreground">Manage membership requests for your gym</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["PENDING", "ENDED"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "PENDING" ? "Pending" : "History"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
          {tab === "PENDING" ? "No pending join requests." : "No membership history yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold uppercase overflow-hidden">
                {req.user.photoUrl
                  ? <img src={req.user.photoUrl} alt="" className="h-full w-full object-cover" />
                  : req.user.name.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground text-sm">{req.user.name}</p>
                  <StatusChip req={req} />
                </div>
                <p className="text-xs text-muted-foreground">{req.user.email}</p>
                {req.requestNote && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{req.requestNote}"</p>
                )}
                {req.branch && (
                  <p className="text-xs text-muted-foreground mt-0.5">Branch: {req.branch.name}</p>
                )}
                {req.endReason && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reason: {req.endReason}
                    {req.decidedBy ? ` · by ${req.decidedBy.name}` : ""}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground shrink-0">
                {new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </p>
              {tab === "PENDING" && (
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => { setApproveTarget(req); approveForm.setValue("branchId", branches.find((b) => b.isDefault)?.id ?? ""); }}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => setRejectTarget(req)}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => { if (!open) { setApproveTarget(null); approveForm.reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {approveTarget?.user.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={approveForm.handleSubmit((data) => approveMutation.mutate({ id: approveTarget!.id, data }))}
            className="space-y-4"
          >
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Assign to branch</label>
              <select
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                {...approveForm.register("branchId")}
              >
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}{b.isDefault ? " (default)" : ""}</option>
                ))}
              </select>
              {approveForm.formState.errors.branchId && (
                <p className="text-xs text-destructive mt-1">{approveForm.formState.errors.branchId.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Member number (optional — auto-generated if empty)</label>
              <Input placeholder="e.g. MEM-001" {...approveForm.register("memberNumber")} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setApproveTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={approveMutation.isPending}>
                {approveMutation.isPending ? "Approving…" : "Approve"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject request from {rejectTarget?.user.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Reason (optional)</label>
              <Input
                placeholder="Reason for rejection…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: rejectTarget!.id })}
              >
                {rejectMutation.isPending ? "Rejecting…" : "Reject"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusChip({ req }: { req: MembershipRequest }): React.JSX.Element {
  if (req.status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-yellow-100 text-yellow-700 border-yellow-200">
        <Clock className="h-3 w-3" />Pending
      </span>
    );
  }
  if (req.endReason === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200">
        <XCircle className="h-3 w-3" />Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
      {req.endReason ?? "Ended"}
    </span>
  );
}
