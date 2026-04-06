import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UserPlus, ClipboardList, Star, CheckCircle2, ChevronRight,
  Users, TrendingUp, Calendar, Filter, AlertCircle,
} from 'lucide-react'
import { apiClient } from '../../api/client'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type SummaryResponse = {
  total: number
  stages: string[]
  counts: Record<string, number>
}

type FunnelResponse = {
  counts: Record<string, number>
  rates: Record<string, number>
}

type SourceRow = {
  source: string
  total: number
  applied: number
  conversion_pct: number
}

type ApplicationRow = {
  id: number
  application_number?: string
  student_first_name: string
  student_last_name: string
}

const STAGE_STYLES: Record<string, { color: string; bg: string; icon: typeof ClipboardList }> = {
  Inquiry: { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: ClipboardList },
  Submitted: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', icon: Filter },
  'Documents Received': { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: ClipboardList },
  'Interview Scheduled': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Calendar },
  Assessed: { color: '#a855f7', bg: 'rgba(168,85,247,0.12)', icon: Star },
  Admitted: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: TrendingUp },
  Enrolled: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
}

const QUICK_LINKS = [
  { label: 'Inquiries', to: '/modules/admissions/inquiries', color: '#94a3b8' },
  { label: 'Applications', to: '/modules/admissions/applications', color: '#0ea5e9' },
  { label: 'Assessments', to: '/modules/admissions/assessments', color: '#a855f7' },
  { label: 'Interviews', to: '/modules/admissions/interviews', color: '#f59e0b' },
  { label: 'Decisions', to: '/modules/admissions/decisions', color: '#f97316' },
  { label: 'Enrollment', to: '/modules/admissions/enrollment', color: '#10b981' },
  { label: 'Analytics', to: '/modules/admissions/analytics', color: '#6366f1' },
]

export default function AdmissionsDashboardPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null)
  const [sources, setSources] = useState<SourceRow[]>([])
  const [enrollmentReady, setEnrollmentReady] = useState<ApplicationRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [summaryRes, funnelRes, sourceRes, readyRes] = await Promise.all([
          apiClient.get<SummaryResponse>('/admissions/summary/'),
          apiClient.get<FunnelResponse>('/admissions/analytics/funnel/'),
          apiClient.get<{ sources?: SourceRow[] }>('/admissions/analytics/sources/'),
          apiClient.get<ApplicationRow[]>('/admissions/enrollment/ready/'),
        ])
        setSummary(summaryRes.data)
        setFunnel(funnelRes.data)
        setSources([...(sourceRes.data.sources ?? [])].sort((a, b) => b.total - a.total))
        setEnrollmentReady(readyRes.data ?? [])
      } catch {
        setError('Unable to load admissions dashboard data.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  const stageCards = useMemo(() => {
    const stages = summary?.stages ?? []
    const counts = summary?.counts ?? {}
    return stages.map((stage) => ({
      stage,
      count: counts[stage] ?? 0,
      style: STAGE_STYLES[stage] ?? { color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: ClipboardList },
    }))
  }, [summary])

  const topSource = sources[0] ?? null
  const conversionRate = funnel?.rates?.inquiry_to_application_pct ?? 0
  const acceptedCount = funnel?.counts?.accepted_total ?? 0
  const enrolledCount = funnel?.counts?.enrolled_total ?? 0
  const averageStageLoad = stageCards.length > 0
    ? Math.round(stageCards.reduce((sum, card) => sum + card.count, 0) / stageCards.length)
    : 0

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      ) : null}

      <div
        className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0e1420 0%, #1a0e1a 45%, #0e1a14 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 78% 45%, rgba(14,165,233,0.5) 0%, transparent 55%), radial-gradient(ellipse at 18% 75%, rgba(16,185,129,0.35) 0%, transparent 50%)',
          }}
        />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: 'rgba(14,165,233,0.2)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.35)' }}
              >
                ADMISSIONS · LIVE PIPELINE
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isLoading ? 'Loading pipeline' : `${summary?.total ?? 0} total applications`}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Student Admissions &<br />
              <span style={{ color: '#7dd3fc' }}>Intake Management</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-slate-300">
              {topSource
                ? `Top source: ${topSource.source} (${topSource.total} inquiries, ${topSource.conversion_pct}% conversion).`
                : 'Track every applicant from first inquiry through enrollment with live pipeline visibility.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:min-w-[260px]">
            {[
              { label: 'Applications', value: summary?.total ?? 0, color: '#0ea5e9' },
              { label: 'Accepted', value: acceptedCount, color: '#f97316' },
              { label: 'Enrolled', value: enrolledCount, color: '#10b981' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl px-3 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <p className="text-xl font-bold text-white">{item.value}</p>
                <p className="mt-0.5 text-[9px] text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={GLASS}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <Users size={13} className="text-sky-400" /> Admissions Pipeline
          </p>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {stageCards.map((stage, index) => (
            <div key={stage.stage} className="relative">
              <div className="rounded-xl p-4 text-center" style={{ background: stage.style.bg, border: `1px solid ${stage.style.color}30` }}>
                <stage.style.icon size={20} style={{ color: stage.style.color }} className="mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stage.count}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{stage.stage}</p>
              </div>
              {index < stageCards.length - 1 ? (
                <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ChevronRight size={14} className="text-slate-600" />
                </div>
              ) : null}
            </div>
          ))}
          {!isLoading && stageCards.length === 0 ? (
            <div className="col-span-full rounded-xl border border-white/5 bg-white/[0.018] p-4 text-sm text-slate-400">
              No admissions pipeline data available.
            </div>
          ) : null}
        </div>
        <div className="px-5 pb-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">Inquiry → Application conversion</p>
            <p className="text-[11px] font-bold text-emerald-400">{conversionRate}%</p>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(conversionRate, 100)}%`, background: '#10b981' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <UserPlus size={13} className="text-emerald-400" /> Module Navigation
            </p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="rounded-xl p-3 text-center hover:bg-white/[0.04] transition-colors"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: `${link.color}18` }}>
                  <ChevronRight size={14} style={{ color: link.color }} />
                </div>
                <p className="text-xs font-medium text-slate-300">{link.label}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <p className="text-xs font-bold text-emerald-300 mb-3">Key Metrics</p>
            {[
              { label: 'Inquiries', value: funnel?.counts?.inquiries_total ?? 0 },
              { label: 'Applications', value: funnel?.counts?.applications_total ?? 0 },
              { label: 'Shortlisted', value: funnel?.counts?.shortlisted_total ?? 0 },
              { label: 'Ready to enroll', value: enrollmentReady.length },
              { label: 'Average stage load', value: averageStageLoad },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between py-1.5 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                <span className="text-xs text-slate-400">{label}</span>
                <span className="text-xs font-bold text-white">{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4" style={GLASS}>
            <p className="text-xs font-bold text-slate-200 mb-3">Enrollment Ready</p>
            <div className="space-y-2">
              {enrollmentReady.slice(0, 4).map((application) => (
                <div key={application.id} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                  <p className="text-sm font-semibold text-white">
                    {application.student_first_name} {application.student_last_name}
                  </p>
                  <p className="text-[11px] text-slate-500">{application.application_number ?? `Application #${application.id}`}</p>
                </div>
              ))}
              {!isLoading && enrollmentReady.length === 0 ? (
                <p className="text-xs text-slate-500">No accepted applications are waiting for enrollment.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
