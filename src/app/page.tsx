import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { LandingExperience } from "@/components/brand/landing-experience";
import { GuestSignInButton } from "@/components/auth/guest-sign-in-button";
import { getCurrentUser } from "@/lib/auth";
import { authEnvironment } from "@/lib/auth-environment";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const user = await getCurrentUser();
  const action = user
    ? <Link className="button" href="/dashboard" prefetch={false}>Open your gatherings <ArrowRight size={17} aria-hidden="true" /></Link>
    : <GuestSignInButton className="button" disabled={!authEnvironment.sessionReady} />;
  return <LandingExperience primaryAction={action} createHref="/rooms/new" />;
}
