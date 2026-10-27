"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { enUS, zhCN } from "react-day-picker/locale"

import type { SupportedLanguage } from "#/lib/i18n/language-store.ts"
import { useLanguageStore } from "#/lib/i18n/language-store.ts"
import {
  formatDateInputValue,
  normalizeDateInputValue,
  parseDateInputValue,
} from "#/lib/date-input.ts"
import { Button } from "#/components/ui/button.tsx"
import { Calendar } from "#/components/ui/calendar.tsx"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "#/components/ui/input-group.tsx"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover.tsx"

const DEFAULT_MESSAGES: Record<
  SupportedLanguage,
  { clear: string; placeholder: string }
> = {
  "en-US": {
    clear: "Clear Date",
    placeholder: "Select date",
  },
  "zh-CN": {
    clear: "清除日期",
    placeholder: "请选择日期",
  },
}

export interface DatePickerProps
  extends Omit<
    React.ComponentProps<typeof InputGroupInput>,
    | "className"
    | "defaultValue"
    | "max"
    | "min"
    | "onBlur"
    | "onChange"
    | "type"
    | "value"
  > {
  value: string
  onValueChange: (value: string) => void
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  className?: string
  clearable?: boolean
  clearLabel?: string
  invalid?: boolean
  language?: SupportedLanguage
  maxDate?: Date
  minDate?: Date
  /** 日历可切换的最早月份；用于收窄年/月下拉列表的范围。 */
  startMonth?: Date
  /** 日历可切换的最晚月份；比当前年更晚时才能选到下一年。 */
  endMonth?: Date
}

function DatePicker({
  value,
  onValueChange,
  onBlur,
  className,
  clearable = true,
  clearLabel,
  disabled,
  invalid,
  language: languageOverride,
  maxDate,
  minDate,
  startMonth,
  endMonth,
  onClick: inputOnClick,
  onFocus: inputOnFocus,
  placeholder,
  ...inputProps
}: DatePickerProps) {
  const currentLanguage = useLanguageStore()
  const language = languageOverride ?? currentLanguage
  const messages = DEFAULT_MESSAGES[language]
  const [open, setOpen] = React.useState(false)
  const suppressFocusOpenRef = React.useRef(false)
  const selectedDate = React.useMemo(
    () => parseDateInputValue(value),
    [value],
  )
  const disabledDates = React.useMemo(() => {
    if (minDate && maxDate) return [{ before: minDate }, { after: maxDate }]
    if (minDate) return { before: minDate }
    if (maxDate) return { after: maxDate }
    return undefined
  }, [maxDate, minDate])

  const handleSelect = React.useCallback(
    (date: Date | undefined) => {
      if (!date) return

      suppressFocusOpenRef.current = true
      onValueChange(formatDateInputValue(date))
      setOpen(false)
    },
    [onValueChange],
  )
  const handleClear = React.useCallback(() => {
    suppressFocusOpenRef.current = true
    onValueChange("")
    setOpen(false)
  }, [onValueChange])
  const handleBlur = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      const normalizedValue = normalizeDateInputValue(value)
      if (normalizedValue !== null && normalizedValue !== value) {
        onValueChange(normalizedValue)
      }
      onBlur?.(event)
    },
    [onBlur, onValueChange, value],
  )

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <InputGroup className={className}>
          <InputGroupInput
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            className="tabular-nums"
            value={value}
            placeholder={placeholder ?? messages.placeholder}
            disabled={disabled}
            aria-invalid={invalid}
            onChange={(event) => onValueChange(event.currentTarget.value)}
            onBlur={handleBlur}
            {...inputProps}
            onFocus={(event) => {
              if (suppressFocusOpenRef.current) {
                suppressFocusOpenRef.current = false
              } else {
                setOpen(true)
              }
              inputOnFocus?.(event)
            }}
            onClick={(event) => {
              setOpen(true)
              inputOnClick?.(event)
            }}
          />
          <InputGroupAddon align="inline-end">
            <PopoverTrigger
              render={
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  disabled={disabled}
                  aria-label={placeholder ?? messages.placeholder}
                  onFocus={() => {
                    suppressFocusOpenRef.current = false
                  }}
                />
              }
            >
              <CalendarIcon className="size-4 opacity-70" />
            </PopoverTrigger>
          </InputGroupAddon>
        </InputGroup>
        <PopoverContent align="start" className="w-auto p-2">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            locale={language === "en-US" ? enUS : zhCN}
            selected={selectedDate}
            defaultMonth={selectedDate}
            startMonth={startMonth}
            endMonth={endMonth}
            disabled={disabledDates}
            onSelect={handleSelect}
          />
          {clearable && value ? (
            <div className="border-t px-1 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                disabled={disabled}
                onClick={handleClear}
              >
                {clearLabel ?? messages.clear}
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { DatePicker }
