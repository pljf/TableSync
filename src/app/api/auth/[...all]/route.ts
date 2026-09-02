import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { authEnvironment } from "@/lib/auth-environment";

const handlers = toNextJsHandler(auth);

function unavailable(): Response {
  return Response.json(
    { error: "Authentication is not configured for this environment." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}

export function GET(request: Request): Promise<Response> | Response {
  return authEnvironment.productionReady ? handlers.GET(request) : unavailable();
}

export function POST(request: Request): Promise<Response> | Response {
  return authEnvironment.productionReady ? handlers.POST(request) : unavailable();
}
