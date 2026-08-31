// @vitest-environment jsdom

import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  DataSelectorDetailDrawer,
  DataSelectorDetailDrawerStackHost,
  useDataSelectorDialogLayer,
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

vi.mock("#/components/ui/alert-dialog.tsx", () => ({
  AlertDialog: ({
    children,
    open,
  }: React.PropsWithChildren<{ open: boolean }>) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  AlertDialogCancel: ({ children }: React.PropsWithChildren) => <button>{children}</button>,
}))

vi.mock("#/components/assistant-workbench/ui/assistant-resizable-embedded-renderer.tsx", () => ({
  AssistantResizableEmbeddedRenderer: ({ children }: React.PropsWithChildren) => (
    <div>{children}</div>
  ),
}))

function RootDetail({ onReturn }: { onReturn: () => void }) {
  const host = useDataSelectorDetailDrawerHost()

  return (
    <>
      <span data-testid="root-preserved">root portal owner</span>
      <button
        type="button"
        onClick={() =>
          host?.openDetail({
            key: "nested",
            title: "Nested detail",
            content: <NestedDetail />,
            onReturn,
          })
        }
      >
        open nested detail
      </button>
    </>
  )
}

function NestedDetail() {
  const host = useDataSelectorDetailDrawerHost()

  return (
    <button
      type="button"
      onClick={() =>
        host?.openDetail({
          key: "third",
          title: "Third detail",
          content: <ThirdDetail />,
        })
      }
    >
      open third detail
    </button>
  )
}

function ThirdDetail() {
  const host = useDataSelectorDetailDrawerHost()

  return (
    <button
      type="button"
      onClick={() =>
        host?.openDetail({
          key: "fourth",
          title: "Fourth detail",
          content: <div>Fourth content</div>,
        })
      }
    >
      open fourth detail
    </button>
  )
}

function DialogLayerProbe({
  name,
  onOpenChange = () => undefined,
}: {
  name: string
  onOpenChange?: (open: boolean) => void
}) {
  const layer = useDataSelectorDialogLayer({ open: true, onOpenChange })

  return (
    <div
      data-testid={name}
      data-state={layer.state}
      data-modal={String(layer.dialogProps.modal)}
      data-disable-pointer-dismissal={String(layer.dialogProps.disablePointerDismissal)}
      data-layer-class-name={layer.layerClassName}
    >
      <button type="button" onClick={layer.suspend}>
        suspend {name}
      </button>
      <button type="button" onClick={layer.resume}>
        resume {name}
      </button>
      <button type="button" onClick={() => layer.dialogProps.onOpenChange(false)}>
        dismiss {name}
      </button>
    </div>
  )
}

function DialogStackProbe() {
  const [secondOpen, setSecondOpen] = React.useState(false)

  return (
    <>
      <DialogLayerProbe name="first" />
      {secondOpen ? <DialogLayerProbe name="second" /> : null}
      <button type="button" onClick={() => setSecondOpen((current) => !current)}>
        toggle second
      </button>
    </>
  )
}

function SuspendCommitProbe({ onCommitted }: { onCommitted: (state: string | undefined) => void }) {
  const layer = useDataSelectorDialogLayer({ open: true, onOpenChange: () => undefined })

  return (
    <div data-testid="suspend-commit" data-state={layer.state}>
      <button
        type="button"
        onClick={() => {
          layer.suspend()
          onCommitted(screen.getByTestId("suspend-commit").dataset.state)
        }}
      >
        suspend and inspect
      </button>
    </div>
  )
}

