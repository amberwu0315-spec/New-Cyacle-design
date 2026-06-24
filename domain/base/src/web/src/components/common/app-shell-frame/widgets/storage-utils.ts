import Cookies from 'js-cookie'

export function clampSidebarWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, width))
}

export function readStoredSidebarWidth({
  defaultWidth,
  maxWidth,
  minWidth,
  storageKey,
}: {
  defaultWidth: number
  maxWidth: number
  minWidth: number
  storageKey: string
}) {
  if (typeof window === 'undefined') {
    return defaultWidth
  }

  const storedWidth = Number(window.localStorage.getItem(storageKey))

  if (!Number.isFinite(storedWidth) || storedWidth <= 0) {
    return defaultWidth
  }

  return clampSidebarWidth(storedWidth, minWidth, maxWidth)
}

export function readStoredCollapsedGroups(storageKey: string) {
  if (typeof window === 'undefined') {
    return {}
  }

  const storedGroups = window.localStorage.getItem(storageKey)
  if (storedGroups === null) {
    return {}
  }

  try {
    const parsedGroups = JSON.parse(storedGroups) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(parsedGroups).filter(([, collapsed]) => collapsed === true),
    ) as Record<string, true>
  } catch {
    return {}
  }
}

export function getInitialIsMobile(mobileMediaQuery: string) {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(mobileMediaQuery).matches
}

export function readStoredSidebarOpen(
  sidebarCookieName: string | null,
  fallback: boolean,
) {
  if (!sidebarCookieName) {
    return fallback
  }

  const storedState = Cookies.get(sidebarCookieName)

  if (storedState === undefined) {
    return fallback
  }

  return storedState !== 'false'
}

export function writeStoredSidebarOpen(
  sidebarCookieName: string | null,
  sidebarCookieExpiresDays: number,
  open: boolean,
) {
  if (!sidebarCookieName) {
    return
  }

  Cookies.set(sidebarCookieName, String(open), {
    path: '/',
    expires: sidebarCookieExpiresDays,
    sameSite: 'none',
  })
}
