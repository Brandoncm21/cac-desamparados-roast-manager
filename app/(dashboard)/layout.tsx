import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <Sidebar />
      <TopBar />
      <main className="flex-1 min-h-screen lg:ml-64 lg:pt-16 p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
