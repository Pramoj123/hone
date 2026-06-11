"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Dumbbell, ClipboardList, User, Settings, LogOut, History, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";

interface Me {
  id: string;
  name: string;
  email: string;
  memberNumber: string | null;
}

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/programs", label: "Programs", icon: Dumbbell },
  { href: "/dashboard/progress", label: "Progress", icon: LineChart },
  { href: "/dashboard/logs", label: "Logs", icon: History },
  { href: "/dashboard/assessments", label: "Assessments", icon: ClipboardList },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function MemberNav(): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: () => authApi.get<Me>("/auth/me"),
    staleTime: 5 * 60 * 1000,
  });

  async function signOut(): Promise<void> {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
  }

  return (
    <aside className="w-56 h-screen fixed left-0 top-0 hidden md:flex flex-col bg-card border-r border-border z-10">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-border shrink-0">
        <span className="text-xl font-bold tracking-tight text-foreground">
          hone<span className="text-primary">.</span>
        </span>
        {me?.memberNumber && (
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{me.memberNumber}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="px-3 py-4 border-t border-border shrink-0 space-y-1">
        {me && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground truncate">{me.name}</p>
            <p className="truncate">{me.email}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
