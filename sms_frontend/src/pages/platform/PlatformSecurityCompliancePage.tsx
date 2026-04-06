import { useEffect, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type Tenant = { id: number; name: string }
type SecurityIncident = {
  id: number
  title: string
  category: string
  tenant: number | null
  tenant_name?: string
  severity: string
  status: string
  detected_at: string
}
type ComplianceReport = {
  id: number
  report_type: string
  period_start: string
  period_end: string
  generated_by_username?: string
  generated_at: string
  payload: Record<string, unknown>
}

export default function PlatformSecurityCompliancePage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [incidents, setIncidents] = useState<SecurityIncident[]>([])
  const [reports, setReports] = useState<ComplianceReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    category: '',
    tenant: '',
    severity: 'MEDIUM',
    details: '',
  })
  const [reportForm, setReportForm] = useState({
    report_type: 'AUDIT',
    period_start: '',
    period_end: '',
  })

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    const [tenantResult, incidentResult, reportResult] = await Promise.allSettled([
      publicApiClient.get('/platform/tenants/'),
      publicApiClient.get('/platform/security/incidents/'),
      publicApiClient.get('/platform/security/compliance-reports/'),
    ])
    if (tenantResult.status === 'fulfilled') setTenants(normalizePaginatedResponse<Tenant>(tenantResult.value.data).items)
    if (incidentResult.status === 'fulfilled') setIncidents(normalizePaginatedResponse<SecurityIncident>(incidentResult.value.data).items)
    if (reportResult.status === 'fulfilled') setReports(normalizePaginatedResponse<ComplianceReport>(reportResult.value.data).items)
    const firstError = [tenantResult, incidentResult, reportResult].find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (firstError) setError(extractApiErrorMessage(firstError.reason, 'Unable to load security/compliance workspace.'))
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const createIncident = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/security/incidents/', {
        title: incidentForm.title.trim(),
        category: incidentForm.category.trim(),
        tenant: incidentForm.tenant ? Number(incidentForm.tenant) : null,
        severity: incidentForm.severity,
        details: incidentForm.details.trim(),
      })
      setIncidentForm({ title: '', category: '', tenant: '', severity: 'MEDIUM', details: '' })
      setMessage('Security incident created.')
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create security incident.'))
    }
  }

  const incidentAction = async (id: number, action: 'investigate' | 'resolve' | 'close') => {
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/security/incidents/${id}/${action}/`, {})
      setMessage(`Incident ${action} action completed.`)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, `Unable to ${action} incident.`))
    }
  }

  const generateReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/security/compliance-reports/generate/', {
        report_type: reportForm.report_type,
        period_start: reportForm.period_start,
        period_end: reportForm.period_end,
      })
      setMessage('Compliance report generated.')
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to generate compliance report.'))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Security & Compliance"
        subtitle="Security & Compliance management and overview."
        icon="📋"
      />
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}
      <section className="col-span-12 lg:col-span-6 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Security Incidents</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={createIncident}>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Title" value={incidentForm.title} onChange={(e) => setIncidentForm((p) => ({ ...p, title: e.target.value }))} required />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Category" value={incidentForm.category} onChange={(e) => setIncidentForm((p) => ({ ...p, category: e.target.value }))} />
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={incidentForm.tenant} onChange={(e) => setIncidentForm((p) => ({ ...p, tenant: e.target.value }))}>
            <option value="">Platform-wide</option>
            {tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={incidentForm.severity} onChange={(e) => setIncidentForm((p) => ({ ...p, severity: e.target.value }))}>
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <textarea className="sm:col-span-2 rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" rows={3} placeholder="Details" value={incidentForm.details} onChange={(e) => setIncidentForm((p) => ({ ...p, details: e.target.value }))} />
          <button type="submit" className="sm:col-span-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">Create Incident</button>
        </form>
        <div className="mt-4 space-y-2 text-sm">
          {incidents.slice(0, 12).map((row) => (
            <div key={row.id} className="rounded-lg border border-white/[0.07] bg-slate-950/60 p-3">
              <p className="font-semibold">{row.title}</p>
              <p className="text-xs text-slate-400">{row.category || 'General'} | {row.severity} | {row.status}</p>
              <div className="mt-2 space-x-2">
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void incidentAction(row.id, 'investigate')}>Investigate</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void incidentAction(row.id, 'resolve')}>Resolve</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void incidentAction(row.id, 'close')}>Close</button>
              </div>
            </div>
          ))}
          {isLoading ? <p className="text-slate-400">Loading incidents...</p> : null}
        </div>
      </section>
      <section className="col-span-12 lg:col-span-6 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Compliance Reports</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={generateReport}>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={reportForm.report_type} onChange={(e) => setReportForm((p) => ({ ...p, report_type: e.target.value }))}>
            {['AUDIT', 'ACCESS', 'SECURITY', 'BACKUP'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={reportForm.period_start} onChange={(e) => setReportForm((p) => ({ ...p, period_start: e.target.value }))} required />
          <input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={reportForm.period_end} onChange={(e) => setReportForm((p) => ({ ...p, period_end: e.target.value }))} required />
          <button type="submit" className="sm:col-span-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">Generate Report</button>
        </form>
        <div className="mt-4 space-y-2 text-sm">
          {reports.slice(0, 10).map((row) => (
            <details key={row.id} className="rounded-lg border border-white/[0.07] bg-slate-950/60 p-3">
              <summary className="cursor-pointer font-semibold">{row.report_type} | {row.period_start} to {row.period_end}</summary>
              <p className="mt-2 text-xs text-slate-400">Generated: {row.generated_at} by {row.generated_by_username ?? 'system'}</p>
              <pre className="mt-2 overflow-x-auto rounded border border-white/[0.07] bg-slate-950 p-2 text-xs text-slate-300">{JSON.stringify(row.payload, null, 2)}</pre>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
