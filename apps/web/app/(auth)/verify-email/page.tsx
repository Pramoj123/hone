import { SuccessScreen, ErrorScreen } from "./_screens";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorScreen message="No verification token found in this link." />;
  }

  let errorMessage: string | null = null;

  try {
    const res = await fetch(
      `${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      errorMessage = body.message ?? "Verification failed.";
    }
  } catch {
    errorMessage = "Could not reach the server. Please try again.";
  }

  if (errorMessage) {
    return <ErrorScreen message={errorMessage} />;
  }

  return <SuccessScreen />;
}
