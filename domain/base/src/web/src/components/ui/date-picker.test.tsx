// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DatePicker } from "./date-picker.tsx"

describe("DatePicker", () => {
  it("limits year navigation to the provided month range", () => {
    render(
      <DatePicker
        value="2026-12-31"
        startMonth={new Date(2026, 0, 1)}
        endMonth={new Date(2027, 11, 31)}
        onValueChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole("textbox"))

    const yearSelect = Array.from(document.querySelectorAll("select")).find(
      (select) =>
        Array.from(select.options).some((option) => option.value === "2027"),
    )
    const years = Array.from(yearSelect?.options ?? []).map(
      (option) => option.value,
    )

    // 年份下拉只保留传入范围内的年份，既能收窄列表，也保证能选到下一年。
    expect(years).toEqual(["2026", "2027"])
  })
})
