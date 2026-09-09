"use client";

import { useSyncExternalStore } from "react";
import { formatEventDateTime } from "@/lib/date-time";

const subscribe = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverTimeZone = () => "UTC";

export function EventDateTime({ value }: { value?: string }) {
  const timeZone = useSyncExternalStore(subscribe, browserTimeZone, serverTimeZone);
  return value ? <time dateTime={value}>{formatEventDateTime(value, timeZone)}</time> : <>Date TBD</>;
}
