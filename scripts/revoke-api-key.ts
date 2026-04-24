/// <reference types="node" />
/**
 * Revoke a machine-to-machine API key. After revocation the key will be
 * rejected by /api/assess with HTTP 401. The row is retained for audit;
 * use a DB delete if you need to purge it entirely.
 *
 * Usage:
 *   npx tsx scripts/revoke-api-key.ts <key-id-or-prefix>
 *   npx tsx scripts/revoke-api-key.ts --list [user-email]
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";

async function list(email?: string) {
  const where = email
    ? { user: { email: email.toLowerCase() } }
    : undefined;
  const keys = await prisma.apiKey.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
      user: { select: { email: true } },
    },
  });

  if (keys.length === 0) {
    console.log("No API keys found.");
    return;
  }

  for (const k of keys) {
    const status = k.revokedAt
      ? `REVOKED ${k.revokedAt.toISOString()}`
      : "active";
    const used = k.lastUsedAt ? k.lastUsedAt.toISOString() : "never";
    console.log(
      `${k.id}  ${k.prefix}…  ${k.user.email ?? "?"}  "${k.name}"  [${status}]  last-used: ${used}`,
    );
  }
}

async function revoke(idOrPrefix: string) {
  const record = await prisma.apiKey.findFirst({
    where: {
      OR: [{ id: idOrPrefix }, { prefix: idOrPrefix }],
    },
  });
  if (!record) {
    console.error(`No API key matching "${idOrPrefix}".`);
    process.exit(1);
  }
  if (record.revokedAt) {
    console.log(`Key ${record.id} is already revoked (${record.revokedAt.toISOString()}).`);
    return;
  }
  const updated = await prisma.apiKey.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });
  console.log(`Revoked ${updated.id} ("${updated.name}") at ${updated.revokedAt!.toISOString()}.`);
}

async function main() {
  const [, , arg1, arg2] = process.argv;

  if (!arg1) {
    console.error("Usage: npx tsx scripts/revoke-api-key.ts <key-id-or-prefix>");
    console.error("       npx tsx scripts/revoke-api-key.ts --list [user-email]");
    process.exit(1);
  }

  if (arg1 === "--list" || arg1 === "-l") {
    await list(arg2);
  } else {
    await revoke(arg1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
