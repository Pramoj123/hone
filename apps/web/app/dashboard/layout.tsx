import { MemberNav } from "@/components/member-nav";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { EmailVerificationBanner } from "@/components/email-verification-banner";

export default function DashboardLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-screen bg-background">
      <MemberNav />
      <main className="flex-1 md:ml-56 min-h-screen overflow-y-auto pb-16 md:pb-0">
        <EmailVerificationBanner />
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
