import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminLandingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isAdminRole(session.user.role)) redirect("/dashboard");

  const [userCount, ruleSetCount, assessmentCount] = await Promise.all([
    prisma.user.count(),
    prisma.ruleSet.count(),
    prisma.assessment.count(),
  ]);

  const cards = [
    {
      title: "Rule Engine",
      desc: "Edit EP / FIP / LTI heuristics, weights and thresholds. Publishing creates a new versioned rule set.",
      href: "/admin/rule-engine/edit",
      cta: "Edit rules",
      meta: `${ruleSetCount} published version${ruleSetCount === 1 ? "" : "s"}`,
    },
    {
      title: "Users & roles",
      desc: "Promote teammates to admin so they can edit the rule engine, or revoke admin access.",
      href: "/admin/users",
      cta: "Manage users",
      meta: `${userCount} user${userCount === 1 ? "" : "s"}`,
    },
    {
      title: "Cases scored",
      desc: "Every case carries a pointer to the rule-set version that produced its EP and FIP.",
      href: "/history",
      cta: "Open case history",
      meta: `${assessmentCount} case${assessmentCount === 1 ? "" : "s"} on file`,
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
        <p className="text-sm text-slate-500 mt-1">
          Restricted area. Visible only to users with the <code className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded">admin</code> role.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.title} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <h2 className="text-lg font-semibold text-slate-900">{c.title}</h2>
            <p className="text-sm text-slate-500 mt-1 flex-1">{c.desc}</p>
            <p className="text-xs text-slate-400 mt-3">{c.meta}</p>
            <Link
              href={c.href}
              className="mt-3 inline-flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
            >
              {c.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
