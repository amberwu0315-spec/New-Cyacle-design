import { ExternalLink } from "lucide-react"

import { cn } from "#/lib/utils.ts"
import { useLanguageStore } from "#/lib/i18n/language-store.ts"
import { useDataSelectorDetailDrawerHost } from "./data-selector-detail-drawer.tsx"

export interface DrawerOutboundLinkIndicatorProps {
  className?: string
}

/** Marks a link-like control that leaves the current detail Drawer. */
export function DrawerOutboundLinkIndicator({ className }: DrawerOutboundLinkIndicatorProps) {
  const drawerHost = useDataSelectorDetailDrawerHost()
  const language = useLanguageStore()

  if (!drawerHost) {
    return null
  }

  const label = language === "en-US" ? "Open detail page" : "打开详情页"

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("inline-flex shrink-0 align-middle text-primary/70", className)}
    >
      <ExternalLink aria-hidden="true" className="size-3.5" />
    </span>
  )
}
