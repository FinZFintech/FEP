import { getActiveRuleSet } from "@/lib/rules";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin";
import { RuleEngineView } from "@/components/rules/rule-engine-view";

export const dynamic = "force-dynamic";

export default async function RuleEnginePage() {
  const [active, session] = await Promise.all([getActiveRuleSet(), auth()]);
  const isAdmin = isAdminRole(session?.user?.role);

  return (
    <RuleEngineView
      version={active.version}
      name={active.name}
      status={active.status}
      parameters={active.parameters}
      changeSummary={active.changeSummary}
      publishedAt={active.publishedAt}
      createdBy={active.createdBy}
      isFallback={active.isFallback}
      canEdit={isAdmin}
      isAdmin={isAdmin}
    />
  );
}
