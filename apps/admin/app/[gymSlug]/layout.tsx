import { GymSidebar } from "@/components/gym-sidebar";

export default function GymLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      <GymSidebar />
      <main className="flex-1 ml-60 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
