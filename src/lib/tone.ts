import type { EventStatus, EventType, TgeEvent } from "@/types"

export interface Tone {
  text: string
  soft: string
  border: string
  dot: string
}

/* Class names are written out in full so Tailwind can see them. */
const TYPE_TONE: Record<EventType, Tone> = {
  tge: { text: "text-tge", soft: "bg-tge/12", border: "border-tge/30", dot: "bg-tge" },
  sale: { text: "text-sale", soft: "bg-sale/12", border: "border-sale/30", dot: "bg-sale" },
  airdrop: { text: "text-airdrop", soft: "bg-airdrop/12", border: "border-airdrop/30", dot: "bg-airdrop" },
  unlock: { text: "text-unlock", soft: "bg-unlock/12", border: "border-unlock/30", dot: "bg-unlock" },
  mainnet: { text: "text-mainnet", soft: "bg-mainnet/12", border: "border-mainnet/30", dot: "bg-mainnet" },
}

const MARKET_TONE: Tone = {
  text: "text-market",
  soft: "bg-market/12",
  border: "border-market/40",
  dot: "bg-market",
}

/** Market-implied entries get their own colour so they never pass for a schedule. */
export function eventTone(event: Pick<TgeEvent, "type" | "status">): Tone {
  return event.status === "market" ? MARKET_TONE : TYPE_TONE[event.type]
}

export function typeTone(type: EventType): Tone {
  return TYPE_TONE[type]
}

export const STATUS_DOT: Record<EventStatus, string> = {
  confirmed: "bg-ok",
  expected: "bg-warn",
  tentative: "bg-ink-faint",
  market: "bg-market",
}

export const EVENT_TYPES: readonly EventType[] = ["tge", "sale", "airdrop", "unlock", "mainnet"]
export const EVENT_STATUSES: readonly EventStatus[] = ["confirmed", "expected", "tentative", "market"]
