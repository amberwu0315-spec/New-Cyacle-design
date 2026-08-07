import { Switch } from '#/components/ui/switch.tsx'
import { useTranslation } from '#/lib/i18n/index.ts'

export function AutoTranslateControl({
  checked,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  const { t: messages } = useTranslation()

  return (
    <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
      <Switch
        size="sm"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
      {messages.common.autoTranslate.label}
    </div>
  )
}
