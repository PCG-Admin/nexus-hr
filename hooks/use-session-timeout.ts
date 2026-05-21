import { useEffect, useRef, useCallback } from "react"

const WARN_AFTER_MS  = 25 * 60 * 1000  // 25 min idle → show warning
const LOGOUT_AFTER_MS = 30 * 60 * 1000 // 30 min idle → force logout

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const

export function useSessionTimeout(
  onWarn: () => void,
  onLogout: () => void,
  active: boolean,
) {
  const warnTimerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onWarnRef      = useRef(onWarn)
  const onLogoutRef    = useRef(onLogout)

  // Keep refs in sync so timer callbacks always call the latest function
  useEffect(() => { onWarnRef.current   = onWarn   }, [onWarn])
  useEffect(() => { onLogoutRef.current = onLogout }, [onLogout])

  const clear = useCallback(() => {
    clearTimeout(warnTimerRef.current)
    clearTimeout(logoutTimerRef.current)
  }, [])

  const reset = useCallback(() => {
    clear()
    warnTimerRef.current   = setTimeout(() => onWarnRef.current(),   WARN_AFTER_MS)
    logoutTimerRef.current = setTimeout(() => onLogoutRef.current(), LOGOUT_AFTER_MS)
  }, [clear])

  useEffect(() => {
    if (!active) { clear(); return }

    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, reset, { passive: true }))
    reset()

    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, reset))
      clear()
    }
  }, [active, reset, clear])
}
