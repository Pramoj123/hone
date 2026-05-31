import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-foreground">404</p>
        <p className="text-muted-foreground text-sm">This page doesn&apos;t exist.</p>
        <Link href="/dashboard" className="inline-block text-sm underline text-foreground hover:text-muted-foreground transition-colors">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
