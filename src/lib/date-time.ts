/** Convert a validated form date using the browser's offset for the chosen day. */
export function roomDateTimeToIso(value: string | undefined, offset: FormDataEntryValue | null): string | undefined {
  if (!value) return undefined;
  if (/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return new Date(value).toISOString();

  const minutes = typeof offset === "string" && offset.trim() !== "" ? Number(offset) : NaN;
  if (!Number.isInteger(minutes) || Math.abs(minutes) > 14 * 60) {
    throw new Error("Cannot determine your time zone. Refresh the page and enter the date again.");
  }
  return new Date(Date.parse(`${value}Z`) + minutes * 60_000).toISOString();
}

export function formatEventDateTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone, timeZoneName: "short"
  }).format(new Date(value));
}
