import { Switch } from '#/components/ui/switch.tsx'

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
  return (
    <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
      <Switch
        size="sm"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
      自动翻译
    </div>
  )
}
