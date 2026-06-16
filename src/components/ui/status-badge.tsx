import type { RoomStatus } from "@/lib/domain";
import { humanize, statusTone } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: RoomStatus }) {
  return <Badge tone={statusTone(status)}>{humanize(status)}</Badge>;
}

