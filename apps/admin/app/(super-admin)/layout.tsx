import { SuperAdminSidebar } from "@/components/super-admin-sidebar";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen bg-background">
      <SuperAdminSidebar />
      <div className="flex-1 ml-60 min-w-0">{children}</div>
    </div>
  );
}
