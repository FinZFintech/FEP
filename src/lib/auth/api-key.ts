import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

// Keys are namespaced by a fixed prefix so they are easy to recognise in
// logs and tooling. `live` leaves room for a future `test` tier.
const KEY_PREFIX = "fep_live_";
const PREFIX_HINT_LENGTH = 12; // "fep_live_" + 3 chars — enough to disambiguate in a UI

export type GeneratedApiKey = {
  /** Raw key — show ONCE to the caller, never persist. */
  key: string;
  /** Safe identifier for UI/logs (first PREFIX_HINT_LENGTH chars of key). */
  prefix: string;
  /** SHA-256 hex digest of `key`. This is what goes into the DB. */
  hash: string;
};

export function generateApiKey(): GeneratedApiKey {
  // 24 random bytes → 32 URL-safe chars. ~192 bits of entropy.
  const random = randomBytes(24).toString("base64url");
  const key = `${KEY_PREFIX}${random}`;
  return {
    key,
    prefix: key.slice(0, PREFIX_HINT_LENGTH),
    hash: hashApiKey(key),
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Parses `Authorization: Bearer <key>`. Returns the raw key, or null. */
export function parseBearer(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authHeader);
  return match ? match[1] : null;
}

export type ApiKeyPrincipal = {
  userId: string;
  apiKeyId: string;
};

/**
 * Validate a raw API key. Returns the authenticated principal, or null if the
 * key is unknown, revoked, or malformed. Lookup is by unique hash column so
 * no constant-time comparison of the digest is needed.
 */
export async function authenticateApiKey(
  rawKey: string,
): Promise<ApiKeyPrincipal | null> {
  if (!rawKey.startsWith(KEY_PREFIX)) return null;

  const record = await prisma.apiKey.findUnique({
    where: { hash: hashApiKey(rawKey) },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (!record || record.revokedAt) return null;

  // Best-effort audit stamp. Don't block auth on DB write failure.
  prisma.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { userId: record.userId, apiKeyId: record.id };
}
