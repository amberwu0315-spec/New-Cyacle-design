const EMPTY_VALUE = '--'

export function formatFileSize(value?: number | null, fallback = EMPTY_VALUE) {
  if (value == null || Number.isNaN(value) || value < 0) {
    return fallback
  }

  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`
  }

  if (value >= 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`
  }

  return `${Math.max(1, Math.round(value))} B`
}
