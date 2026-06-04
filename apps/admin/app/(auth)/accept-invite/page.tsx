"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface AcceptResponse {
  access_token: string;
  refresh_token: string;
}

interface JwtPayload {
  role: string;
  gymSlug: string | null;
}

function decodeJwt(token: string): JwtPayload {
  return JSON.parse(atob(token.split(".")[1]));
}

export default function AcceptInvitePage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<AcceptResponse>("/auth/accept-invite", { token, newPassword: password }),
    onSuccess: async (res) => {
      // Store token in httpOnly cookie via session route
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: res.access_token }),
      });
      setDone(true);
      const payload = decodeJwt(res.access_token);
      const destination =
        payload.role === "SUPER_ADMIN"
          ? "/dashboard"
          : payload.gymSlug
            ? `/${payload.gymSlug}/dashboard`
            : "/dashboard";
      setTimeout(() => router.replace(destination), 1500);
    },
  });

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    setValidationError(null);
    if (password.length < 8) { setValidationError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setValidationError("Passwords don't match"); return; }
    mutation.mutate();
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Invalid invite link</h1>
          <p className="text-sm text-muted-foreground">This link is missing a token. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Account activated!</h1>
          <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <span className="text-3xl font-bold tracking-tight text-foreground">
            hone<span className="text-[#ccff00]">.</span>
          </span>
          <h1 className="mt-4 text-xl font-bold text-foreground">Activate your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a password to complete your account setup.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">New password</label>
            <Input
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Confirm password</label>
            <Input
              type="password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </div>

          {(validationError ?? mutation.error) && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {validationError ?? (mutation.error as Error).message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Activating…" : "Activate account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
