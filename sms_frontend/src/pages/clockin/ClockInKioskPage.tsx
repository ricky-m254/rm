import { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { resolveApiBaseUrl } from '../../api/baseUrl'
import { Fingerprint, Keyboard, QrCode, Clock, CheckCircle2, XCircle, Wifi } from 'lucide-react'
import PageHero from '../../components/PageHero'

type ScanMode = 'fingerprint' | 'pin' | 'qr'

type ScanResponse = {
  event_type: 'IN' | 'OUT'
  is_late: boolean
  person: {
    display_name: string
    person_type: string
    fingerprint_id: string
    admission_number_or_employee_id: string
  }
  message: string
}

const SCHOOL_NAME = 'St. Mary Nairobi High School'
const PIN_DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

const GRACE_PERIOD_MINUTES = 7 // minutes after 7:00 AM before considered late

export default function ClockInKioskPage() {
  const [now, setNow] = useState(new Date())
  const [mode, setMode] = useState<ScanMode>('fingerprint')
  const [pin, setPin] = useState('')
  const [fpId, setFpId] = useState('')
  const [qrId, setQrId] = useState('')
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [recentScans, setRecentScans] = useState<Array<{name: string; type: string; event: string; time: string; late: boolean}>>([])
  const fpInputRef = useRef<HTMLInputElement>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-focus hidden inputs
  useEffect(() => {
    if (mode === 'fingerprint' && fpInputRef.current) fpInputRef.current.focus()
    if (mode === 'qr' && qrInputRef.current) qrInputRef.current.focus()
    const refocus = setInterval(() => {
      if (phase === 'idle') {
        if (mode === 'fingerprint') fpInputRef.current?.focus()
        if (mode === 'qr') qrInputRef.current?.focus()
      }
    }, 3000)
    return () => clearInterval(refocus)
  }, [mode, phase])

  const clearAfterDelay = useCallback((ms = 4500) => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current)
    scanTimeoutRef.current = setTimeout(() => {
      setScanResult(null); setScanError(null)
      setPhase('idle'); setPin(''); setFpId(''); setQrId('')
    }, ms)
  }, [])

  const doScan = useCallback(async (identifier: string) => {
    if (!identifier.trim()) return
    setPhase('scanning')
    try {
      const base = resolveApiBaseUrl().replace(/\/$/, '')
      const res = await axios.post<ScanResponse>(`${base}/api/clockin/kiosk/scan/`, { fingerprint_id: identifier })
      const r = res.data
      setScanResult(r)
      setPhase('success')
      setRecentScans(prev => [{
        name: r.person.display_name,
        type: r.person.person_type,
        event: r.event_type,
        time: now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true }),
        late: r.is_late,
      }, ...prev.slice(0, 8)])
      clearAfterDelay(5000)
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'ID not found in system.'
      setScanError(msg)
      setPhase('error')
      clearAfterDelay(3500)
    }
    setPin(''); setFpId(''); setQrId('')
  }, [clearAfterDelay, now])

  const handlePinDigit = (d: string) => {
    if (d === '⌫') { setPin(p => p.slice(0, -1)); return }
    if (!d) return
    const next = pin + d
    setPin(next)
    if (next.length >= 6) {
      setTimeout(() => doScan(next), 150)
    }
  }

  const timeStr = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const dateStr = now.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const h = now.getHours()
  const arrivalTime = new Date(now)
  arrivalTime.setHours(7, GRACE_PERIOD_MINUTES, 0, 0)
  const isSchoolHours = h >= 5 && h < 20

  const statusGlow = phase === 'success'
    ? (scanResult?.event_type === 'IN' ? '0 0 120px rgba(16,185,129,0.5)' : '0 0 120px rgba(14,165,233,0.5)')
    : phase === 'error' ? '0 0 120px rgba(239,68,68,0.4)'
    : '0 0 60px rgba(16,185,129,0.08)'

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden select-none"
      style={{ background: 'linear-gradient(160deg, #030811 0%, #060e1a 40%, #04100d 100%)' }}
      onClick={() => {
        if (mode === 'fingerprint') fpInputRef.current?.focus()
        if (mode === 'qr') qrInputRef.current?.focus()
      }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <PageHero
        badge="CLOCK-IN"
        badgeColor="emerald"
        title="Kiosk"
        subtitle="Self-service attendance check-in terminal"
        icon="⏰"
      />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[180px]" style={{ background: 'rgba(16,185,129,0.07)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[180px]" style={{ background: 'rgba(14,165,233,0.05)' }} />
        {phase === 'success' && (
          <div className="absolute inset-0 animate-pulse rounded-full blur-[200px]" style={{ background: scanResult?.event_type === 'IN' ? 'rgba(16,185,129,0.15)' : 'rgba(14,165,233,0.15)' }} />
        )}
        {phase === 'error' && (
          <div className="absolute inset-0 animate-pulse rounded-full blur-[200px]" style={{ background: 'rgba(239,68,68,0.1)' }} />
        )}
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* ── Header ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-8 py-5 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-950 font-black text-lg shadow-lg"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>R</div>
          <div>
            <p className="text-sm font-bold text-white font-display">{SCHOOL_NAME}</p>
            <p className="text-[10px] text-emerald-400/80 font-medium">RSM Biometric Attendance System</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400/70">ONLINE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wifi size={11} className="text-slate-600" />
            <span>Connected</span>
          </div>
        </div>
      </header>

      {/* ── Main central display ── */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 px-6 py-4 z-10">

        {/* Clock + Scan Card */}
        <div className="flex flex-col items-center gap-6 w-full lg:w-auto">
          {/* Big clock */}
          <div className="text-center">
            <p className="text-[5rem] sm:text-[7rem] font-mono font-bold text-white leading-none tabular-nums tracking-tight"
              style={{ textShadow: '0 0 40px rgba(16,185,129,0.4)' }}>
              {timeStr}
            </p>
            <p className="text-slate-400 text-base font-medium mt-2 uppercase tracking-[0.2em]">{dateStr}</p>
          </div>

          {/* Mode selector */}
          <div className="flex gap-2 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {([
              { key: 'fingerprint', icon: Fingerprint, label: 'Biometric' },
              { key: 'pin', icon: Keyboard, label: 'PIN Entry' },
              { key: 'qr', icon: QrCode, label: 'QR / Card' },
            ] as const).map(m => (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); setPhase('idle'); setPin(''); setScanResult(null); setScanError(null) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
                style={mode === m.key
                  ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', boxShadow: '0 0 0 1px rgba(16,185,129,0.3)' }
                  : { color: 'rgba(255,255,255,0.35)' }}
              >
                <m.icon size={13} />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Scan Card */}
          <div
            className="relative w-full max-w-md rounded-[2.5rem] transition-all duration-700 overflow-hidden"
            style={{
              background: phase === 'success'
                ? scanResult?.event_type === 'IN' ? 'rgba(16,185,129,0.08)' : 'rgba(14,165,233,0.08)'
                : phase === 'error' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.025)',
              border: `2px solid ${
                phase === 'success'
                  ? scanResult?.event_type === 'IN' ? 'rgba(16,185,129,0.5)' : 'rgba(14,165,233,0.5)'
                  : phase === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'
              }`,
              boxShadow: statusGlow,
              minHeight: 300,
            }}
          >
            {/* Hidden fingerprint input */}
            <input ref={fpInputRef} type="text" value={fpId}
              onChange={e => setFpId(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && fpId) doScan(fpId) }}
              className="opacity-0 absolute top-0 left-0 w-px h-px"
              tabIndex={-1}
              autoComplete="off"
            />
            {/* Hidden QR input */}
            <input ref={qrInputRef} type="text" value={qrId}
              onChange={e => setQrId(e.target.value)}
              onKeyDown={e => { if ((e.key === 'Enter' || qrId.length >= 10) && qrId) doScan(qrId) }}
              className="opacity-0 absolute top-0 left-0 w-px h-px"
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Idle state */}
            {phase === 'idle' && (
              <div className="flex flex-col items-center justify-center p-10 gap-6 min-h-[300px]">
                {mode === 'fingerprint' && (
                  <>
                    <div className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.2)' }}>
                      <Fingerprint size={40} className="text-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-2xl font-display font-semibold text-slate-200 text-center">Place Finger on Scanner</p>
                    <p className="text-sm text-slate-500 text-center">Position finger firmly on the biometric pad</p>
                    <div className="flex gap-1.5 mt-2">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-emerald-400/40 animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />
                      ))}
                    </div>
                  </>
                )}
                {mode === 'qr' && (
                  <>
                    <div className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(14,165,233,0.1)', border: '2px solid rgba(14,165,233,0.2)' }}>
                      <QrCode size={40} className="text-sky-400 animate-pulse" />
                    </div>
                    <p className="text-2xl font-display font-semibold text-slate-200 text-center">Scan QR Code or ID Card</p>
                    <p className="text-sm text-slate-500 text-center">Hold card near the scanner or scan QR code</p>
                    <div className="w-16 h-0.5 rounded-full bg-sky-400/30 animate-ping" />
                  </>
                )}
                {mode === 'pin' && (
                  <div className="w-full flex flex-col items-center gap-4">
                    <p className="text-lg font-display font-semibold text-slate-200">Enter Staff / Student ID</p>
                    {/* PIN display */}
                    <div className="flex gap-3 my-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="w-9 h-10 rounded-xl border flex items-center justify-center text-xl font-bold text-white transition-all"
                          style={{
                            background: i < pin.length ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                            borderColor: i < pin.length ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)',
                          }}>
                          {i < pin.length ? '●' : ''}
                        </div>
                      ))}
                    </div>
                    {/* PIN pad */}
                    <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs">
                      {PIN_DIGITS.map((d, i) => (
                        <button
                          key={i}
                          onClick={() => handlePinDigit(d)}
                          disabled={!d && d !== '0'}
                          className="rounded-2xl h-14 text-xl font-bold transition-all active:scale-95 disabled:opacity-0"
                          style={{
                            background: d === '⌫' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: d === '⌫' ? '#f87171' : 'rgba(255,255,255,0.9)',
                          }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Scanning state */}
            {phase === 'scanning' && (
              <div className="flex flex-col items-center justify-center p-10 gap-6 min-h-[300px]">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                <p className="text-xl font-display font-semibold text-slate-300 animate-pulse">Verifying Identity…</p>
              </div>
            )}

            {/* Success state */}
            {phase === 'success' && scanResult && (
              <div className="flex flex-col items-center p-8 gap-6 min-h-[300px] animate-in fade-in zoom-in duration-300">
                {/* Event badge */}
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl`}
                  style={{ background: scanResult.event_type === 'IN' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
                  <CheckCircle2 size={36} className="text-white" />
                </div>
                {/* Name */}
                <div className="text-center">
                  <p className="text-4xl font-display font-bold text-white mb-1">{scanResult.person.display_name}</p>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
                      style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>
                      {scanResult.person.person_type}
                    </span>
                    <span className="text-sm text-slate-400 font-mono">
                      #{scanResult.person.admission_number_or_employee_id}
                    </span>
                  </div>
                </div>
                {/* Status row */}
                <div className="flex gap-8 pt-2 border-t border-white/10 w-full justify-center">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Status</p>
                    <p className={`text-lg font-bold ${scanResult.event_type === 'IN' ? 'text-emerald-400' : 'text-sky-400'}`}>
                      CLOCKED {scanResult.event_type}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Arrival</p>
                    <p className={`text-lg font-bold ${scanResult.is_late ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {scanResult.is_late ? '⚠ LATE' : '✓ ON TIME'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Time</p>
                    <p className="text-lg font-bold text-white tabular-nums">
                      {now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                </div>
                {/* Welcome message */}
                <div className="w-full rounded-2xl py-3 px-4 text-center font-bold text-base"
                  style={{ background: scanResult.event_type === 'IN' ? 'rgba(16,185,129,0.15)' : 'rgba(14,165,233,0.15)', color: scanResult.event_type === 'IN' ? '#10b981' : '#0ea5e9' }}>
                  {scanResult.event_type === 'IN' ? `Welcome back! Have a great ${h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}.` : 'Safe journey home!'}
                </div>
              </div>
            )}

            {/* Error state */}
            {phase === 'error' && (
              <div className="flex flex-col items-center justify-center p-10 gap-6 min-h-[300px] animate-in fade-in duration-300">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <XCircle size={36} className="text-rose-400" />
                </div>
                <p className="text-2xl font-display font-bold text-rose-300">Scan Failed</p>
                <p className="text-slate-400 text-center text-sm max-w-xs">{scanError}</p>
                <p className="text-xs text-slate-600">Please try again or contact the administrator</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Attendance Wall — right side on large screens */}
        <div className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-emerald-400" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Recent Scans</p>
            </div>
            {recentScans.length === 0 ? (
              <div className="text-center py-8">
                <Fingerprint size={28} className="text-slate-700 mx-auto mb-3" />
                <p className="text-xs text-slate-600">Scans will appear here</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentScans.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-2.5 transition-all"
                    style={{
                      background: i === 0 ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${i === 0 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                      style={{ background: s.event === 'IN' ? 'rgba(16,185,129,0.3)' : 'rgba(14,165,233,0.3)' }}>
                      {s.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-200 truncate">{s.name}</p>
                      <p className="text-[9px] text-slate-600 truncate">{s.type} · {s.time}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: s.event === 'IN' ? 'rgba(16,185,129,0.15)' : 'rgba(14,165,233,0.15)', color: s.event === 'IN' ? '#34d399' : '#38bdf8' }}>
                        {s.event}
                      </span>
                      {s.late && <span className="text-[9px] font-bold text-amber-400">LATE</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats mini card */}
          <div className="rounded-2xl p-4 grid grid-cols-2 gap-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.07)' }}>
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">{recentScans.filter(s => s.event === 'IN').length}</p>
              <p className="text-[9px] text-slate-500 mt-1 font-medium uppercase tracking-wide">IN Today</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(245,158,11,0.07)' }}>
              <p className="text-2xl font-bold text-amber-400 tabular-nums">{recentScans.filter(s => s.late).length}</p>
              <p className="text-[9px] text-slate-500 mt-1 font-medium uppercase tracking-wide">Late</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="flex-shrink-0 flex items-center justify-between px-8 py-4 z-10 text-[10px] font-medium"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }}>
        <span>RSM – Rynatyschool Management System v3.0</span>
        <span>{isSchoolHours ? '🟢 School Hours Active' : '🔴 After School Hours'}</span>
        <span>Gate Security Biometric Portal</span>
      </footer>
    </div>
  )
}
