const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T00:00:00+08:00`)
  return (
    !Number.isNaN(time) && new Date(time + BEIJING_OFFSET_MS).toISOString().slice(0, 10) === value
  )
}

/** 日期控件按北京时间提交日初/日末，显式携带时区，避免把日历日误当成 UTC。 */
export function toDateBoundaryTimestamp(
  value: string | null | undefined,
  boundary: "start" | "end" = "start",
): string | null {
  const date = value?.trim() ?? ""
  if (!isCalendarDate(date)) return null
  return `${date}T${boundary === "end" ? "23:59:59.999" : "00:00:00.000"}+08:00`
}

/** DATE 值保留日历日；API 时间戳先折算为北京时间，再回填日期控件。 */
export function formatDateTimestampInput(
  value: string | number | Date | null | undefined,
  fallback = "",
): string {
  if (value == null || value === "") return fallback
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return isCalendarDate(value.trim()) ? value.trim() : fallback
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Date(date.getTime() + BEIJING_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * 日历日期字段兼容旧版用 UTC 日初/日末编码的值。
 * 新版北京时间边界归一化为 UTC 后是 16:00 / 15:59:59，不会命中旧格式。
 * 只用于日期字段；创建时间、活动时间等真实时刻使用 formatDateTimestampInput。
 */
export function formatDateBoundaryInput(
  value: string | number | Date | null | undefined,
  fallback = "",
): string {
  if (typeof value === "string") {
    const legacy =
      /^(\d{4}-\d{2}-\d{2})T(?:00:00:00(?:\.0+)?|23:59:59(?:\.9+)?)(?:Z|\+00:00)$/.exec(
        value.trim(),
      )
    if (legacy) return formatDateTimestampInput(legacy[1], fallback)
  }
  return formatDateTimestampInput(value, fallback)
}
