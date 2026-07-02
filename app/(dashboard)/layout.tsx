import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-zinc-50 p-4 md:p-6 lg:ml-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
