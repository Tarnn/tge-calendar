import * as Accordion from "@radix-ui/react-accordion"
import { Plus } from "lucide-react"
import { useI18n } from "@/i18n/context"
import type { MessageKey } from "@/i18n/en"

const ITEMS: ReadonlyArray<{ q: MessageKey; a: MessageKey }> = [
  { q: "faq.q1", a: "faq.a1" },
  { q: "faq.q2", a: "faq.a2" },
  { q: "faq.q3", a: "faq.a3" },
  { q: "faq.q4", a: "faq.a4" },
  { q: "faq.q5", a: "faq.a5" },
  { q: "faq.q6", a: "faq.a6" },
  { q: "faq.q7", a: "faq.a7" },
]

export function Faq({ onReport }: { onReport: () => void }) {
  const { t } = useI18n()
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h2 id="faq-title" className="font-display text-3xl font-semibold tracking-tight">
        {t("faq.title")}
      </h2>
      <Accordion.Root type="single" collapsible defaultValue="faq.q1" className="mt-6 divide-y divide-line border-y border-line">
        {ITEMS.map((item) => (
          <Accordion.Item key={item.q} value={item.q}>
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full items-center gap-4 py-4 text-left font-medium text-ink transition-colors hover:text-brand-ink">
                <span className="flex-1">{t(item.q)}</span>
                <Plus
                  aria-hidden
                  className="size-4 shrink-0 text-ink-faint transition-transform duration-200 group-data-[state=open]:rotate-45"
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden text-[15px] leading-relaxed text-ink-soft data-[state=closed]:animate-[accordion-up_0.2s_ease-out] data-[state=open]:animate-[accordion-down_0.2s_ease-out]">
              <p className="pr-8 pb-5 text-pretty">{t(item.a)}</p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
      <button
        type="button"
        onClick={onReport}
        className="mt-6 text-sm font-medium text-brand-ink underline-offset-4 hover:underline"
      >
        {t("feedback.open")} →
      </button>
    </section>
  )
}
