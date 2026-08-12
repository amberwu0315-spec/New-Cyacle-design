export function formatDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function parseDateInputValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return undefined

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(year, month - 1, day)

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined
}

export function normalizeDateInputValue(value: string) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return ''

  const match = /^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/.exec(
    trimmedValue,
  )
  if (!match) return null

  const [, yearText, monthText, dayText] = match
  const normalizedValue = `${yearText}-${monthText.padStart(2, '0')}-${dayText.padStart(2, '0')}`

  return parseDateInputValue(normalizedValue) ? normalizedValue : null
}
