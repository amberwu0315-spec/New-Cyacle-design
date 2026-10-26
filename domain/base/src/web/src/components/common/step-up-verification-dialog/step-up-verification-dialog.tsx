import * as React from "react"
import { Loader2, ShieldCheck } from "lucide-react"

import { Alert, AlertDescription } from "#/components/ui/alert.tsx"
import { Button } from "#/components/ui/button.tsx"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx"
import { Field, FieldError, FieldLabel } from "#/components/ui/field.tsx"
import { Input } from "#/components/ui/input.tsx"
import { useTranslation } from "#/lib/i18n/index.ts"

/** 当前账号绑定手机号的脱敏展示信息。 */
export type StepUpVerificationChallenge = {
  /** 脱敏手机号，例如 138****8000 */
  phoneMasked: string
  /** 当前账号是否已绑定手机号 */
  bound: boolean
}

/** 发送验证码后返回的挑战数据。 */
export type StepUpVerificationCodeChallenge = StepUpVerificationChallenge & {
  /** 验证令牌，提交操作时回传 */
  token: string
}

/** 提交敏感操作时携带的二次验证参数。 */
export type StepUpVerificationValue = {
  token: string
  code: string
}

export type StepUpVerificationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 业务操作标题，例如“禁用账号验证” */
  title: string
  /** 业务操作说明，例如“确定禁用用户 xxx？该操作需要短信二次验证。” */
  description?: React.ReactNode
  /** 打开弹窗时读取当前账号绑定的手机号，不发送短信 */
  loadChallenge: () => Promise<StepUpVerificationChallenge>
  /** 向当前账号绑定的手机号发送验证码 */
  sendCode: () => Promise<StepUpVerificationCodeChallenge>
  /** 校验验证码并执行后续业务操作；抛出错误时在弹窗内提示失败 */
  onConfirm: (value: StepUpVerificationValue) => Promise<void>
  /** 验证并完成业务操作后的回调 */
  onVerified?: () => void
}

function readErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  if (typeof error === "string" && error.trim()) {
    return error
  }
  return fallback
}

/**
 * 后台敏感操作的短信二次验证弹窗。
 *
 * 只负责验证流程和状态展示；验证码发送、校验与业务动作由调用方注入，
 * 从 Base 公共入口导出供各 domain 复用。
 */
