import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import {
  ArrowRightLeft, Clock, CheckCircle2, XCircle, AlertCircle,
  ArrowDownCircle, ArrowUpCircle, ChevronRight, PackageSearch, Ban,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Transfer = {
  id: number
  transfer_type: string
  type_display: string
  entity_id: number
  entity_name: string
  from_tenant_id: string
  to_tenant_id: string
  status: string
  status_display: string
  reason: string
  fee_balance_cleared: boolean
  exam_in_progress: boolean
  mid_term: boolean
  initiated_by_name: string
  effective_date: string | null
  has_package: boolean
  created_at: string
}

type Stats = {
  pending: number
  approved_from: number
  approved_to: number
  completed: number
  rejected: number
  incoming: number
  outgoing: number
}

const STATUS_COLOR: Record<string, string> = {
  pending:       'text-yellow-400',
  approved_from: 'text-blue-400',
  approved_to:   'text-teal-400',
  completed:     'text-emerald-400',
  rejected:      'text-red-400',
  cancelled:     'text-slate-400',
}

const STATUS_BG: Record<string, string> = {
  pending:       'bg-yellow-500/10 border-yellow-500/20',
  approved_from: 'bg-blue-500/10 border-blue-500/20',
  approved_to:   'bg-teal-500/10 border-teal-500/20',
  completed:     'bg-emerald-500/10 border-emerald-500/20',
  rejected:      'bg-red-500/10 border-red-500/20',
  cancelled:     'bg-slate-500/10 border-slate-500/20',
}

const STATUS_ICON: Record<string, React.ElementType> = {
  pending:       Clock,
  approved_from: CheckCircle2,
  approved_to:   CheckCircle2,
  completed:     CheckCircle2,
  rejected:      XCircle,
  cancelled:     Ban,
}

export default function TransfersDashboardPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const tenantId = useAuthStore((s) => s.tenantId)

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState<string>('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [actionMsg, setActionMsg] = useState<{ id: number; msg: string; ok: boolean } | null>(null)

  const isAdmin = role === 'ADMIN' || role === 'TENANT_SUPER_ADMIN'

  const load = (status?: string) => {
    setLoading(true)
    setErr('')
    const params = status ? `?status=${status}` : ''
    apiClient.get(`/transfers/${params}`)
      .then((r) => {
        setTransfers(r.data.results || [])
        setStats(r.data.stats || null)
      })
      .catch(() => setErr('Failed to load transfers.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(filter || undefined) }, [filter])

  const doAction = async (id: number, action: 'approve-from' | 'approve-to' | 'reject' | 'cancel' | 'execute', reason?: string) => {
    setActionLoading(id)
    setActionMsg(null)
    try {
      const body = reason ? { reason } : {}
      await apiClient.post(`/transfers/${id}/${action}/`, body)
      setActionMsg({ id, msg: `Action "${action}" completed.`, ok: true })
      load(filter || undefined)
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Action failed.'
      setActionMsg({ id, msg: detail, ok: false })
    } finally {
      setActionLoading(null)
    }
  }

  const statCards = stats
    ? [
        { label: 'Pending',    value: stats.pending,       color: 'text-yellow-400', icon: Clock },
        { label: 'Incoming',   value: stats.incoming,      color: 'text-blue-400',   icon: ArrowDownCircle },
        { label: 'Outgoing',   value: stats.outgoing,      color: 'text-teal-400',   icon: ArrowUpCircle },
        { label: 'Completed',  value: stats.completed,     color: 'text-emerald-400',icon: CheckCircle2 },
        { label: 'Rejected',   value: stats.rejected,      color: 'text-red-400',    icon: XCircle },
      ]
    : []

  const FILTERS = [
    { key: '', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved_from', label: 'Awaiting Dest.' },
    { key: 'approved_to', label: 'Ready to Execute' },
    { key: 'completed', label: 'Completed' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        title="Transfer Management"
        subtitle="Track student and staff transfers across schools"
        icon={<ArrowRightLeft className="w-6 h-6 text-emerald-400" />}
        actions={
          isAdmin && (
            <button
              onClick={() => navigate('/modules/transfers/initiate')}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition"
            >
              <ArrowRightLeft className="w-4 h-4" />
              New Transfer
            </button>
          )
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statCards.map((c) => (
            <div key={c.label} style={GLASS} className="rounded-xl p-4 border">
              <c.icon className={`w-5 h-5 ${c.color} mb-2`} />
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-slate-400 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === f.key
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'border border-white/[0.07] text-slate-400 hover:text-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {err}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : transfers.length === 0 ? (
        <div style={GLASS} className="rounded-xl border p-10 text-center">
          <PackageSearch className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No transfers found.</p>
          {isAdmin && (
            <button
              onClick={() => navigate('/modules/transfers/initiate')}
              className="mt-4 text-sm text-emerald-400 hover:text-emerald-300"
            >
              Initiate your first transfer →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((t) => {
            const Icon = STATUS_ICON[t.status] || Clock
            const isOut = t.from_tenant_id === tenantId
            return (
              <div
                key={t.id}
                style={GLASS}
                className={`rounded-xl border p-4 transition hover:border-white/[0.12] ${STATUS_BG[t.status] || 'border'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-lg p-2 ${STATUS_BG[t.status]}`}>
                      <Icon className={`w-4 h-4 ${STATUS_COLOR[t.status]}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-100 text-sm">
                        {t.entity_name}
                        <span className="ml-2 text-xs font-normal text-slate-400">{t.type_display}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isOut
                          ? <>Outgoing → <strong className="text-slate-300">{t.to_tenant_id || 'Internal'}</strong></>
                          : <>Incoming ← <strong className="text-slate-300">{t.from_tenant_id}</strong></>
                        }
                        {t.effective_date && <> · Effective {t.effective_date}</>}
                      </p>
                      {t.reason && <p className="text-xs text-slate-500 mt-1 italic">"{t.reason}"</p>}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`text-xs rounded-full px-2 py-0.5 border ${STATUS_BG[t.status]} ${STATUS_COLOR[t.status]}`}>
                          {t.status_display}
                        </span>
                        {!t.fee_balance_cleared && (
                          <span className="text-xs rounded-full px-2 py-0.5 border border-orange-500/30 bg-orange-500/10 text-orange-400">
                            Fee balance owed
                          </span>
                        )}
                        {t.exam_in_progress && (
                          <span className="text-xs rounded-full px-2 py-0.5 border border-red-500/30 bg-red-500/10 text-red-400">
                            Exam in progress
                          </span>
                        )}
                        {t.mid_term && (
                          <span className="text-xs rounded-full px-2 py-0.5 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
                            Mid-term
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 items-center shrink-0">
                    {actionLoading === t.id && (
                      <span className="text-xs text-slate-400 animate-pulse">Processing…</span>
                    )}
                    {actionMsg?.id === t.id && (
                      <span className={`text-xs ${actionMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                        {actionMsg.msg}
                      </span>
                    )}

                    {isAdmin && t.status === 'pending' && (
                      <>
                        <button
                          onClick={() => doAction(t.id, 'approve-from')}
                          disabled={actionLoading === t.id}
                          className="text-xs rounded-lg px-3 py-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition"
                        >
                          Approve (Source)
                        </button>
                        <button
                          onClick={() => doAction(t.id, 'reject', 'Rejected by admin')}
                          disabled={actionLoading === t.id}
                          className="text-xs rounded-lg px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {isAdmin && t.status === 'approved_from' && (
                      <button
                        onClick={() => doAction(t.id, 'approve-to')}
                        disabled={actionLoading === t.id}
                        className="text-xs rounded-lg px-3 py-1.5 bg-teal-500/15 border border-teal-500/30 text-teal-400 hover:bg-teal-500/25 transition"
                      >
                        Approve (Dest.)
                      </button>
                    )}
                    {isAdmin && t.status === 'approved_to' && (
                      <button
                        onClick={() => doAction(t.id, 'execute')}
                        disabled={actionLoading === t.id}
                        className="text-xs rounded-lg px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition font-semibold"
                      >
                        Execute Transfer
                      </button>
                    )}
                    {t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'rejected' && (
                      <button
                        onClick={() => doAction(t.id, 'cancel', 'Cancelled by user')}
                        disabled={actionLoading === t.id}
                        className="text-xs rounded-lg px-3 py-1.5 border border-white/[0.07] text-slate-400 hover:text-slate-200 transition"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/modules/transfers/${t.id}`)}
                      className="text-xs rounded-lg px-3 py-1.5 border border-white/[0.07] text-slate-400 hover:text-slate-200 transition flex items-center gap-1"
                    >
                      Details <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
