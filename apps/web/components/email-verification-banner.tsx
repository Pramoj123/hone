"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MailCheck, X } from "lucide-react";
import { authApi } from "@/lib/api";

interface Me {
  emailVerifiedAt: string | null;
}

export function EmailVerificationBanner(): React.JSX.Element | null {
  const [dismissed, setDismissed] = useState(false);

  const { data: me } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: () => authApi.get<Me>("/auth/me"),
    // Always refetch on mount so the banner disappears immediately after the
    // user clicks the verification link and returns to the dashboard.
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const resendMutation = useMutation({
    mutationFn: () => authApi.post("/auth/resend-verification", {}),
    onSuccess: () => toast.success("Verification email sent — check your inbox"),
    onError: (error: Error) => toast.error(error.message),
  });

  // Show only when email is unverified and not dismissed
  if (dismissed || me === undefined || me?.emailVerifiedAt) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-950/30 border-b border-amber-900/40 text-sm">
      <MailCheck className="h-4 w-4 text-amber-400 shrink-0" />
      <p className="flex-1 text-amber-300">
        Please verify your email address to ensure you receive important notifications.
      </p>
      <button
        onClick={() => resendMutation.mutate()}
        disabled={resendMutation.isPending || resendMutation.isSuccess}
        className="text-amber-400 underline text-xs shrink-0 hover:text-amber-300 disabled:opacity-50"
      >
        {resendMutation.isPending ? "Sending…" : resendMutation.isSuccess ? "Sent!" : "Resend email"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-600 hover:text-amber-400 transition-colors shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
