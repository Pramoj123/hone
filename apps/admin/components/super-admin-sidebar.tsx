"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Dumbbell, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Gyms",
    icon: Building2,
    isActive: (p) => p === "/dashboard" || p.startsWith("/gyms"),
  },
  {
    href: "/workouts",
    label: "Workouts",
    icon: Dumbbell,
    isActive: (p) => p.startsWith("/workouts"),
  },
];

export function SuperAdminSidebar(): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut(): Promise<void> {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
  }

  return (
    <aside className="w-60 h-screen fixed left-0 top-0 bg-card border-r border-border flex flex-col z-10">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-border shrink-0">
        <span className="text-xl font-bold tracking-tight text-foreground">
          hone<span className="text-[#ccff00]">.</span>
        </span>
        <p className="text-xs text-muted-foreground mt-0.5">Super Admin</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-border shrink-0">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
