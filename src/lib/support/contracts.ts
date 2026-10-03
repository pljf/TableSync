export type SupportMode = "ai" | "knowledge";

export interface SupportMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SupportSource {
  id: string;
  title: string;
  href: string;
}

export interface SupportReply {
  answer: string;
  mode: SupportMode;
  sources: SupportSource[];
  notice?: string;
}

export const SUPPORT_MESSAGE_LIMIT = 12;
export const SUPPORT_CONTENT_LIMIT = 2_000;
