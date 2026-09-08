import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { authEnvironment } from "@/lib/auth-environment";
import { GUEST_SESSION_COOKIE, revokeCurrentGuestSession } from "@/lib/guest-session";
import { prisma } from "@/lib/prisma";

const handlers = toNextJsHandler(auth);

function unavailable(): Response {
  return Response.json(
    { error: "Authentication is not configured for this environment." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}

function signOutUnavailable(): Response {
  return Response.json(
    { error: "Sign-out could not be completed. Please try again." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}

export function GET(request: Request): Promise<Response> | Response {
  return authEnvironment.sessionReady ? handlers.GET(request) : unavailable();
}

export async function POST(request: Request): Promise<Response> {
  if (!authEnvironment.sessionReady) return unavailable();
  const origin = request.headers.get("origin");
  if (!origin || !authEnvironment.trustedOrigins.includes(origin)) {
    return Response.json(
      { error: "This authentication request has an untrusted origin." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  const signingOut = new URL(request.url).pathname === "/api/auth/sign-out";
  let hostSessionToken: string | undefined;
  if (signingOut) {
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
        query: { disableCookieCache: true, disableRefresh: true }
      });
      hostSessionToken = session?.session.token;
    } catch {
      return signOutUnavailable();
    }
  }
  const response = await handlers.POST(request);
  if (response.ok && signingOut) {
    let guestCookieNames: string[];
    try {
      // Better Auth swallows failures in its session deletion. Require persistent
      // revocation before returning its successful cookie-expiration response.
      if (hostSessionToken) await prisma.session.deleteMany({ where: { token: hostSessionToken } });
      guestCookieNames = await revokeCurrentGuestSession();
    } catch {
      return signOutUnavailable();
    }
    // Keep both host and meal-session expirations on the same response. Next's
    // mutable cookie store can otherwise replace Better Auth's Set-Cookie headers.
    for (const name of guestCookieNames ?? [GUEST_SESSION_COOKIE]) {
      response.headers.append(
        "Set-Cookie",
        `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${authEnvironment.secureCookies ? "; Secure" : ""}`
      );
    }
  }
  return response;
}
