import { Component, type ErrorInfo, type ReactNode } from "react"
import { RotateCcw } from "lucide-react"
import { useI18n } from "@/i18n/context"

function Fallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <div role="alert" className="rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="font-display text-lg font-semibold text-ink">{t("error.title")}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{t("error.body")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-raised"
      >
        <RotateCcw aria-hidden className="size-4" />
        {t("error.retry")}
      </button>
    </div>
  )
}

interface Props {
  children: ReactNode
  /** Changing this value clears a caught error (e.g. the active view). */
  resetKey?: string
}

interface State {
  failed: boolean
  resetKey?: string
}

/**
 * Contains a rendering failure to one region. A malformed row from a
 * third-party API should cost the visitor one panel, not the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, resetKey: this.props.resetKey }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Render error", error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.failed) return <Fallback onRetry={() => this.setState({ failed: false })} />
    return this.props.children
  }
}
