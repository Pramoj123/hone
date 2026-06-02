"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, History, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard",             label: "Home",        icon: Home,          exact: true  },
  { href: "/dashboard/programs",    label: "Programs",    icon: Dumbbell,      exact: false },
  { href: "/dashboard/logs",        label: "Logs",        icon: History,       exact: false },
  { href: "/dashboard/assessments", label: "Assessments", icon: ClipboardList, exact: false },
  { href: "/dashboard/profile",     label: "Profile",     icon: User,          exact: false },
] as const;

export function MobileBottomNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 z-50 md:hidden bg-card border-t border-border flex">
      {TABS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
          >
            <Icon
              className={cn(
                "h-5 w-5",
                active ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
