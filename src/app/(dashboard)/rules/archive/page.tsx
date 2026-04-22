import Link from "next/link";
import { listRuleSets } from "@/lib/rules";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function RuleArchivePage() {
  const [sets, session] = await Promise.all([listRuleSets(), auth()]);
  const isAdmin = isAdminRole(session?.user?.role);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/rules" className="text-sm text-blue-600 hover:underline">← Back to Rule Engine</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Rule set archive</h1>
          <p className="text-sm text-slate-500 mt-1">
            Every rule set that has ever been published. Cases retain a pointer to the version that scored them
            so historical assessments stay reproducible.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/admin/rule-engine/edit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm"
          >
            Publish new version
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sets.map((s) => {
              const statusCls = s.status === "active"
                ? "bg-green-50 text-green-700 border-green-200"
                : s.status === "archived"
                  ? "bg-slate-100 text-slate-600 border-slate-200"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200";
              return (
                <tr key={s.version} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">v{s.version}</td>
                  <td className="px-4 py-3 text-slate-700">{s.name}{s.isFallback && <span className="text-xs text-slate-400 ml-1">(baseline)</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusCls}`}>
                      {s.status[0].toUpperCase() + s.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.publishedAt ? s.publishedAt.toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.createdBy?.name ?? s.createdBy?.email ?? (s.isFallback ? "system" : "—")}
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-md">
                    <p className="line-clamp-2">{s.changeSummary ?? "—"}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
