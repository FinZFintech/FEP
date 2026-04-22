import { auth } from "./index";

export const ADMIN_ROLE = "admin";

export function isAdminRole(role?: string | null): boolean {
  return role === ADMIN_ROLE;
}

/**
 * Returns the active session iff the user is signed in AND has the admin role.
 * Returns null otherwise. Use in admin-only route handlers and server pages.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (!isAdminRole(session.user.role)) return null;
  return session;
}
