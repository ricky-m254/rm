import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const IDLE_TIMEOUT_MS = 15 * 60 * 1000

export default function IdleLogout() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
      return
    }

    const resetTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
      timerRef.current = window.setTimeout(() => {
        logout()
        navigate('/login')
      }, IDLE_TIMEOUT_MS)
    }

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ]

    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer))
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [isAuthenticated, logout, navigate])

  return null
}
