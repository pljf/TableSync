import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "TableSync",
  description: "Plan Dinner, Hotpot, Potluck, BBQ, Picnic, Brunch, and other shared meals with guest preferences, voting, contributions, and shopping."
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}

