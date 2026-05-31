"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }): React.JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-lg font-semibold text-foreground">Something went wrong</p>
        <p className="text-sm text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
        <Button onClick={reset} variant="outline" size="sm">Try again</Button>
      </div>
    </div>
  );
}
