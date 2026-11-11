import { History } from "lucide-react"
import { DATASET_STALE_AFTER_DAYS, DATASET_VERIFIED_ON } from "@/data/events"
import { useI18n } from "@/i18n/context"
import { diffDays, type DayKey } from "@/lib/dates"
import { formatDay } from "@/lib/eventText"

/**
 * Says so when the curated dates have not been re-checked for a while. The
 * live sources keep working without anyone touching the dataset, which is
 * exactly when a visitor could mistake an old schedule for a current one.
 */
export function DatasetNotice({ today }: { today: DayKey }) {
  const i18n = useI18n()
  const age = diffDays(DATASET_VERIFIED_ON, today)
  if (age <= DATASET_STALE_AFTER_DAYS) return null

  return (
    <p
      role="note"
      className="mt-4 flex items-start gap-2.5 rounded-2xl border border-tentative/30 bg-tentative/10 px-4 py-3 text-sm leading-relaxed text-ink-soft"
    >
      <History aria-hidden className="mt-0.5 size-4 shrink-0 text-tentative" />
      {i18n.t("data.stale", { count: age, date: formatDay(i18n, DATASET_VERIFIED_ON, "medium") })}
    </p>
  )
}
