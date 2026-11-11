import logoUrl from "@/assets/logo.png"
import { toast } from "sonner"
import { useI18n } from "@/i18n/context"
import { DATASET_VERIFIED_ON } from "@/data/events"
import { formatDay } from "@/lib/eventText"
import { REPO_URL } from "@/services/emailService"

const DONATION_ADDRESS = "7DAJDDn615WTaPQVkLvyoDyHZ5uCSeHgRS3yMsqborg7"
const X_URL = "https://x.com/Tarn__K"

function SolanaMark() {
  return (
    <svg aria-hidden width="16" height="13" viewBox="0 0 398 312" fill="currentColor">
      <path d="M64.6 237.9a13 13 0 0 1 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7a13 13 0 0 1-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z" />
      <path d="M64.6 3.8A13.4 13.4 0 0 1 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7a13 13 0 0 1-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z" />
      <path d="M333.1 120.1a13 13 0 0 0-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7a13 13 0 0 0 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1z" />
    </svg>
  )
}

export function Footer({ onReport }: { onReport: () => void }) {
  const i18n = useI18n()
  const { t } = i18n

  const copyAddress = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(DONATION_ADDRESS)
      toast.success(t("footer.copied"), { description: DONATION_ADDRESS })
    } catch {
      toast.error(t("footer.copyFailed", { address: DONATION_ADDRESS }), { duration: 10_000 })
    }
  }

  const linkClass = "text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"

  return (
    <footer className="border-t border-line bg-surface/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <img src={logoUrl} alt="" width={28} height={28} className="size-7 rounded-lg" />
            <span className="font-display text-[17px] font-semibold tracking-tight">
              <span className="text-brand-ink">TGE</span> Calendar
            </span>
          </div>
          <p className="mt-3 text-sm text-ink-soft">{t("footer.tagline")}</p>
          <p className="mt-4 max-w-lg text-xs leading-relaxed text-ink-faint">{t("footer.disclaimer")}</p>
          <p className="mt-2 max-w-lg text-xs leading-relaxed text-ink-faint">
            {t("footer.data", { date: formatDay(i18n, DATASET_VERIFIED_ON, "long") })}
          </p>
        </div>

        <div className="flex flex-col gap-5 md:items-end">
          <button
            type="button"
            onClick={() => void copyAddress()}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-[#00c98a] to-[#9945ff] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_#9945ff] transition-transform hover:-translate-y-0.5"
          >
            <SolanaMark />
            {t("footer.donate")}
          </button>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
            <a href="#faq" className={linkClass}>
              {t("nav.faq")}
            </a>
            <a href={`${REPO_URL}/issues/new`} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {t("footer.contribute")}
            </a>
            <button type="button" onClick={onReport} className={linkClass}>
              {t("feedback.open")}
            </button>
          </nav>

          <div className="flex items-center gap-4 text-ink-faint">
            <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="X" className="transition-colors hover:text-ink">
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="transition-colors hover:text-ink">
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.8-.26.8-.58v-2.23c-3.34.72-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.2.7.8.58A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <span className="text-xs">{t("footer.rights")}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
