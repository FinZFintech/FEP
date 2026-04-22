import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { UserRoleControls } from "./role-controls";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isAdminRole(session.user.role)) redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { assessments: true } },
    },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">← Back to Admin</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Users &amp; roles</h1>
        <p className="text-sm text-slate-500 mt-1">
          Promote a teammate to admin to grant rule-engine edit access. The
          <code className="mx-1 px-1 py-0.5 bg-slate-100 border border-slate-200 rounded">credit_manager</code>
          role keeps assessment access but removes admin pages.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 text-center">Cases</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{u.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-center text-slate-600">{u._count.assessments}</td>
                <td className="px-4 py-3 text-slate-600">{u.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
                <td className="px-4 py-3">
                  <UserRoleControls
                    userId={u.id}
                    currentRole={u.role}
                    isSelf={u.id === session.user.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
