import * as React from "react"
import { ChevronDown } from "lucide-react"
import type { ReplaceSuggestionSection, ReplaceTokenOption } from "@cew-lib/cyacle-replace-symbols"

import { useLanguageStore } from "../../../lib/i18n/language-store.ts"
import { Button } from "../../ui/button.tsx"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu.tsx"

export interface ReplaceEditorToolbarProps {
  api: { disabled: boolean; insertOption: (option: ReplaceTokenOption) => void }
  suggestionSections: Array<ReplaceSuggestionSection>
  tokens: Array<ReplaceTokenOption>
}

function TokenMenuItem({
  option,
  onInsert,
}: {
  option: ReplaceTokenOption
  onInsert: (option: ReplaceTokenOption) => void
}) {
  const handleInsert = React.useCallback(() => onInsert(option), [onInsert, option])
  return <DropdownMenuItem onClick={handleInsert}>{option.label}</DropdownMenuItem>
}

export function ReplaceEditorToolbar({
  api,
  suggestionSections,
  tokens,
}: ReplaceEditorToolbarProps) {
  const language = useLanguageStore()
  const placeholderSections = React.useMemo(
    () =>
      suggestionSections.flatMap((section) => {
        if (!Array.isArray(section.items)) return []
        const items = section.items.filter(
          (item) => item.kind === "token" && item.option.itemType !== "UNIT",
        )
        return items.length ? [{ ...section, items }] : []
      }),
    [suggestionSections],
  )
  const unitTokens = React.useMemo(
    () => tokens.filter((item) => item.itemType === "UNIT"),
    [tokens],
  )

  if (!placeholderSections.length && !unitTokens.length) return null

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      {placeholderSections.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="outline" size="sm" disabled={api.disabled} />}
          >
            {language === "en-US" ? "Text Placeholders" : "文本占位符"}
            <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={8} className="max-h-80 overflow-y-auto">
            {placeholderSections.map((section, index) => (
              <React.Fragment key={section.key}>
                {index ? <DropdownMenuSeparator /> : null}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{section.title}</DropdownMenuLabel>
                  {section.items.map((item) =>
                    item.kind === "token" ? (
                      <TokenMenuItem
                        key={item.key}
                        option={item.option}
                        onInsert={api.insertOption}
                      />
                    ) : null,
                  )}
                </DropdownMenuGroup>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {unitTokens.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="outline" size="sm" disabled={api.disabled} />}
          >
            {language === "en-US" ? "Common Units" : "常用单位"}
            <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={8} className="max-h-80 overflow-y-auto">
            <DropdownMenuGroup>
              {unitTokens.map((item) => (
                <TokenMenuItem
                  key={`${item.itemType}:${item.key}`}
                  option={item}
                  onInsert={api.insertOption}
                />
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
