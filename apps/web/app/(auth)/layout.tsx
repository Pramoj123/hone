import { Suspense } from "react";
import { Loader2 } from "lucide-react";

/**
 * Suspense boundary for all auth pages.
 *
 * Next.js 16 requires that any component calling useSearchParams() is
 * wrapped in <Suspense>. Placing it here means every page under (auth)
 * — login, verify-email, reset-password, accept-invite — is covered
 * automatically without per-page Inner/Page component splits.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
