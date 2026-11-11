import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@fontsource-variable/inter/index.css"
import "@fontsource-variable/space-grotesk/index.css"
import "@fontsource-variable/jetbrains-mono/index.css"
import "./index.css"
import App from "./App"
import { I18nProvider } from "./i18n/I18nProvider"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Don't poll third-party APIs from a tab nobody is looking at.
      refetchIntervalInBackground: false,
    },
  },
})

const root = document.getElementById("root")
if (!root) throw new Error("Missing #root element")

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
)
