export { auth as middleware } from "@/lib/auth";

// `/api/assess` is excluded so machine-to-machine callers using API keys
// (see /docs/api-integration.md) aren't bounced through the OAuth redirect.
// Auth for that route is enforced in the route handler itself.
export const config = {
  matcher: [
    "/((?!api/auth|api/assess|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
