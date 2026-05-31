"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, GitBranch, Users, UserCheck, Dumbbell, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/use-current-user";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
}

function buildNavItems(gymSlug: string): NavItem[] {
  return [
    {
      href: `/${gymSlug}/dashboard`,
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["ORG_ADMIN", "BRANCH_MANAGER", "TRAINER", "SUPER_ADMIN"],
    },
    {
      href: `/${gymSlug}/branches`,
      label: "Branches",
      icon: GitBranch,
      roles: ["ORG_ADMIN", "SUPER_ADMIN"],
    },
    {
      href: `/${gymSlug}/staff`,
      label: "Staff",
      icon: UserCheck,
      roles: ["ORG_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"],
    },
    {
      href: `/${gymSlug}/members`,
      label: "Members",
      icon: Users,
      roles: ["ORG_ADMIN", "BRANCH_MANAGER", "TRAINER", "SUPER_ADMIN"],
    },
    {
      href: `/${gymSlug}/workouts`,
      label: "Workouts",
      icon: Dumbbell,
      roles: ["ORG_ADMIN", "BRANCH_MANAGER", "TRAINER", "SUPER_ADMIN"],
    },
  ];
}

export function GymSidebar(): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const gymSlug = pathname.split("/")[1] ?? "";
  const { data: user } = useCurrentUser();

  const navItems = buildNavItems(gymSlug).filter(
    (item) => !user || item.roles.includes(user.role)
  );

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
        {gymSlug && (
          <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
            {gymSlug}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
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

      {/* User + sign out */}
      <div className="px-3 py-4 border-t border-border shrink-0 space-y-1">
        {user && (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            <p className="font-medium text-foreground truncate">{user.name}</p>
            <p className="truncate">{user.role.replace(/_/g, " ")}</p>
          </div>
        )}
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
