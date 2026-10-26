import { describe, expect, it } from "vitest"
import {
  formatDateBoundaryInput,
  formatDateTimestampInput,
  toDateBoundaryTimestamp,
} from "./date-timestamp.ts"

describe("日期与带时区时间戳转换", () => {
  it("旧版 UTC 日期边界保持原日期，真实时刻仍按时区换算", () => {
    expect(formatDateBoundaryInput("2026-05-31T23:59:59.999Z")).toBe("2026-05-31")
    expect(formatDateBoundaryInput("2026-05-31T23:59:59Z")).toBe("2026-05-31")
    expect(formatDateTimestampInput("2026-05-31T23:59:59.999Z")).toBe("2026-06-01")
    expect(formatDateBoundaryInput("2026-04-29T16:00:00.000Z")).toBe("2026-04-30")
  })
  it("按北京时间提交整天的起止边界", () => {
    const start = toDateBoundaryTimestamp("2026-04-30")!
    const end = toDateBoundaryTimestamp("2026-05-31", "end")!
    expect(start).toBe("2026-04-30T00:00:00.000+08:00")
    expect(end).toBe("2026-05-31T23:59:59.999+08:00")
    expect(new Date(start).toISOString()).toBe("2026-04-29T16:00:00.000Z")
    expect(new Date(end).toISOString()).toBe("2026-05-31T15:59:59.999Z")
  })

  it.each(["2026-01-01", "2026-05-31", "2024-02-29"])(
    "服务端归一化 UTC 后 %s 仍能正确回显",
    (day) => {
      for (const boundary of ["start", "end"] as const) {
        const timestamp = toDateBoundaryTimestamp(day, boundary)!
        expect(formatDateTimestampInput(timestamp)).toBe(day)
        expect(formatDateTimestampInput(new Date(timestamp).toISOString())).toBe(day)
      }
    },
  )

  it("保留 DATE 字段，并按北京时间解析实际时间戳", () => {
    expect(formatDateTimestampInput("2026-04-30")).toBe("2026-04-30")
    expect(formatDateTimestampInput("2026-04-29T16:00:00Z")).toBe("2026-04-30")
    expect(formatDateTimestampInput("2026-04-30T23:59:59Z")).toBe("2026-05-01")
  })

  it("空值可清除，非法日期不会被自动滚动到下个月", () => {
    for (const value of ["", "invalid", "2026-02-30", "2026-13-01"]) {
      expect(toDateBoundaryTimestamp(value)).toBeNull()
      expect(formatDateTimestampInput(value)).toBe("")
    }
    expect(formatDateTimestampInput(null, "—")).toBe("—")
  })
})
