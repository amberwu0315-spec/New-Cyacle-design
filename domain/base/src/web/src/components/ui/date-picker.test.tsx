// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { DatePicker } from "./date-picker.tsx"

afterEach(cleanup)

describe("DatePicker", () => {
  it("renders a scrollable year dropdown that can reach the next year", () => {
    render(
      <DatePicker
        value="2026-12-31"
        language="en-US"
        endMonth={new Date(2027, 11, 31)}
        onValueChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole("textbox"))
    fireEvent.click(screen.getByRole("combobox", { name: /year/i }))

    const listbox = screen.getByRole("listbox")
    const years = within(listbox)
      .getAllByRole("option")
      .map((option) => option.textContent)

    // 年份列表是可滚动的长列表（默认往前 100 年），不是只有固定十几年。
    expect(years.length).toBeGreaterThan(50)
    // 当前年的下一年可以选。
    expect(years).toContain("2027")
    expect(years).toContain("2026")
  })

  it("navigates to the chosen year without closing the calendar", () => {
    render(
      <DatePicker
        value="2026-12-31"
        language="en-US"
        endMonth={new Date(2027, 11, 31)}
        onValueChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole("textbox"))
    fireEvent.click(screen.getByRole("combobox", { name: /year/i }))
    const option = screen.getByRole("option", { name: "2027" })
    fireEvent.pointerDown(option)
    fireEvent.click(option)

    // 年份切换后日历仍然打开（月份下拉还在），且年份触发器显示 2027。
    expect(screen.getByRole("combobox", { name: /month/i })).toBeTruthy()
    expect(
      screen.getByRole("combobox", { name: /year/i }).textContent,
    ).toContain("2027")
  })
})
