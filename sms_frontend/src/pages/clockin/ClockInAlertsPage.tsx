import { Bell, AlertTriangle, WifiOff, Clock, UserX, CheckCircle2, Settings } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { useState } from 'react'

type AlertSeverity = 'Critical' | 'Warning' | 'Info'
type AlertType = 'Device Offline' | 'Attendance Anomaly' | 'Late Arrival' | 'Absent Spike' | 'Manual Correction' | 'System'

type AlertItem = {
  id: number
  type: AlertType
  severity: AlertSeverity
  message: string
  detail: string
  timestamp: string
  resolved: boolean
  recipient: string
}

const ALERTS: AlertItem[] = [
  { id: 1, type: 'Device Offline', severity: 'Critical', message: 'Biometric Scanner B2 is offline', detail: 'Device in Block B corridor has not synced for 3 hours. Manual attendance override is active.', timestamp: '2026-03-17 09:00', resolved: false, recipient: 'IT Admin' },
  { id: 2, type: 'Absent Spike', severity: 'Critical', message: 'Unusual absence spike in Grade 8B', detail: '14 out of 38 students marked absent — 37% rate. Possible illness outbreak. Nurse notified.', timestamp: '2026-03-17 08:45', resolved: false, recipient: 'School Admin' },
  { id: 3, type: 'Late Arrival', severity: 'Warning', message: '5 staff members arrived late this morning', detail: 'Ms. Wanjiku, Mr. Kamau, Mr. Otieno, Ms. Achieng, Mr. Mwenda checked in after 08:05.', timestamp: '2026-03-17 08:30', resolved: false, recipient: 'HR Manager' },
  { id: 4, type: 'Manual Correction', severity: 'Info', message: 'Attendance record corrected for Brian Otieno', detail: 'HR Officer updated attendance from Absent to Present with supporting document.', timestamp: '2026-03-16 15:22', resolved: true, recipient: 'HR Manager' },
  { id: 5, type: 'Device Offline', severity: 'Warning', message: 'RFID Reader at Main Gate back online', detail: 'Device was offline for 18 minutes (07:42–08:00). Records synced successfully.', timestamp: '2026-03-16 08:01', resolved: true, recipient: 'IT Admin' },
  { id: 6, type: 'Attendance Anomaly', severity: 'Warning', message: 'Student scanned twice within 2 minutes', detail: 'Admission ADM-2022-031 (Hassan Mwenda) scanned at Gate A and Gate C simultaneously. Possible card sharing.', timestamp: '2026-03-15 07:58', resolved: false, recipient: 'Security' },
  { id: 7, type: 'System', severity: 'Info', message: 'Daily attendance report generated', detail: 'March 16 report: 98.2% students present, 94.3% staff present. Emailed to admin.', timestamp: '2026-03-16 18:00', resolved: true, recipient: 'School Admin' },
]

const SEVERITY_CONFIG: Record<AlertSeverity, { color: string; bg: string; icon: React.ElementType }> = {
  Critical: { color: 'text-rose-300 border-rose-500/20', bg: 'bg-rose-500/[0.07] border-rose-500/20', icon: AlertTriangle },
  Warning: { color: 'text-amber-300 border-amber-500/20', bg: 'bg-amber-500/[0.06] border-amber-500/20', icon: AlertTriangle },
  Info: { color: 'text-sky-300 border-sky-500/20', bg: 'bg-sky-500/[0.06] border-sky-500/20', icon: Bell },
}

const TYPE_ICON: Record<AlertType, React.ElementType> = {
  'Device Offline': WifiOff,
  'Attendance Anomaly': UserX,
  'Late Arrival': Clock,
  'Absent Spike': UserX,
  'Manual Correction': CheckCircle2,
  'System': Settings,
}