export function StepUpVerificationDialog({
  open,
  onOpenChange,
  title,
  description,
  loadChallenge,
  sendCode,
  onConfirm,
  onVerified,
}: StepUpVerificationDialogProps) {
  const { t, format } = useTranslation()
  const messages = t.common.stepUpVerification
  const codeInputId = React.useId()

  const [reloadKey, setReloadKey] = React.useState(0)
  const [challenge, setChallenge] =
    React.useState<StepUpVerificationChallenge | null>(null)
  const [challengeLoading, setChallengeLoading] = React.useState(false)
  const [challengeError, setChallengeError] = React.useState("")
  const [token, setToken] = React.useState("")
  const [code, setCode] = React.useState("")
  const [cooldown, setCooldown] = React.useState(0)
  const [sendPending, setSendPending] = React.useState(false)
  const [sendError, setSendError] = React.useState("")
  const [verifyPending, setVerifyPending] = React.useState(false)
  const [verifyError, setVerifyError] = React.useState("")

  // 调用方每次 render 都可能传入新的回调；用 ref 固定最新实现，
  // 避免重新打开弹窗或刷新手机号时因为函数身份变化而重复请求。
  const loadChallengeRef = React.useRef(loadChallenge)
  loadChallengeRef.current = loadChallenge
  const sendCodeRef = React.useRef(sendCode)
  sendCodeRef.current = sendCode

  React.useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    setChallenge(null)
    setChallengeError("")
    setToken("")
    setCode("")
    setCooldown(0)
    setSendPending(false)
    setSendError("")
    setVerifyPending(false)
    setVerifyError("")
    setChallengeLoading(true)

    loadChallengeRef
      .current()
      .then((next) => {
        if (!cancelled) {
          setChallenge(next)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setChallengeError(readErrorMessage(error, messages.phoneLoadFailed))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setChallengeLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
    // messages.phoneLoadFailed 只随语言变化，重新打开弹窗时不需要重新加载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reloadKey, messages.phoneLoadFailed])

  React.useEffect(() => {
    if (cooldown <= 0) {
      return
    }
    const timer = window.setTimeout(() => {
      setCooldown((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next && (sendPending || verifyPending)) {
        return
      }
      onOpenChange(next)
    },
    [onOpenChange, sendPending, verifyPending],
  )

  const handleRetryChallenge = React.useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  const handleSendCode = React.useCallback(async () => {
    setSendError("")
    setVerifyError("")
    setSendPending(true)
    try {
      const next = await sendCodeRef.current()
      setToken(next.token)
      setChallenge({ phoneMasked: next.phoneMasked, bound: next.bound })
      setCooldown(60)
    } catch (error) {
      setSendError(readErrorMessage(error, messages.sendFailed))
    } finally {
      setSendPending(false)
    }
  }, [messages.sendFailed])

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmedCode = code.trim()

      if (!trimmedCode) {
        setVerifyError(messages.codeRequired)
        return
      }
      if (!token) {
        setVerifyError(messages.sendFailed)
        return
      }

      setSendError("")
      setVerifyError("")
      setVerifyPending(true)
      try {
        await onConfirm({ token, code: trimmedCode })
        onVerified?.()
        onOpenChange(false)
      } catch (error) {
        setVerifyError(readErrorMessage(error, messages.verifyFailed))
      } finally {
        setVerifyPending(false)
      }
    },
    [
      code,
      messages.codeRequired,
      messages.sendFailed,
      messages.verifyFailed,
      onConfirm,
      onOpenChange,
      onVerified,
      token,
    ],
  )

  const bound = challenge?.bound ?? false
  const codeError = verifyError || sendError
  const phoneText = challengeLoading
    ? messages.phoneLoading
    : challenge?.bound
      ? challenge.phoneMasked
      : "—"
  const disableActions = sendPending || verifyPending
  const canSubmit = bound && Boolean(token) && code.trim().length > 0 && !disableActions

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form className="flex min-h-0 flex-col gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>

          <DialogBody className="grid gap-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">
                {messages.phoneLabel}
              </span>
              <span className="truncate text-sm font-medium tabular-nums">
                {phoneText}
              </span>
            </div>

            {challengeError ? (
              <Alert variant="destructive">
                <AlertDescription className="flex flex-wrap items-center gap-2">
                  <span>{challengeError}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleRetryChallenge}
                  >
                    {t.common.actions.retry}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            {!challengeLoading && challenge && !bound ? (
              <Alert variant="destructive">
                <AlertDescription>{messages.phoneUnbound}</AlertDescription>
              </Alert>
            ) : null}

            {bound ? (
              <Field data-invalid={Boolean(codeError) || undefined}>
                <FieldLabel htmlFor={codeInputId}>{messages.codeLabel}</FieldLabel>
                <div className="flex items-start gap-2">
                  <Input
                    id={codeInputId}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder={messages.codePlaceholder}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    disabled={disableActions}
                    aria-invalid={Boolean(codeError) || undefined}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => void handleSendCode()}
                    disabled={sendPending || cooldown > 0 || disableActions}
                  >
                    {sendPending ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : null}
                    {cooldown > 0
                      ? format(messages.resendCode, { seconds: cooldown })
                      : messages.sendCode}
                  </Button>
                </div>
                <FieldError>{codeError}</FieldError>
              </Field>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={disableActions}
            >
              {messages.cancel}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {verifyPending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : null}
              {verifyPending ? messages.verifying : messages.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
