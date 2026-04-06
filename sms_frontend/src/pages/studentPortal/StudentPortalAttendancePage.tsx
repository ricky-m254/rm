import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type AttendanceSummary = {
  total_days: number
  present: number
  absent: number
  late: number
  attendance_rate: number
}

type AttendanceRecord = {
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | string
  remarks: string | null
}

export default function StudentPortalAttendancePage() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    Promise.allSettled([
      apiClient.get<AttendanceSummary | { summary: AttendanceSummary }>('/student-portal/attendance/summary/'),
      apiClient.get<AttendanceRecord[] | { records: AttendanceRecord[] }>('/student-portal/attendance/calendar/'),
    ]).then(([sumRes, recRes]) => {
      if (!mounted) return
      if (sumRes.status === 'fulfilled') {
        const d = sumRes.value.data
        setSummary('total_days' in d ? d : (d as any).summary ?? null)
      }
      if (recRes.status === 'fulfilled') {
        const d = recRes.value.data
        setRecords(Array.isArray(d) ? d : (d as any).records ?? [])
      }
      setIsLoading(false)
    }).catch(() => {
      if (mounted) { setError('Unable to load attendance.'); setIsLoading(false) }
    })
    return () => { mounted = false }
  }, [])

  const statusIcon = (s: string) => {
    if (s === 'PRESENT') return <CheckCircle2 size={14} className="text-emerald-400" />
    if (s === 'ABSENT') return <XCircle size={14} className="text-red-400" />
    return <AlertCircle size={14} className="text-amber-400" />
  }

  const statusColor = (s: string) => {
    if (s === 'PRESENT') return 'bg-emerald-500/15 text-emerald-300'
    if (s === 'ABSENT') return 'bg-red-500/15 text-red-300'
    return 'bg-amber-500/15 text-amber-300'
  }

  const rate = summary?.attendance_rate ?? (summary ? Math.round((summary.present / Math.max(summary.total_days, 1)) * 100) : null)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Attendance</h1>
        <p className="text-slate-500 text-sm mt-1">Your attendance record for this term</p>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {isLoading ? (
        <p className="text-sm text-slate-500 py-8 text-center">Loading attendance…</p>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Attendance Rate', value: `${rate ?? 0}%`, color: (rate ?? 0) >= 80 ? '#10b981' : '#ef4444' },
                { label: 'Present', value: summary.present, color: '#10b981' },
                { label: 'Absent', value: summary.absent, color: '#ef4444' },
                { label: 'Late', value: summary.late, color: '#f59e0b' },
              ].map(k => (
                <div key={k.label} className="rounded-2xl p-4" style={GLASS}>
                  <p className="text-xl font-bold font-mono" style={{ color: k.color }}>{String(k.value)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{k.label}</p>
                </div>
              ))}
            </div>
          )}

          {summary && (
            <div className="rounded-2xl p-5" style={GLASS}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-400">Attendance Rate</p>
                <p className="text-sm font-bold" style={{ color: (rate ?? 0) >= 80 ? '#10b981' : '#ef4444' }}>{rate ?? 0}%</p>
              </div>
              <div className="h-3 rounded-full bg-white/10">
                <div className="h-3 rounded-full transition-all duration-700"
                  style={{ width: `${rate ?? 0}%`, background: (rate ?? 0) >= 80 ? '#10b981' : '#ef4444' }} />
              </div>
              <p className="text-[10px] text-slate-600 mt-1">Minimum required: 80%</p>
            </div>
          )}

          {records.length > 0 && (
            <div className="rounded-2xl p-5" style={GLASS}>
              <h3 className="text-sm font-semibold text-slate-200 mb-4">Recent Attendance</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {records
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 60)
                  .map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-white/[0.04] last:border-0">
                      <div className="flex items-center gap-2.5">
                        {statusIcon(r.status)}
                        <span className="text-slate-400">
                          {new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.remarks && <span className="text-xs text-slate-600">{r.remarks}</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
