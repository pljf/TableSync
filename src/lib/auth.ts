import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { authEnvironment } from "@/lib/auth-environment";
import type { User } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

function discardProviderTokens<T extends Record<string, unknown>>(account: T): T {
  return {
    ...account,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null
  };
}

export const auth = betterAuth({
  appName: "TableSync",
  baseURL: authEnvironment.baseUrl,
  secret: authEnvironment.secret,
  trustedOrigins: authEnvironment.trustedOrigins,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: authEnvironment.githubConfigured
    ? {
        github: {
          clientId: authEnvironment.githubId!,
          clientSecret: authEnvironment.githubSecret!,
          scope: ["read:user", "user:email"]
        }
      }
    : {},
  account: {
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 5,
    deferSessionRefresh: true
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/social": { window: 60, max: 10 },
      "/callback/*": { window: 60, max: 20 }
    }
  },
  advanced: {
    cookiePrefix: "tablesync-auth",
    defaultCookieAttributes: {
      httpOnly: true,
      secure: authEnvironment.secureCookies,
      sameSite: "lax",
      path: "/"
    }
  },
  databaseHooks: {
    account: {
      create: {
        before: async (account) => ({ data: discardProviderTokens(account) })
      },
      update: {
        before: async (account) => ({ data: discardProviderTokens(account) })
      }
    }
  }
});

export async function getCurrentUser(): Promise<User | null> {
  if (!authEnvironment.productionReady && !process.env.TABLESYNC_E2E_AUTH) {
    return null;
  }
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true }
  });
  if (!session?.user) {
    return null;
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? undefined
  };
}

export async function requireHost(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }
  return user;
}
