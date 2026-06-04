"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage(): React.JSX.Element {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post("/auth/forgot-password", { email }),
    onSuccess: () => setSent(true),
    onError: (err: Error) => setError(err.message),
  });

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            If <span className="text-foreground font-medium">{email}</span> is registered,
            you'll receive a reset link shortly. The link expires in 1 hour.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn't get it?{" "}
            <button
              className="underline text-foreground"
              onClick={() => { setSent(false); }}
            >
              Try again
            </button>
          </p>
          <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <span className="text-3xl font-bold tracking-tight">
            hone<span className="text-brand">.</span>
          </span>
          <h1 className="mt-4 text-xl font-bold text-foreground">Forgot your password?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form
          onSubmit={(event) => { event.preventDefault(); setError(null); mutation.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={mutation.isPending || !email}>
            {mutation.isPending ? "Sending…" : "Send reset link"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Remember it?{" "}
          <Link href="/login" className="text-brand hover:underline font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
