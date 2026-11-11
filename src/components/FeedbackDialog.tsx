import { useId, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { ExternalLink, Send, X } from "lucide-react"
import { toast } from "sonner"
import { useI18n } from "@/i18n/context"
import { cooldownMinutes, githubIssueUrl, isEmailConfigured, sendReport } from "@/services/emailService"

const field =
  "w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand"
const labelClass = "mb-1.5 block text-sm font-medium text-ink"

export function FeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n()
  const id = useId()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const emailEnabled = isEmailConfigured()
  const trimmed = message.trim()

  const openGithub = (): void => {
    window.open(githubIssueUrl({ message: trimmed }), "_blank", "noopener,noreferrer")
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!trimmed) return
    if (!emailEnabled) {
      openGithub()
      onOpenChange(false)
      return
    }
    const wait = cooldownMinutes()
    if (wait > 0) {
      toast.warning(t("feedback.cooldown", { minutes: wait }))
      return
    }
    setSending(true)
    try {
      await sendReport({ name: name.trim(), email: email.trim(), message: trimmed })
      toast.success(t("feedback.sent"))
      setMessage("")
      onOpenChange(false)
    } catch (error) {
      console.error("Issue report failed", error)
      toast.error(t("feedback.failed"), { action: { label: t("feedback.github"), onClick: openGithub } })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=open]:animate-fade" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-card outline-none data-[state=open]:animate-sheet sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(30rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-7">
          <Dialog.Title className="pr-10 font-display text-xl font-semibold tracking-tight">{t("feedback.title")}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-ink-soft">
            {t("feedback.intro")}
            {!emailEnabled && <span className="mt-1 block text-ink-faint">{t("feedback.githubHint")}</span>}
          </Dialog.Description>

          <form onSubmit={(event) => void onSubmit(event)} className="mt-5 flex flex-col gap-4">
            {emailEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${id}-name`} className={labelClass}>
                    {t("feedback.name")} <span className="font-normal text-ink-faint">({t("feedback.optional")})</span>
                  </label>
                  <input
                    id={`${id}-name`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={80}
                    className={field}
                  />
                </div>
                <div>
                  <label htmlFor={`${id}-email`} className={labelClass}>
                    {t("feedback.email")} <span className="font-normal text-ink-faint">({t("feedback.optional")})</span>
                  </label>
                  <input
                    id={`${id}-email`}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    maxLength={120}
                    className={field}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor={`${id}-message`} className={labelClass}>
                {t("feedback.message")}
              </label>
              <textarea
                id={`${id}-message`}
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("feedback.messagePlaceholder")}
                maxLength={4000}
                className={`${field} resize-y`}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Dialog.Close className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink">
                {t("feedback.cancel")}
              </Dialog.Close>
              <button
                type="submit"
                disabled={!trimmed || sending}
                className="flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition-opacity disabled:opacity-50"
              >
                {emailEnabled ? <Send aria-hidden className="size-4" /> : <ExternalLink aria-hidden className="size-4" />}
                {sending ? t("feedback.sending") : emailEnabled ? t("feedback.send") : t("feedback.github")}
              </button>
            </div>
          </form>

          <Dialog.Close
            aria-label={t("event.close")}
            className="absolute top-4 right-4 grid size-9 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-ink/8 hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
