"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function SuccessScreen(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["me"] });
    queryClient.invalidateQueries({ queryKey: ["me-profile"] });
    const t = setTimeout(() => router.push("/dashboard"), 2500);
    return () => clearTimeout(t);
  }, [router, queryClient]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Email verified!</h1>
        <p className="text-sm text-muted-foreground">
          Your email address has been confirmed. Redirecting you to the dashboard…
        </p>
        <Link
          href="/dashboard"
          className="inline-block text-sm bg-primary text-primary-foreground font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

export function ErrorScreen({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Verification failed</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link
          href="/dashboard"
          className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
