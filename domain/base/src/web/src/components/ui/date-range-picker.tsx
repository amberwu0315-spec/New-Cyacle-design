'use client'

import * as React from 'react'
import type { Locale } from 'react-day-picker'
import { Calendar as CalendarIcon, Check } from 'lucide-react'

import { cn } from '#/lib/utils.ts'
import { Button } from '#/components/ui/button.tsx'
import { Calendar } from '#/components/ui/calendar.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover.tsx'

const DATE_RANGE_PICKER_INPUT_MAX_LENGTH = 10

type DateRangePickerInputKey = 'start' | 'end'
type DateRangePickerInputErrors = Record<DateRangePickerInputKey, string | null>

export function toDateRangePickerInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeDateRangePickerInput(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? ''

  if (trimmedValue === '') return ''

  const compactValue = trimmedValue.replace(/\s+/g, '')
  if (/^\d{8}$/.test(compactValue)) {
    return normalizeDateRangePickerInput(
      `${compactValue.slice(0, 4)}-${compactValue.slice(4, 6)}-${compactValue.slice(6, 8)}`,
    )
  }

  const separatorNormalizedValue = compactValue
    .replace(/[/.]/g, '-')
    .replace(/年/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
  const match = separatorNormalizedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)

  if (!match) return null

  const [, yearText, monthText, dayText] = match
  const normalizedValue = `${yearText}-${monthText.padStart(2, '0')}-${dayText.padStart(2, '0')}`
  const parsedDate = parseDateRangePickerInput(normalizedValue)

  return parsedDate ? toDateRangePickerInputValue(parsedDate) : null
}

export function sanitizeDateRangePickerInputDraft(value: string) {
  return value.replace(/[^\d-]/g, '').slice(0, DATE_RANGE_PICKER_INPUT_MAX_LENGTH)
}

function resolveDateRangePickerInput(
  value: string,
  label: string,
  invalidFormatMessage: (label: string) => string,
): { value: string; error: string | null } {
  const normalizedValue = normalizeDateRangePickerInput(value)

  if (normalizedValue === null) {
    return {
      value: value.trim(),
      error: invalidFormatMessage(label),
    }
  }

  return {
    value: normalizedValue,
    error: null,
  }
}

export function parseDateRangePickerInput(value: string | null | undefined) {
  const text = value?.trim() ?? ''
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)

  if (!match) return undefined

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const parsedDate = new Date(year, month - 1, day)

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return undefined
  }

  return parsedDate
}

export interface DateRangePickerPreset {
  label: string
  start: string
  end: string
}

export function buildDateRangeYearPresets({
  startYear = new Date().getFullYear(),
  count = 10,
  labelFormatter = (year) => String(year),
}: {
  startYear?: number
  count?: number
  labelFormatter?: (year: number) => string
} = {}): DateRangePickerPreset[] {
  return Array.from({ length: count }, (_, index) => {
    const year = startYear - index

    return {
      label: labelFormatter(year),
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    }
  })
}

export interface DateRangePickerProps {
  start: string
  end: string
  placeholder?: string
  ariaLabel?: string
  emptyLabel?: string
  separatorLabel?: string
  startLabel?: string
  endLabel?: string
  startShortLabel?: string
  endShortLabel?: string
  startAriaLabel?: string
  endAriaLabel?: string
  applyLabel?: string
  showPresets?: boolean
  presets?: Array<DateRangePickerPreset>
  presetTitle?: string
  presetLabelFormatter?: (year: number) => string
  invalidFormatMessage?: (label: string) => string
  calendarLocale?: Locale
  onChange: (value: { start: string; end: string }) => void
}

interface DateRangePickerPresetPanelProps {
  title: string
  presets: Array<DateRangePickerPreset>
  selectedStart: string
  selectedEnd: string
  onSelect: (preset: DateRangePickerPreset) => void
}

interface DateRangePickerDateInputProps {
  label: string
  value: string
  placeholder: string
  ariaLabel: string
  invalid: boolean
  onChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
  onEnter: () => void
}

