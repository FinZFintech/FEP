import { prisma } from "@/lib/db";
import {
  DEFAULT_RULE_PARAMETERS,
  DEFAULT_RULE_SET_VERSION,
  type RuleParameters,
} from "./defaults";

export type RuleSetStatus = "draft" | "active" | "archived";

export interface RuleSetSummary {
  id: string | null;
  version: string;
  name: string;
  status: RuleSetStatus;
  parameters: RuleParameters;
  changeSummary: string | null;
  createdAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdBy: { id: string; name: string | null; email: string | null } | null;
  isFallback: boolean;
}

const FALLBACK_SUMMARY: RuleSetSummary = {
  id: null,
  version: DEFAULT_RULE_SET_VERSION,
  name: `Baseline ${DEFAULT_RULE_SET_VERSION}`,
  status: "active",
  parameters: DEFAULT_RULE_PARAMETERS,
  changeSummary: "Built-in baseline mirroring the values shipped in the engine source. Created automatically when no rule set has been published yet.",
  createdAt: new Date(),
  publishedAt: new Date(),
  archivedAt: null,
  createdBy: null,
  isFallback: true,
};

function parseParams(raw: string): RuleParameters {
  try {
    const parsed = JSON.parse(raw) as Partial<RuleParameters>;
    return { ...DEFAULT_RULE_PARAMETERS, ...parsed } as RuleParameters;
  } catch {
    return DEFAULT_RULE_PARAMETERS;
  }
}

function toSummary(row: {
  id: string;
  version: string;
  name: string;
  status: string;
  parameters: string;
  changeSummary: string | null;
  createdAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdBy: { id: string; name: string | null; email: string | null } | null;
}): RuleSetSummary {
  return {
    id: row.id,
    version: row.version,
    name: row.name,
    status: row.status as RuleSetStatus,
    parameters: parseParams(row.parameters),
    changeSummary: row.changeSummary,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
    archivedAt: row.archivedAt,
    createdBy: row.createdBy,
    isFallback: false,
  };
}

export async function getActiveRuleSet(): Promise<RuleSetSummary> {
  const row = await prisma.ruleSet.findFirst({
    where: { status: "active" },
    orderBy: { publishedAt: "desc" },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });
  if (!row) return FALLBACK_SUMMARY;
  return toSummary(row);
}

export async function getRuleSetByVersion(version: string): Promise<RuleSetSummary | null> {
  if (version === DEFAULT_RULE_SET_VERSION) {
    const row = await prisma.ruleSet.findUnique({
      where: { version },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    return row ? toSummary(row) : FALLBACK_SUMMARY;
  }
  const row = await prisma.ruleSet.findUnique({
    where: { version },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });
  return row ? toSummary(row) : null;
}

export async function listRuleSets(): Promise<RuleSetSummary[]> {
  const rows = await prisma.ruleSet.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });
  if (rows.length === 0) return [FALLBACK_SUMMARY];
  const mapped = rows.map(toSummary);
  if (!mapped.some((r) => r.version === DEFAULT_RULE_SET_VERSION)) {
    // Append the built-in baseline so it stays visible in the archive even
    // after admins have published their own versions. Mark it as archived so
    // the active badge is not duplicated when a real active row exists.
    mapped.push({ ...FALLBACK_SUMMARY, status: "archived" });
  }
  return mapped;
}

export interface PublishRuleSetInput {
  name: string;
  version: string;
  parameters: RuleParameters;
  changeSummary?: string;
  createdById: string;
}

/**
 * Publish a new rule set. Atomically marks any currently-active set as
 * archived and inserts the new one as active. Throws if the version string
 * is already in use.
 */
export async function publishRuleSet(input: PublishRuleSetInput): Promise<RuleSetSummary> {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.ruleSet.findUnique({ where: { version: input.version } });
    if (existing) {
      throw new Error(`Rule set version "${input.version}" already exists. Pick a unique version string.`);
    }

    const now = new Date();
    await tx.ruleSet.updateMany({
      where: { status: "active" },
      data: { status: "archived", archivedAt: now },
    });

    const created = await tx.ruleSet.create({
      data: {
        version: input.version,
        name: input.name,
        status: "active",
        parameters: JSON.stringify(input.parameters),
        changeSummary: input.changeSummary ?? null,
        publishedAt: now,
        createdById: input.createdById,
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });

    return created;
  });

  return toSummary(result);
}

export { DEFAULT_RULE_PARAMETERS, DEFAULT_RULE_SET_VERSION };
export type { RuleParameters };
