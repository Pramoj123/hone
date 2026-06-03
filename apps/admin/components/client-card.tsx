"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Activity, CalendarClock, TrendingUp } from "lucide-react";

export interface MyClient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  memberNumber: string | null;
  totalPrograms: number;
  activeProgramsCount: number;
  lastSessionDate: string | null;
  complianceRate: number;
}

function ClientAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }): React.JSX.Element {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-12 w-12 rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-semibold text-sm text-foreground shrink-0">
      {initials}
    </div>
  );
}

function relativeDate(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ComplianceText({ rate }: { rate: number }): React.JSX.Element {
  const color =
    rate >= 80 ? "text-green-600" : rate >= 50 ? "text-amber-600" : "text-red-600";
  return <span className={cn("font-semibold", color)}>{rate}%</span>;
}

interface ClientCardProps {
  client: MyClient;
  gymSlug: string;
}

export function ClientCard({ client, gymSlug }: ClientCardProps): React.JSX.Element {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 hover:border-foreground/20 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClientAvatar name={client.name} photoUrl={client.photoUrl} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{client.name}</p>
          {client.memberNumber && (
            <p className="text-xs text-muted-foreground font-mono">{client.memberNumber}</p>
          )}
          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/50 px-2 py-2 text-center">
          <Activity className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
          <p className="text-sm font-semibold text-foreground">{client.activeProgramsCount}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Active</p>
        </div>
        <div className="rounded-lg bg-muted/50 px-2 py-2 text-center">
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
          <p className="text-sm font-semibold text-foreground">
            {client.lastSessionDate ? relativeDate(client.lastSessionDate) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight">Last session</p>
        </div>
        <div className="rounded-lg bg-muted/50 px-2 py-2 text-center">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
          <p className="text-sm">
            <ComplianceText rate={client.complianceRate} />
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight">Compliance</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs"
          onClick={() => router.push(`/${gymSlug}/members/${client.id}`)}
        >
          View client
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs"
          disabled
          title="Coming in Phase 2"
        >
          Assign program
        </Button>
      </div>
    </div>
  );
}
