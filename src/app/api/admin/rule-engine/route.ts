import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { publishRuleSet } from "@/lib/rules";
import type { RuleParameters } from "@/lib/rules/defaults";

interface PublishBody {
  version?: string;
  name?: string;
  changeSummary?: string | null;
  parameters?: RuleParameters;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let body: PublishBody;
  try {
    body = (await req.json()) as PublishBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.version || !body.name || !body.parameters) {
    return NextResponse.json({ error: "version, name and parameters are required" }, { status: 400 });
  }

  try {
    const created = await publishRuleSet({
      version: body.version,
      name: body.name,
      parameters: body.parameters,
      changeSummary: body.changeSummary ?? undefined,
      createdById: session.user.id,
    });
    return NextResponse.json({
      id: created.id,
      version: created.version,
      name: created.name,
      status: created.status,
      publishedAt: created.publishedAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Publish failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
