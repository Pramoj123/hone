import { GymSidebar } from "@/components/gym-sidebar";
import { MobileAdminHeader } from "@/components/mobile-admin-header";

export default function GymLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      <GymSidebar />
      <MobileAdminHeader />
      <main className="flex-1 md:ml-60 min-h-screen overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
