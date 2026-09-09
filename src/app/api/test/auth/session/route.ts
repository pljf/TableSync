import { NextResponse } from "next/server";
import { demoHost } from "@/lib/seed-data";
import { authEnvironment, isLocalTestAuthEnabled, testAuthKeyMatches } from "@/lib/auth-environment";
import { prisma } from "@/lib/prisma";

function hidden(): Response {
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  if (!isLocalTestAuthEnabled() || !testAuthKeyMatches(request.headers.get("x-tablesync-e2e-key"))) {
    return hidden();
  }
  if (request.headers.get("origin") !== authEnvironment.origin) {
    return hidden();
  }

  const user = await prisma.user.upsert({
    where: { email: demoHost.email },
    update: { name: demoHost.name, emailVerified: true },
    create: { ...demoHost, emailVerified: true }
  });
  const { testAuth } = await import("@/lib/test-auth");
  const context = await testAuth.$context;
  const login = await context.test.login({ userId: user.id });
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  for (const cookie of login.cookies) {
    response.cookies.set({
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite?.toLowerCase() as "lax" | "strict" | "none" | undefined,
      expires: cookie.expires ? new Date(cookie.expires * 1000) : undefined
    });
  }
  return response;
}
