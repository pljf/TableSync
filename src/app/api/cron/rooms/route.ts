import { timingSafeEqual } from "node:crypto";
import { purgeExpiredRooms } from "@/lib/room-cleanup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const responseHeaders = { "Cache-Control": "no-store, max-age=0" };

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret?.trim() || !authorization) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: responseHeaders });
  }

  try {
    const deleted = await purgeExpiredRooms();
    return Response.json({ deletedRooms: deleted.count }, { headers: responseHeaders });
  } catch {
    console.error("Scheduled room cleanup failed.");
    return Response.json(
      { error: "Room cleanup failed." },
      { status: 500, headers: responseHeaders }
    );
  }
}