describe("DataSelectorDetailDrawer", () => {
  it("commits the suspended layer before detail navigation can hide its activity", () => {
    const handleCommitted = vi.fn()
    render(<SuspendCommitProbe onCommitted={handleCommitted} />)

    fireEvent.click(screen.getByRole("button", { name: "suspend and inspect" }))

    expect(handleCommitted).toHaveBeenCalledWith("suspended")
  })

  it("keeps only the latest suspended selector visible while nested selectors change state", () => {
    render(<DialogStackProbe />)

    expect(screen.getByTestId("first").dataset.state).toBe("active")
    expect(screen.getByTestId("first").dataset.modal).toBe("true")
    expect(screen.getByTestId("first").dataset.disablePointerDismissal).toBe("false")
    expect(screen.getByTestId("first").dataset.layerClassName).toBe("")

    fireEvent.click(screen.getByRole("button", { name: "toggle second" }))
    expect(screen.getByTestId("first").dataset.state).toBe("suspended")
    expect(screen.getByTestId("first").dataset.modal).toBe("false")
    expect(screen.getByTestId("first").dataset.disablePointerDismissal).toBe("true")
    expect(screen.getByTestId("second").dataset.state).toBe("active")

    fireEvent.click(screen.getByRole("button", { name: "suspend second" }))
    expect(screen.getByTestId("first").dataset.state).toBe("hidden")
    expect(screen.getByTestId("second").dataset.state).toBe("suspended")

    fireEvent.click(screen.getByRole("button", { name: "resume second" }))
    expect(screen.getByTestId("first").dataset.state).toBe("suspended")
    expect(screen.getByTestId("second").dataset.state).toBe("active")

    fireEvent.click(screen.getByRole("button", { name: "toggle second" }))
    expect(screen.getByTestId("first").dataset.state).toBe("suspended")
  })

  it("ignores outside dismissal while suspended and accepts it after resuming", () => {
    const handleOpenChange = vi.fn()
    render(<DialogLayerProbe name="selector" onOpenChange={handleOpenChange} />)

    fireEvent.click(screen.getByRole("button", { name: "suspend selector" }))
    fireEvent.click(screen.getByRole("button", { name: "dismiss selector" }))
    expect(handleOpenChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "resume selector" }))
    fireEvent.click(screen.getByRole("button", { name: "dismiss selector" }))
    expect(handleOpenChange).toHaveBeenCalledOnce()
    expect(handleOpenChange).toHaveBeenCalledWith(false)
  })

  it("opens nested details in independent drawers and closes only the selected drawer", () => {
    const handleOpenChange = vi.fn()
    const handleReturn = vi.fn()
    const handleRootReturn = vi.fn()

    render(
      <>
        <DataSelectorDetailDrawer
          item={{
            key: "root",
            title: "Root detail",
            content: <RootDetail onReturn={handleReturn} />,
            onReturn: handleRootReturn,
          }}
          onOpenChange={handleOpenChange}
        />
        <DataSelectorDetailDrawerStackHost />
      </>,
    )

    expect(screen.getAllByTestId("sheet")).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "open nested detail" }))
    expect(screen.getByRole("heading", { name: "Nested detail" })).toBeTruthy()
    expect(screen.getByTestId("root-preserved")).toBeTruthy()
    expect(screen.getAllByTestId("sheet")).toHaveLength(2)

    fireEvent.click(screen.getByRole("button", { name: "open third detail" }))
    expect(screen.getAllByTestId("sheet")).toHaveLength(3)
    expect(screen.getByRole("heading", { name: "Third detail" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "open fourth detail" }))
    expect(screen.getAllByTestId("sheet")).toHaveLength(3)
    expect(screen.queryByRole("heading", { name: "Fourth detail" })).toBeNull()
    expect(screen.getByTestId("alert-dialog")).toBeTruthy()
    expect(screen.getByText("最多同时打开 3 个详情 Drawer，请关闭一个后再查看。")).toBeTruthy()

    fireEvent.click(screen.getAllByRole("button", { name: "close" }).at(-1)!)
    expect(screen.getAllByTestId("sheet")).toHaveLength(2)
    expect(screen.getByRole("heading", { name: "Nested detail" })).toBeTruthy()
    expect(handleReturn).not.toHaveBeenCalled()
    expect(handleOpenChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole("button", { name: "close" }).at(-1)!)
    expect(screen.getAllByTestId("sheet")).toHaveLength(1)
    expect(screen.getByRole("heading", { name: "Root detail" })).toBeTruthy()
    expect(handleReturn).toHaveBeenCalledOnce()

    fireEvent.click(screen.getAllByRole("button", { name: "close" }).at(-1)!)
    expect(handleOpenChange).toHaveBeenCalledWith(false)
    expect(handleRootReturn).toHaveBeenCalledOnce()
  })
})
