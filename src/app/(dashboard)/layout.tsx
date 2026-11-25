import { Sidebar } from "@/components/layout/sidebar";
import { ObservationWidget } from "@/components/feedback/ObservationWidget";
import { InactivityGuard } from "@/components/auth/InactivityGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 print:h-auto print:overflow-visible">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative print:h-auto print:overflow-visible">
        {children}
        <ObservationWidget />
        <InactivityGuard />
      </main>
    </div>
  );
}
