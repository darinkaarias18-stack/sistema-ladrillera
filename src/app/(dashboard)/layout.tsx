import { Sidebar } from "@/components/layout/sidebar";
import { ObservationWidget } from "@/components/feedback/ObservationWidget";
import { InactivityGuard } from "@/components/auth/InactivityGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
        {children}
        <ObservationWidget />
        <InactivityGuard />
      </main>
    </div>
  );
}
