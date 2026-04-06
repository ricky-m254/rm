import { Shield, FileCheck, AlertTriangle, Clock, User, Search } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type AuditAction = 'Updated Record' | 'Created Record' | 'Deleted Record' | 'Approved Leave' | 'Rejected Leave' | 'Modified Payroll' | 'Added Employee' | 'Changed Role'

type AuditEntry = {
  id: number
  logId: string
  user: string
  role: string
  action: AuditAction
  target: string
  module: string
  timestamp: string
  ipAddress: string
}

type ComplianceItem = { label: string; value: number; alert: boolean }

function asArr<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

function apiEntryToAudit(raw: Record<string, unknown>, idx: number): AuditEntry {
  return {
    id: Number(raw.id ?? idx),
    logId: String(raw.log_id ?? raw.reference ?? `LOG-${String(raw.id ?? idx).padStart(3, '0')}`),
    user: String(raw.user_display ?? raw.performed_by ?? raw.user ?? 'System'),
    role: String(raw.role ?? raw.user_role ?? '—'),
    action: (raw.action ?? raw.action_type ?? 'Updated Record') as AuditAction,
    target: String(raw.target ?? raw.object_repr ?? raw.description ?? '—'),
    module: String(raw.module ?? raw.content_type ?? '—'),
    timestamp: String(raw.timestamp ?? raw.created_at ?? '—').slice(0, 19).replace('T', ' '),
    ipAddress: String(raw.ip_address ?? raw.ip ?? '—'),
  }
}

const ACTION_COLOR: Record<AuditAction, string> = {
  'Updated Record': 'bg-sky-500/15 text-sky-300 border-sky-500/20',
  'Created Record': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Deleted Record': 'bg-rose-500/15 text-rose-300 border-rose-500/20',
  'Approved Leave': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Rejected Leave': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'Modified Payroll': 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  'Added Employee': 'bg-teal-500/15 text-teal-300 border-teal-500/20',
  'Changed Role': 'bg-orange-500/15 text-orange-300 border-orange-500/20',
}

export default function HrCompliancePage() {
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState('All')
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([])
  const [activeEmployees, setActiveEmployees] = useState<number | null>(null)

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/hr/audit-logs/', { params: { limit: 50, ordering: '-timestamp' } }),
      apiClient.get('/hr/compliance/'),
    ]).then(([auditRes, compRes]) => {
      if (auditRes.status === 'fulfilled') {
        const raw = asArr<Record<string, unknown>>(auditRes.value.data)
        setAuditLogs(raw.map((r, i) => apiEntryToAudit(r, i)))
      }
      if (compRes.status === 'fulfilled') {
        const data = compRes.value.data
        if (Array.isArray(data)) {
          const items = data as ComplianceItem[]
          setComplianceItems(items)
          const activeEmpItem = items.find(i => i.label === 'Active Employees')
          if (activeEmpItem) setActiveEmployees(activeEmpItem.value)
        } else if (data && typeof data === 'object') {
          const items: ComplianceItem[] = Object.entries(data as Record<string, number>).map(([label, value]) => ({
            label,
            value: Number(value),
            alert: Number(value) > 0,
          }))
          setComplianceItems(items)
        }
      }
    })
  }, [])

  const modules = ['All', ...Array.from(new Set(auditLogs.map(l => l.module)))]

  const filtered = auditLogs.filter(l => {
    const matchSearch = l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.target.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase())
    const matchModule = filterModule === 'All' || l.module === filterModule
    return matchSearch && matchModule
  })

  return (
    <div className="space-y-6">
      <PageHero
        title="Compliance & Audit Logs"
        subtitle="Complete audit trail of all HR actions — role-based access enforcement and regulatory compliance"
        icon={Shield}
        theme="violet"
        stats={[
          { label: 'Audit Entries', value: auditLogs.length },
          { label: 'Compliance Alerts', value: complianceItems.filter(c => c.alert && c.value > 0).length },
          { label: 'Active Staff', value: activeEmployees ?? '—' },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {complianceItems.length === 0 ? (
          <p className="text-sm text-slate-500 col-span-3 py-4">No compliance data available.</p>
        ) : complianceItems.map(item => (
          <div key={item.label} className={`flex items-start gap-3 rounded-2xl border p-4 ${item.alert && item.value > 0 ? 'border-amber-500/20 bg-amber-500/[0.06]' : 'border-emerald-500/20 bg-emerald-500/[0.05]'}`}>
            {item.alert && item.value > 0
              ? <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              : <FileCheck size={16} className="text-emerald-400 mt-0.5 shrink-0" />}
            <div>
              <p className={`text-sm font-semibold ${item.alert && item.value > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{item.value} {item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-violet-400" />
            <h3 className="font-display font-semibold text-sm">HR Audit Trail</h3>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search logs..."
                className="rounded-xl border border-white/[0.09] bg-white/[0.04] pl-8 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 w-44" />
            </div>
            <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
              className="rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none">
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-300 hover:text-white transition">Export CSV</button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-2.5 text-left">Log ID</th>
              <th className="px-4 py-2.5 text-left">User</th>
              <th className="px-4 py-2.5 text-left">Action</th>
              <th className="px-4 py-2.5 text-left">Target / Employee</th>
              <th className="px-4 py-2.5 text-left">Module</th>
              <th className="px-4 py-2.5 text-left">Timestamp</th>
              <th className="px-4 py-2.5 text-left">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map(log => (
              <tr key={log.id} className="hover:bg-white/[0.025] transition">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.logId}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-slate-600" />
                    <div>
                      <div className="text-white text-xs font-medium">{log.user}</div>
                      <div className="text-slate-600 text-[10px]">{log.role}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${ACTION_COLOR[log.action]}`}>{log.action}</span>
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs max-w-[180px] truncate">{log.target}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{log.module}</td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                <td className="px-4 py-3 text-xs font-mono text-slate-600">{log.ipAddress}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500 text-sm">No audit logs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
