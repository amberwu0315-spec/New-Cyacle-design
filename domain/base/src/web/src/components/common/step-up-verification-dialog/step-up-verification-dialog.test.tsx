// @vitest-environment jsdom

import * as React from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { StepUpVerificationDialog } from "./step-up-verification-dialog.tsx"

vi.mock("#/components/ui/dialog.tsx", () => ({
  Dialog: ({ children, open }: React.PropsWithChildren<{ open: boolean }>) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  DialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  DialogBody: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}))

afterEach(() => {
  cleanup()
})

function renderDialog(overrides: Partial<React.ComponentProps<typeof StepUpVerificationDialog>> = {}) {
  const onOpenChange = vi.fn()
  const onVerified = vi.fn()
  const loadChallenge = vi.fn().mockResolvedValue({
    phoneMasked: "138****8000",
    bound: true,
  })
  const sendCode = vi.fn().mockResolvedValue({
    phoneMasked: "138****8000",
    bound: true,
    token: "token-1",
  })
  const onConfirm = vi.fn().mockResolvedValue(undefined)

  render(
    <StepUpVerificationDialog
      open
      onOpenChange={onOpenChange}
      title="禁用账号验证"
      description="确认禁用用户吗？"
      loadChallenge={loadChallenge}
      sendCode={sendCode}
      onConfirm={onConfirm}
      onVerified={onVerified}
      {...overrides}
    />,
  )

  return { loadChallenge, sendCode, onConfirm, onOpenChange, onVerified }
}

describe("StepUpVerificationDialog", () => {
  it("展示绑定手机号、发送验证码并提交验证", async () => {
    const callbacks = renderDialog()

    expect(await screen.findByText("138****8000")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "获取验证码" }))
    await waitFor(() => expect(callbacks.sendCode).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByPlaceholderText("请输入短信验证码"), {
      target: { value: "123456" },
    })
    fireEvent.click(screen.getByRole("button", { name: "验证并提交" }))

    await waitFor(() =>
      expect(callbacks.onConfirm).toHaveBeenCalledWith({
        token: "token-1",
        code: "123456",
      }),
    )
    expect(callbacks.onVerified).toHaveBeenCalledTimes(1)
    expect(callbacks.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("验证码校验失败时在当前弹窗内提示，不关闭弹窗", async () => {
    const callbacks = renderDialog({
      onConfirm: vi.fn().mockRejectedValue(new Error("验证码无效")),
    })

    await screen.findByText("138****8000")
    fireEvent.click(screen.getByRole("button", { name: "获取验证码" }))
    await waitFor(() => expect(callbacks.sendCode).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByPlaceholderText("请输入短信验证码"), {
      target: { value: "000000" },
    })
    fireEvent.click(screen.getByRole("button", { name: "验证并提交" }))

    expect(await screen.findByText("验证码无效")).toBeTruthy()
    expect(callbacks.onOpenChange).not.toHaveBeenCalledWith(false)
    expect(callbacks.onVerified).not.toHaveBeenCalled()
  })

  it("账号未绑定手机号时提示先绑定并禁止提交", async () => {
    renderDialog({
      loadChallenge: vi.fn().mockResolvedValue({
        phoneMasked: "",
        bound: false,
      }),
    })

    expect(
      await screen.findByText("当前账号未绑定手机号，请先绑定手机号后再操作。"),
    ).toBeTruthy()
    expect(
      (screen.getByRole("button", { name: "验证并提交" }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})