const NOTIFICATION_CONFIG = [
  { event: 'Device goes offline', channels: ['In-App', 'Email', 'SMS'], enabled: true },
  { event: 'Absence rate exceeds 15%', channels: ['In-App', 'Email'], enabled: true },
  { event: 'Late staff arrival', channels: ['In-App'], enabled: true },
  { event: 'Manual attendance correction', channels: ['In-App', 'Email'], enabled: true },
  { event: 'Daily attendance summary', channels: ['Email'], enabled: true },
  { event: 'Double-scan anomaly detected', channels: ['In-App', 'SMS'], enabled: false },
]

export default function ClockInAlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>(ALERTS)
  const [filter, setFilter] = useState<AlertSeverity | 'All' | 'Unresolved'>('All')

  const critical = alerts.filter(a => a.severity === 'Critical' && !a.resolved).length
  const warnings = alerts.filter(a => a.severity === 'Warning' && !a.resolved).length
  const unresolved = alerts.filter(a => !a.resolved).length

  const filtered = alerts.filter(a => {
    if (filter === 'Unresolved') return !a.resolved
    if (filter === 'All') return true
    return a.severity === filter
  })

  function resolve(id: number) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a))
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Alerts & Notifications"
        subtitle="Real-time attendance anomalies, device status, and automated notification management"
        icon={Bell}
        theme="rose"
        stats={[
          { label: 'Critical', value: critical },
          { label: 'Warnings', value: warnings },
          { label: 'Unresolved', value: unresolved },
          { label: 'Total Today', value: alerts.length },
        ]}
      />

      <div className="flex flex-wrap gap-2 items-center">
        {(['All', 'Unresolved', 'Critical', 'Warning', 'Info'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-xl px-4 py-1.5 text-sm font-medium transition border ${filter === s ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' : 'border-white/[0.07] text-slate-400 hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(alert => {
          const cfg = SEVERITY_CONFIG[alert.severity]
          const TypeIcon = TYPE_ICON[alert.type]
          return (
            <div key={alert.id} className={`rounded-2xl border p-5 transition ${alert.resolved ? 'opacity-50 border-white/[0.05] bg-white/[0.02]' : cfg.bg}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <TypeIcon size={18} className={`mt-0.5 shrink-0 ${alert.resolved ? 'text-slate-600' : cfg.color.split(' ')[0]}`} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${alert.resolved ? 'bg-slate-500/15 text-slate-400 border-slate-500/20' : cfg.color}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-slate-500">{alert.type}</span>
                      {alert.resolved && <span className="inline-flex items-center gap-1 text-xs text-emerald-500"><CheckCircle2 size={11} /> Resolved</span>}
                    </div>
                    <p className={`text-sm font-semibold ${alert.resolved ? 'text-slate-500' : 'text-white'}`}>{alert.message}</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{alert.detail}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
                      <span>🕐 {alert.timestamp}</span>
                      <span>→ {alert.recipient}</span>
                    </div>
                  </div>
                </div>
                {!alert.resolved && (
                  <button onClick={() => resolve(alert.id)}
                    className="shrink-0 rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/15 transition">
                    Resolve
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="glass-panel rounded-2xl p-10 text-center text-slate-500 text-sm">No alerts found.</div>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <Settings size={16} className="text-sky-400" />
          <h3 className="font-display font-semibold text-sm">Notification Configuration</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-2.5 text-left">Event / Trigger</th>
              <th className="px-4 py-2.5 text-left">Channels</th>
              <th className="px-4 py-2.5 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {NOTIFICATION_CONFIG.map((nc, i) => (
              <tr key={i} className="hover:bg-white/[0.025] transition">
                <td className="px-4 py-3 text-slate-300">{nc.event}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {nc.channels.map(ch => (
                      <span key={ch} className="rounded-lg bg-white/[0.06] border border-white/[0.07] px-2 py-0.5 text-xs text-slate-400">{ch}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${nc.enabled ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-slate-500/15 text-slate-500 border-slate-500/20'}`}>
                    {nc.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
