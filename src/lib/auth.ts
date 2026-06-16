import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDemoHost } from "@/lib/store";

const HOST_COOKIE = "tablesync_host";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const hostId = cookieStore.get(HOST_COOKIE)?.value;
  const demoHost = getDemoHost();

  return hostId === demoHost.id ? demoHost : null;
}

export async function requireHost() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  return user;
}

export async function setDemoHostSession() {
  const cookieStore = await cookies();
  cookieStore.set(HOST_COOKIE, getDemoHost().id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearHostSession() {
  const cookieStore = await cookies();
  cookieStore.delete(HOST_COOKIE);
}

