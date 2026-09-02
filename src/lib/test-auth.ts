import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { testUtils } from "better-auth/plugins";
import { authEnvironment } from "@/lib/auth-environment";
import { prisma } from "@/lib/prisma";

export const testAuth = betterAuth({
  appName: "TableSync E2E",
  baseURL: authEnvironment.baseUrl,
  secret: authEnvironment.secret,
  trustedOrigins: [authEnvironment.origin],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  session: {
    expiresIn: 60 * 60,
    updateAge: 60 * 60,
    deferSessionRefresh: true
  },
  rateLimit: { enabled: false },
  advanced: {
    cookiePrefix: "tablesync-auth",
    defaultCookieAttributes: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/"
    }
  },
  plugins: [testUtils()]
});
