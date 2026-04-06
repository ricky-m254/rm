import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { apiClient } from '../api/client'
import { useAuthStore } from '../store/auth'

const DEMO_RESET_MINUTES = 360

export default function DemoBanner() {
  const [visible, setVisible] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(DEMO_RESET_MINUTES * 60)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tenantId = useAuthStore(s => s.tenantId)

  const isDemo = tenantId === 'demo_school'

  useEffect(() => {
    if (!isDemo) return
    const stored = sessionStorage.getItem('demo_session_start')
    const now = Date.now()
    if (!stored) {
      sessionStorage.setItem('demo_session_start', String(now))
    }
    timerRef.current = setInterval(() => {
      const start = Number(sessionStorage.getItem('demo_session_start') || now)
      const elapsed = Math.floor((Date.now() - start) / 1000)
      const remaining = Math.max(0, DEMO_RESET_MINUTES * 60 - elapsed)
      setSecondsLeft(remaining)
      if (remaining === 0) {
        handleReset()
      }
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isDemo])

  if (!isDemo || !visible) return null

  const minutes = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const pct = (secondsLeft / (DEMO_RESET_MINUTES * 60)) * 100
  const urgent = secondsLeft < 300

  const handleReset = async () => {
    setResetting(true)
    try {
      await apiClient.post('/school/demo/reset/')
      sessionStorage.setItem('demo_session_start', String(Date.now()))
      setSecondsLeft(DEMO_RESET_MINUTES * 60)
      setResetMsg('Demo data has been reset to original sample data.')
      setTimeout(() => setResetMsg(null), 4000)
    } catch {
      setResetMsg('Reset failed. Please try again.')
      setTimeout(() => setResetMsg(null), 3000)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div
      className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2 text-[11px] font-medium select-none"
      style={{
        background: urgent
          ? 'linear-gradient(90deg, #7c1d1d, #991b1b)'
          : 'linear-gradient(90deg, #1e3a5f, #164e63)',
        borderBottom: `1px solid ${urgent ? 'rgba(239,68,68,0.3)' : 'rgba(14,165,233,0.25)'}`,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle size={12} className={urgent ? 'text-rose-400 flex-shrink-0' : 'text-sky-400 flex-shrink-0'} />
        <span className={urgent ? 'text-rose-200' : 'text-sky-200'}>
          {resetMsg ?? (
            <>
              <span className="font-bold text-white">DEMO MODE</span>
              {' — '}All changes reset in{' '}
              <span className={`font-bold tabular-nums ${urgent ? 'text-rose-300' : 'text-sky-300'}`}>
                {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
            </>
          )}
        </span>
        <div
          className="hidden sm:block flex-shrink-0 rounded-full overflow-hidden"
          style={{ width: 48, height: 4, background: 'rgba(255,255,255,0.1)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${pct}%`,
              background: urgent ? '#f87171' : '#38bdf8',
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}
          title="Reset demo data now"
        >
          <RefreshCw size={11} className={resetting ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{resetting ? 'Resetting…' : 'Reset'}</span>
        </button>
        <button
          onClick={() => setVisible(false)}
          className="rounded-lg p-1 transition-all"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          title="Dismiss banner"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
