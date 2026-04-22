import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin";
import { getActiveRuleSet } from "@/lib/rules";
import { RuleEngineEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function AdminEditRuleEnginePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isAdminRole(session.user.role)) redirect("/dashboard");

  const active = await getActiveRuleSet();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <Link href="/rules" className="text-sm text-blue-600 hover:underline">← Back to Rule Engine</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Edit rule engine</h1>
        <p className="text-sm text-slate-500 mt-1">
          Currently active: <strong className="font-mono text-slate-700">v{active.version}</strong> · {active.name}.
          Saving publishes a new version and archives the current one. Cases keep a pointer to the version that scored them.
        </p>
      </div>

      <RuleEngineEditor
        baselineVersion={active.version}
        baselineParameters={active.parameters}
      />
    </div>
  );
}
