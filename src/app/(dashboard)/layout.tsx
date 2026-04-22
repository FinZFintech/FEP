import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        userName={session.user.name}
        userEmail={session.user.email}
        userImage={session.user.image}
        userRole={session.user.role}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
