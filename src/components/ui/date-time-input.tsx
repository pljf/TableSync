"use client";

import { useEffect, useRef } from "react";

export function DateTimeInput({ value }: { value?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const offsetRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!value || !inputRef.current || !offsetRef.current) return;
    const date = new Date(value);
    const pad = (number: number) => String(number).padStart(2, "0");
    inputRef.current.value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    offsetRef.current.value = String(date.getTimezoneOffset());
  }, [value]);
  return (
    <>
      <input ref={inputRef} name="dateTime" type="datetime-local" onChange={(event) => {
        const date = new Date(event.currentTarget.value);
        const pad = (number: number) => String(number).padStart(2, "0");
        const normalized = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        const shifted = Boolean(event.currentTarget.value) && normalized !== event.currentTarget.value.slice(0, 16);
        event.currentTarget.setCustomValidity(shifted ? "This local time does not exist because the clocks change. Choose another time." : "");
        if (offsetRef.current) {
          offsetRef.current.value = shifted || Number.isNaN(date.getTime()) ? "" : String(date.getTimezoneOffset());
        }
      }} />
      <input name="timeZoneOffset" type="hidden" ref={offsetRef} />
    </>
  );
}