function DateRangePickerDateInput({
  label,
  value,
  placeholder,
  ariaLabel,
  invalid,
  onChange,
  onFocus,
  onBlur,
  onEnter,
}: DateRangePickerDateInputProps) {
  return (
    <div className="relative min-w-0">
      <span className="pointer-events-none absolute left-2 top-1/2 flex h-4 -translate-y-1/2 items-center border-r pr-2 text-[11px] font-medium leading-none text-muted-foreground">
        {label}
      </span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onEnter()
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        maxLength={DATE_RANGE_PICKER_INPUT_MAX_LENGTH}
        className="h-8 rounded-md bg-background pl-[3.25rem] pr-2 text-xs tabular-nums md:text-xs"
      />
    </div>
  )
}

function DateRangePickerPresetPanel({
  title,
  presets,
  selectedStart,
  selectedEnd,
  onSelect,
}: DateRangePickerPresetPanelProps) {
  if (presets.length === 0) return null

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2 rounded-md bg-muted/20 p-2">
      <div className="flex h-5 min-w-0 items-center gap-2">
        <div className="shrink-0 text-xs font-medium leading-none text-muted-foreground">
          {title}
        </div>
        <div className="h-px min-w-0 flex-1 bg-border/70" />
      </div>
      <div className="grid max-h-[360px] min-h-0 grid-cols-1 gap-1.5 overflow-y-auto pr-1 md:max-h-[324px] md:grid-cols-2">
        {presets.map((preset) => {
          const selected = preset.start === selectedStart && preset.end === selectedEnd

          return (
            <button
              key={`${preset.label}-${preset.start}-${preset.end}`}
              type="button"
              aria-pressed={selected}
              className={cn(
                'relative flex h-10 min-w-0 items-center justify-center rounded-md border px-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:h-8',
                selected
                  ? 'border-primary/40 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                  : 'border-transparent bg-background/65 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground',
              )}
              onClick={() => onSelect(preset)}
            >
              <span className="truncate tabular-nums">{preset.label}</span>
              {selected ? (
                <Check className="absolute right-2 size-3.5" aria-hidden />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DateRangePicker({
  start,
  end,
  placeholder = 'Select date range',
  ariaLabel = 'Select date range',
  emptyLabel = 'Not selected',
  separatorLabel = 'to',
  startLabel = 'Start Date',
  endLabel = 'End Date',
  startShortLabel = 'Start',
  endShortLabel = 'End',
  startAriaLabel = 'Start Date',
  endAriaLabel = 'End Date',
  applyLabel = 'Apply',
  showPresets = false,
  presets,
  presetTitle = 'Year Presets',
  presetLabelFormatter,
  invalidFormatMessage = (label) => `${label} must use YYYY-MM-DD format`,
  calendarLocale,
  onChange,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectingEndDate, setSelectingEndDate] = React.useState(false)
  const [activeInput, setActiveInput] =
    React.useState<DateRangePickerInputKey>('start')
  const [startInputValue, setStartInputValue] = React.useState(start)
  const [endInputValue, setEndInputValue] = React.useState(end)
  const [inputErrors, setInputErrors] =
    React.useState<DateRangePickerInputErrors>({ start: null, end: null })
  const presetOptions = React.useMemo(
    () => presets ?? buildDateRangeYearPresets({ labelFormatter: presetLabelFormatter }),
    [presetLabelFormatter, presets],
  )
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(
    () => parseDateRangePickerInput(start) ?? parseDateRangePickerInput(end) ?? new Date(),
  )
  const selectedRange = React.useMemo(
    () => ({
      from: parseDateRangePickerInput(start),
      to: parseDateRangePickerInput(end),
    }),
    [end, start],
  )

  React.useEffect(() => {
    setStartInputValue((currentValue) =>
      currentValue === start ? currentValue : start,
    )
    setInputErrors((currentErrors) => ({ ...currentErrors, start: null }))
  }, [start])

  React.useEffect(() => {
    setEndInputValue((currentValue) =>
      currentValue === end ? currentValue : end,
    )
    setInputErrors((currentErrors) => ({ ...currentErrors, end: null }))
  }, [end])

  React.useEffect(() => {
    const nextVisibleMonth = selectedRange.from ?? selectedRange.to

    if (nextVisibleMonth) setVisibleMonth(nextVisibleMonth)
  }, [selectedRange.from, selectedRange.to])

  const updateInputValue = React.useCallback(
    (key: DateRangePickerInputKey, value: string) => {
      const nextValue = sanitizeDateRangePickerInputDraft(value)

      if (key === 'start') {
        setStartInputValue(nextValue)
      } else {
        setEndInputValue(nextValue)
      }

      setInputErrors((currentErrors) => ({ ...currentErrors, [key]: null }))
    },
    [],
  )
  const activateInput = React.useCallback(
    (key: DateRangePickerInputKey) => {
      setActiveInput(key)
      setSelectingEndDate(key === 'end')

      const inputValue = key === 'start' ? startInputValue : endInputValue
      const parsedDate = parseDateRangePickerInput(inputValue)

      if (parsedDate) setVisibleMonth(parsedDate)
    },
    [endInputValue, startInputValue],
  )
  const commitInputValue = React.useCallback(
    (key: DateRangePickerInputKey, value: string) => {
      const label = key === 'start' ? startLabel : endLabel
      const result = resolveDateRangePickerInput(value, label, invalidFormatMessage)

      if (result.error) {
        setInputErrors((currentErrors) => ({ ...currentErrors, [key]: result.error }))
        return false
      }

      const nextValue = result.value
      const parsedDate = parseDateRangePickerInput(nextValue)

      if (key === 'start') {
        setStartInputValue(nextValue)
        onChange({ start: nextValue, end })
      } else {
        setEndInputValue(nextValue)
        onChange({ start, end: nextValue })
      }

      if (parsedDate) setVisibleMonth(parsedDate)

      setInputErrors((currentErrors) => ({ ...currentErrors, [key]: null }))
      return true
    },
    [end, endLabel, invalidFormatMessage, onChange, start, startLabel],
  )
  const commitRangeAndClose = React.useCallback(() => {
    const startResult = resolveDateRangePickerInput(
      startInputValue,
      startLabel,
      invalidFormatMessage,
    )
    const endResult = resolveDateRangePickerInput(
      endInputValue,
      endLabel,
      invalidFormatMessage,
    )

    if (startResult.error || endResult.error) {
      setInputErrors({ start: startResult.error, end: endResult.error })
      return
    }

    let nextStartValue = startResult.value
    let nextEndValue = endResult.value

    if (nextStartValue && !nextEndValue) nextEndValue = nextStartValue
    if (!nextStartValue && nextEndValue) nextStartValue = nextEndValue

    const parsedStartDate = parseDateRangePickerInput(nextStartValue)
    const parsedEndDate = parseDateRangePickerInput(nextEndValue)

    if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
      const previousStartValue = nextStartValue
      nextStartValue = nextEndValue
      nextEndValue = previousStartValue
    }

    setStartInputValue(nextStartValue)
    setEndInputValue(nextEndValue)
    setInputErrors({ start: null, end: null })
    onChange({ start: nextStartValue, end: nextEndValue })

    const nextVisibleMonth =
      parseDateRangePickerInput(nextStartValue) ??
      parseDateRangePickerInput(nextEndValue)

    if (nextVisibleMonth) setVisibleMonth(nextVisibleMonth)

    setSelectingEndDate(false)
    setOpen(false)
  }, [endInputValue, endLabel, invalidFormatMessage, onChange, startInputValue, startLabel])
  const selectPreset = React.useCallback(
    (preset: DateRangePickerPreset) => {
      const nextStart = normalizeDateRangePickerInput(preset.start)
      const nextEnd = normalizeDateRangePickerInput(preset.end)

      if (!nextStart || !nextEnd) return

      setStartInputValue(nextStart)
      setEndInputValue(nextEnd)
      setInputErrors({ start: null, end: null })
      onChange({ start: nextStart, end: nextEnd })

      const nextVisibleMonth = parseDateRangePickerInput(nextStart)
      if (nextVisibleMonth) setVisibleMonth(nextVisibleMonth)

      setSelectingEndDate(false)
      setOpen(false)
    },
    [onChange],
  )
  const rangeLabel =
    start || end ? `${start || emptyLabel} ${separatorLabel} ${end || emptyLabel}` : ''
  const inputError = inputErrors.start ?? inputErrors.end

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setSelectingEndDate(false)
          setActiveInput('start')
        }
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={ariaLabel}
            className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-left text-sm outline-none transition-colors hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className={rangeLabel ? 'truncate' : 'truncate text-muted-foreground'}>
          {rangeLabel || placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="z-[80] max-h-[min(var(--available-height),calc(100vh-2rem))] w-[34rem] max-w-[calc(100vw-2rem)] gap-0 overflow-x-hidden overflow-y-auto p-0"
      >
        <div
          className={cn(
            'grid gap-3 p-3 items-stretch',
            showPresets
              ? 'grid-cols-[250px_minmax(9.5rem,1fr)] max-[30rem]:grid-cols-[250px]'
              : 'grid-cols-[250px]',
          )}
        >
          <div className={cn('min-w-0', showPresets && 'hidden md:block')}>
            <Calendar
              mode="range"
              className="w-[250px] p-0 [--cell-size:--spacing(6)] [&_.rdp-month]:gap-2 [&_.rdp-week]:mt-0.5"
              captionLayout="dropdown"
              locale={calendarLocale}
              selected={selectedRange}
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              onDayClick={(day) => {
                const clickedDate = toDateRangePickerInputValue(day)

                if (!selectingEndDate || activeInput === 'start') {
                  setStartInputValue(clickedDate)
                  setEndInputValue(clickedDate)
                  setInputErrors({ start: null, end: null })
                  onChange({ start: clickedDate, end: clickedDate })
                  setVisibleMonth(day)
                  setSelectingEndDate(true)
                  setActiveInput('end')
                  return
                }

                const currentStartValue = startInputValue || clickedDate
                const parsedStartDate = parseDateRangePickerInput(currentStartValue)
                const nextStartDate =
                  parsedStartDate && day < parsedStartDate ? clickedDate : currentStartValue
                const nextEndDate =
                  parsedStartDate && day < parsedStartDate ? currentStartValue : clickedDate

                setStartInputValue(nextStartDate)
                setEndInputValue(nextEndDate)
                setInputErrors({ start: null, end: null })
                onChange({ start: nextStartDate, end: nextEndDate })
                setVisibleMonth(day)
                setSelectingEndDate(false)
                setActiveInput('start')
                setOpen(false)
              }}
            />
          </div>

          {showPresets ? (
            <div className="min-w-0 md:h-full md:border-l md:pl-3">
              <DateRangePickerPresetPanel
                title={presetTitle}
                presets={presetOptions}
                selectedStart={start}
                selectedEnd={end}
                onSelect={selectPreset}
              />
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            'grid gap-2 border-t bg-muted/15 p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-center',
            showPresets && 'hidden md:grid',
          )}
        >
          <DateRangePickerDateInput
            label={startShortLabel}
            value={startInputValue}
            onChange={(value) => updateInputValue('start', value)}
            onFocus={() => activateInput('start')}
            onBlur={() => commitInputValue('start', startInputValue)}
            onEnter={() => commitInputValue('start', startInputValue)}
            placeholder="YYYY-MM-DD"
            ariaLabel={startAriaLabel}
            invalid={Boolean(inputErrors.start)}
          />

          <div className="hidden h-8 items-center text-xs font-medium text-muted-foreground sm:flex">
            {separatorLabel}
          </div>

          <DateRangePickerDateInput
            label={endShortLabel}
            value={endInputValue}
            onChange={(value) => updateInputValue('end', value)}
            onFocus={() => activateInput('end')}
            onBlur={() => commitInputValue('end', endInputValue)}
            onEnter={() => commitInputValue('end', endInputValue)}
            placeholder="YYYY-MM-DD"
            ariaLabel={endAriaLabel}
            invalid={Boolean(inputErrors.end)}
          />

          <Button type="button" size="default" className="w-full px-3 sm:w-auto" onClick={commitRangeAndClose}>
            {applyLabel}
          </Button>

          {inputError ? (
            <div className="text-xs leading-5 text-destructive sm:col-span-4">
              {inputError}
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
