import { getRequestActors } from "@/lib/request-actors";
import { getRoomRevision } from "@/lib/room-revision";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store", Vary: "Cookie" };

function failureCode(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  return typeof code === "string" && /^(?:P[0-9]{4}|[0-9]{2}[A-Z0-9]{3}|XX[0-9]{3}|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE)$/.test(code) ? code : "UNKNOWN";
}

export async function GET(_request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const revision = await getRoomRevision(roomId, await getRequestActors(roomId));
    if (!revision) return Response.json({ error: "Room unavailable" }, { status: 404, headers });
    return Response.json({ revision }, { headers });
  } catch (error) {
    // Never log error objects: driver messages can contain credentials or data.
    console.error("room_revision_failed", failureCode(error));
    return Response.json({ error: "Room updates are temporarily unavailable" }, { status: 503, headers });
  }
}
