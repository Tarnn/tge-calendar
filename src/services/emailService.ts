import { readJson, writeJson } from "@/lib/storage"

/**
 * Issue reports. When EmailJS credentials are present in the environment the
 * report is emailed; otherwise the caller falls back to a pre-filled GitHub
 * issue, so the form always leads somewhere real.
 */
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_BUG as string | undefined
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined

export const REPO_URL = "https://github.com/Tarnn/tge-calendar"

const COOLDOWN_MS = 5 * 60_000
const COOLDOWN_KEY = "tge:last-report"

export interface IssueReport {
  name: string
  email: string
  message: string
}

export function isEmailConfigured(): boolean {
  return Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)
}

/** Minutes left before another report may be sent; 0 when sending is allowed. */
export function cooldownMinutes(now: number = Date.now()): number {
  const last = readJson<number>(COOLDOWN_KEY, 0)
  const remaining = COOLDOWN_MS - (now - last)
  return remaining > 0 ? Math.ceil(remaining / 60_000) : 0
}

export async function sendReport(report: IssueReport): Promise<void> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) throw new Error("EmailJS is not configured")
  // Loaded on demand: most visitors never open the form.
  const { default: emailjs } = await import("@emailjs/browser")
  const response = await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      from_name: report.name || "Anonymous",
      from_email: report.email || "not provided",
      subject: "TGE Calendar — issue report",
      message: report.message,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      report_type: "Issue report",
    },
    { publicKey: PUBLIC_KEY },
  )
  if (response.status !== 200) throw new Error(`EmailJS returned ${response.status}`)
  writeJson(COOLDOWN_KEY, Date.now())
}

/** A new-issue link with the report already typed in. Contact details are left out: issues are public. */
export function githubIssueUrl(report: Pick<IssueReport, "message">): string {
  const firstLine = report.message.trim().split(/\r?\n/)[0] ?? ""
  const title = firstLine.length > 70 ? `${firstLine.slice(0, 67)}…` : firstLine
  const params = new URLSearchParams({
    title: title || "Issue report",
    body: `${report.message.trim()}\n\n---\nPage: ${window.location.href}`,
  })
  return `${REPO_URL}/issues/new?${params.toString()}`
}
