"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildNavItems, GymNavItems, GymUserSection } from "@/components/gym-sidebar";
import { useCurrentUser } from "@/lib/use-current-user";

export function MobileAdminHeader(): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    <>
      {/* Top header bar */}
      <header className="fixed top-0 left-0 right-0 h-14 z-50 md:hidden bg-card border-b border-border flex items-center px-4">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="flex-1 text-center text-lg font-bold text-foreground">
          hone<span className="text-[#ccff00]">.</span>
        </span>
        {user && (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </header>

      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Slide-in drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-72 z-[70] bg-card border-r border-border flex flex-col md:hidden transition-transform duration-200",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <span className="text-xl font-bold text-foreground">
              hone<span className="text-[#ccff00]">.</span>
            </span>
            {gymSlug && (
              <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{gymSlug}</p>
            )}
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <GymNavItems
          navItems={navItems}
          pathname={pathname}
          onNavClick={() => setDrawerOpen(false)}
        />

        <GymUserSection user={user} onSignOut={handleSignOut} />
      </div>
    </>
  );
}
