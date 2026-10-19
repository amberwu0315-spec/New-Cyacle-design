// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ReplaceSuggestionSection, ReplaceTokenOption } from "@cew-lib/cyacle-replace-symbols"
import { languageStore } from "../../../lib/i18n/language-store.ts"
import { ReplaceEditorToolbar } from "./replace-editor-toolbar.tsx"

const product: ReplaceTokenOption = {
  key: "product.name",
  label: "产品名称",
  itemType: "CTX_VAR",
  value: [{ value: "中性笔", itemType: "PLAIN" }],
}
const unit: ReplaceTokenOption = { key: "kg", label: "kg", itemType: "UNIT" }
const suggestionSections: Array<ReplaceSuggestionSection> = [
  {
    key: "base",
    title: "基础信息",
    items: [
      { kind: "token", key: "product", option: product },
      { kind: "token", key: "unit", option: unit },
    ],
  },
]
afterEach(() => {
  cleanup()
  languageStore.setLanguage("zh-CN")
})
describe("共用替换符工具栏", () => {
  it("文本按分组展示，单位单独展示，选择时返回完整替换符", async () => {
    const insertOption = vi.fn()
    render(
      <ReplaceEditorToolbar
        api={{ disabled: false, insertOption }}
        tokens={[product, unit]}
        suggestionSections={suggestionSections}
      />,
    )
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "文本占位符" }))
    })
    expect(screen.getByText("基础信息")).toBeTruthy()
    expect(screen.queryByRole("menuitem", { name: "kg" })).toBeNull()
    fireEvent.click(await screen.findByRole("menuitem", { name: "产品名称" }))
    expect(insertOption).toHaveBeenCalledWith(product)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "常用单位" }))
    })
    fireEvent.click(await screen.findByRole("menuitem", { name: "kg" }))
    expect(insertOption).toHaveBeenLastCalledWith(unit)
  })
  it("禁用状态传递给所有插入入口", () => {
    render(
      <ReplaceEditorToolbar
        api={{ disabled: true, insertOption: vi.fn() }}
        tokens={[product, unit]}
        suggestionSections={suggestionSections}
      />,
    )
    expect((screen.getByRole("button", { name: "文本占位符" }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect((screen.getByRole("button", { name: "常用单位" }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })
  it("跟随界面语言，并隐藏没有候选项的入口", () => {
    languageStore.setLanguage("en-US")
    const { rerender } = render(
      <ReplaceEditorToolbar
        api={{ disabled: false, insertOption: vi.fn() }}
        tokens={[unit]}
        suggestionSections={[]}
      />,
    )
    expect(screen.getByRole("button", { name: "Common Units" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Text Placeholders" })).toBeNull()
    rerender(
      <ReplaceEditorToolbar
        api={{ disabled: false, insertOption: vi.fn() }}
        tokens={[]}
        suggestionSections={[]}
      />,
    )
    expect(screen.queryByRole("button")).toBeNull()
  })
})
