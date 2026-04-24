/// <reference types="node" />
/**
 * Mint a new machine-to-machine API key for calling /api/assess.
 *
 * Usage:
 *   npx tsx scripts/mint-api-key.ts <user-email> <key-name>
 *
 * Example:
 *   npx tsx scripts/mint-api-key.ts ops@finz.finance "Partner LMS — prod"
 *
 * Requirements:
 *   - The target user must already exist (sign in once via Google at /login
 *     so the User row is created by the Prisma adapter).
 *   - The raw key is printed ONCE to stdout. Store it securely; only the
 *     SHA-256 hash is persisted in the DB.
 *
 * The API key inherits the user's identity. Every assessment created with
 * this key is attributed to that user (Assessment.createdById).
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { generateApiKey } from "../src/lib/auth/api-key";

async function main() {
  const [, , emailArg, ...nameParts] = process.argv;
  const name = nameParts.join(" ").trim();

  if (!emailArg || !name) {
    console.error(
      'Usage: npx tsx scripts/mint-api-key.ts <user-email> "<key name>"',
    );
    process.exit(1);
  }

  const email = emailArg.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(
      `No user with email ${email}. Ask them to sign in via Google at /login once first.`,
    );
    process.exit(1);
  }

  const { key, prefix, hash } = generateApiKey();
  const record = await prisma.apiKey.create({
    data: { name, prefix, hash, userId: user.id },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });

  process.stdout.write(
    [
      "",
      "API key minted. Copy it now — it will NOT be shown again.",
      "",
      `  id:      ${record.id}`,
      `  name:    ${record.name}`,
      `  user:    ${user.email}`,
      `  prefix:  ${prefix}…`,
      `  created: ${record.createdAt.toISOString()}`,
      "",
      `  key:     ${key}`,
      "",
      "Example request:",
      "",
      `  curl -X POST $NEXTAUTH_URL/api/assess \\`,
      `    -H 'Authorization: Bearer ${key}' \\`,
      `    -H 'Content-Type: application/json' \\`,
      `    -d @payload.json`,
      "",
    ].join("\n"),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
