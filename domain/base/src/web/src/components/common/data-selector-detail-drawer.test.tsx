// @vitest-environment jsdom

import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  DataSelectorDetailDrawer,
  useDataSelectorDetailDrawerHost,
} from "./data-selector-detail-drawer.tsx"

vi.mock("#/components/ui/sheet.tsx", () => ({
  Sheet: ({
    children,
    onOpenChange,
  }: React.PropsWithChildren<{ onOpenChange: (open: boolean) => void }>) => (
    <div data-testid="sheet">
      <button type="button" onClick={() => onOpenChange(false)}>
        close
      </button>
      {children}
    </div>
  ),
  SheetContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SheetHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SheetTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
}))

vi.mock("#/components/assistant-workbench/ui/assistant-resizable-embedded-renderer.tsx", () => ({
  AssistantResizableEmbeddedRenderer: ({ children }: React.PropsWithChildren) => (
    <div>{children}</div>
  ),
}))

function RootDetail({ onReturn }: { onReturn: () => void }) {
  const host = useDataSelectorDetailDrawerHost()

  return (
    <button
      type="button"
      onClick={() =>
        host?.openDetail({
          key: "nested",
          title: "Nested detail",
          content: <div>Nested content</div>,
          onReturn,
        })
      }
    >
      open nested detail
    </button>
  )
}

describe("DataSelectorDetailDrawer", () => {
  it("reuses one drawer and restores the previous detail when nested detail closes", () => {
    const handleOpenChange = vi.fn()
    const handleReturn = vi.fn()

    render(
      <DataSelectorDetailDrawer
        item={{
          key: "root",
          title: "Root detail",
          content: <RootDetail onReturn={handleReturn} />,
        }}
        onOpenChange={handleOpenChange}
      />,
    )

    expect(screen.getAllByTestId("sheet")).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "open nested detail" }))
    expect(screen.getByRole("heading", { name: "Nested detail" })).toBeTruthy()
    expect(screen.getAllByTestId("sheet")).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: "close" }))
    expect(screen.getByRole("heading", { name: "Root detail" })).toBeTruthy()
    expect(handleReturn).toHaveBeenCalledOnce()
    expect(handleOpenChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "close" }))
    expect(handleOpenChange).toHaveBeenCalledWith(false)
  })
})
