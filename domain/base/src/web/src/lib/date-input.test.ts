import { describe, expect, it } from 'vitest'

import {
  normalizeDateInputValue,
  parseDateInputValue,
} from './date-input.ts'

describe('date input', () => {
  it.each([
    ['2026-8-1', '2026-08-01'],
    ['2026/8/1', '2026-08-01'],
    ['2026.8.1', '2026-08-01'],
    ['2026年8月1日', '2026-08-01'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeDateInputValue(input)).toBe(expected)
  })

  it('rejects invalid calendar dates', () => {
    expect(normalizeDateInputValue('2026-02-30')).toBeNull()
    expect(parseDateInputValue('2026-02-30')).toBeUndefined()
  })

  it('keeps an empty value clearable', () => {
    expect(normalizeDateInputValue('')).toBe('')
  })
})
