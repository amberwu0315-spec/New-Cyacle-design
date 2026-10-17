import type { ComponentProps } from "react"
import {
  ReplaceDisplay as LibraryReplaceDisplay,
  ReplaceEditor as LibraryReplaceEditor,
} from "@cew-lib/cyacle-replace-symbols"

import { cn } from "../../../lib/utils.ts"
import styles from "./replace-symbols.module.css"

// 在统一出口适配第三方 DOM，让编辑与展示共享正文和替换符的折行规则。
export function ReplaceDisplay({
  className,
  ...props
}: ComponentProps<typeof LibraryReplaceDisplay>) {
  return (
    <LibraryReplaceDisplay {...props} className={cn(styles.content, styles.display, className)} />
  )
}

export function ReplaceEditor({
  className,
  ...props
}: ComponentProps<typeof LibraryReplaceEditor>) {
  return <LibraryReplaceEditor {...props} className={cn(styles.content, className)} />
}
