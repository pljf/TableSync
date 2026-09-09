import { afterEach, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { testAuth } from "@/lib/test-auth";
import { authEnvironment } from "@/lib/auth-environment";

const createdUserIds: string[] = [];

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

async function createAuthenticatedUser() {
  const id = `auth-test-${crypto.randomUUID()}`;
  const user = await prisma.user.create({
    data: {
      id,
      name: "Auth Integration Host",
      email: `${id}@example.com`,
      emailVerified: true
    }
  });
  createdUserIds.push(user.id);
  const context = await testAuth.$context;
  return { user, login: await context.test.login({ userId: user.id }) };
}

describe("production host sessions", () => {
  it("persists a signed HttpOnly database session and revokes it on sign-out", async () => {
    const { user, login } = await createAuthenticatedUser();
    const cookie = login.cookies.find((item) => item.name === "tablesync-auth.session_token");
    const persisted = await prisma.session.findUnique({ where: { token: login.token } });

    expect(cookie).toMatchObject({
      httpOnly: true,
      sameSite: "Lax",
      secure: authEnvironment.secureCookies,
      path: "/"
    });
    expect(cookie?.value).not.toBe(login.token);
    expect(persisted).toMatchObject({ userId: user.id, token: login.token });

    const active = await auth.api.getSession({
      headers: login.headers,
      query: { disableCookieCache: true }
    });
    expect(active?.user).toMatchObject({ id: user.id, email: user.email });

    await auth.api.signOut({ headers: login.headers });
    expect(await prisma.session.findUnique({ where: { token: login.token } })).toBeNull();
    expect(
      await auth.api.getSession({ headers: login.headers, query: { disableCookieCache: true } })
    ).toBeNull();
  });

  it("rejects tampered and expired session cookies", async () => {
    const { login } = await createAuthenticatedUser();
    const cookieHeader = login.headers.get("cookie");
    expect(cookieHeader).toBeTruthy();
    const tamperedHeaders = new Headers({
      cookie: `${cookieHeader?.slice(0, -1)}${cookieHeader?.endsWith("a") ? "b" : "a"}`
    });
    expect(
      await auth.api.getSession({ headers: tamperedHeaders, query: { disableCookieCache: true } })
    ).toBeNull();

    await prisma.session.update({
      where: { token: login.token },
      data: { expiresAt: new Date(Date.now() - 1_000) }
    });
    expect(
      await auth.api.getSession({ headers: login.headers, query: { disableCookieCache: true } })
    ).toBeNull();
  });
});
