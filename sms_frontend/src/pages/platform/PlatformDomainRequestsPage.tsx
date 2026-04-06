import { useState, useEffect, useCallback } from 'react'
import { publicApiClient } from '../../api/publicClient'
import {
  Globe, CheckCircle, XCircle, Clock, Loader2, RefreshCw,
  CheckCheck, AlertTriangle, Filter,
} from 'lucide-react'

type DomainRequest = {
  id: number
  tenant_schema: string
  tenant_name: string
  requested_domain: string
  verification_token: string
  status: string
  status_display: string
  verification_attempts: number
  last_verification_attempt: string | null
  verified_at: string | null
  activated_at: string | null
  rejected_at: string | null
  rejection_reason: string
  requested_by_username: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:  'text-amber-400 bg-amber-400/10 border-amber-400/25',
  VERIFIED: 'text-sky-400 bg-sky-400/10 border-sky-400/25',
  ACTIVE:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  FAILED:   'text-rose-400 bg-rose-400/10 border-rose-400/25',
  REJECTED: 'text-red-400 bg-red-400/10 border-red-400/25',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'ACTIVE') return <CheckCircle size={12} />
  if (status === 'REJECTED' || status === 'FAILED') return <XCircle size={12} />
  if (status === 'PENDING') return <Clock size={12} />
  if (status === 'VERIFIED') return <CheckCheck size={12} />
  return null
}

export default function PlatformDomainRequestsPage() {
  const [requests, setRequests] = useState<DomainRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [acting, setActing] = useState<number | null>(null)
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter !== 'ALL' ? `?status=${filter}` : ''
      const res = await publicApiClient.get(`/platform/domain-requests/${params}`)
      setRequests(res.data as DomainRequest[])
    } catch {
      setError('Failed to load domain requests.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { void fetch() }, [fetch])

  const approve = async (id: number) => {
    setActing(id); setError(null); setSuccess(null)
    try {
      await publicApiClient.post(`/platform/domain-requests/${id}/approve/`)
      setSuccess(`Domain request #${id} approved and activated.`)
      void fetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Failed to approve request.')
    } finally {
      setActing(null)
    }
  }

  const reject = async () => {
    if (!rejectId) return
    setActing(rejectId); setError(null); setSuccess(null)
    try {
      await publicApiClient.post(`/platform/domain-requests/${rejectId}/reject/`, {
        reason: rejectReason,
      })
      setSuccess(`Domain request #${rejectId} rejected.`)
      setRejectId(null); setRejectReason('')
      void fetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Failed to reject request.')
    } finally {
      setActing(null)
    }
  }

  const FILTERS = ['ALL', 'PENDING', 'VERIFIED', 'ACTIVE', 'FAILED', 'REJECTED']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Globe size={18} className="text-emerald-400" />
            Domain Requests
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Review and activate school custom domain requests
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetch()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-slate-300 transition hover:opacity-80 disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-[12px] text-rose-300 flex items-start gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-xl px-4 py-3 text-[12px] text-emerald-300 flex items-start gap-2"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="text-[15px] font-bold text-white">Reject Domain Request #{rejectId}</h3>
            <p className="text-[12px] text-slate-400">Provide a reason for rejection (optional):</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Domain does not belong to this school"
              className="w-full rounded-xl px-3 py-2.5 text-[12px] text-white placeholder-slate-600 outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setRejectId(null); setRejectReason('') }}
                className="flex-1 rounded-xl py-2.5 text-[12px] font-semibold text-slate-300 transition hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void reject()}
                disabled={acting === rejectId}
                className="flex-1 rounded-xl py-2.5 text-[12px] font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
              >
                {acting === rejectId ? <Loader2 size={13} className="animate-spin mx-auto" /> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition"
            style={
              filter === f
                ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                : { background: 'rgba(255,255,255,0.03)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }
            }
          >
            <Filter size={10} className="inline mr-1" />
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-3 py-12 text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[13px]">Loading…</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center">
          <Globe size={28} className="text-slate-700 mx-auto mb-3" />
          <p className="text-[13px] text-slate-600">No domain requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div
              key={req.id}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-bold text-white font-mono">{req.requested_domain}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${STATUS_COLORS[req.status] ?? 'text-slate-400 border-slate-700'}`}>
                      <StatusIcon status={req.status} />
                      {req.status_display}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-400">
                    <span className="text-slate-300 font-semibold">{req.tenant_name}</span>
                    <span className="text-slate-600 ml-1.5">({req.tenant_schema})</span>
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-600">
                    <span>Requested by <span className="text-slate-400">{req.requested_by_username || '—'}</span></span>
                    <span>{new Date(req.created_at).toLocaleString()}</span>
                    {req.verification_attempts > 0 && (
                      <span>{req.verification_attempts} verification attempt{req.verification_attempts > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {req.verified_at && (
                    <p className="text-[11px] text-sky-500">
                      DNS verified {new Date(req.verified_at).toLocaleString()}
                    </p>
                  )}
                  {req.rejected_at && req.rejection_reason && (
                    <p className="text-[11px] text-rose-400">Reason: {req.rejection_reason}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {req.status === 'VERIFIED' && (
                    <button
                      type="button"
                      onClick={() => void approve(req.id)}
                      disabled={acting === req.id}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                    >
                      {acting === req.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Activate
                    </button>
                  )}
                  {(req.status === 'PENDING' || req.status === 'VERIFIED') && (
                    <button
                      type="button"
                      onClick={() => setRejectId(req.id)}
                      disabled={acting === req.id}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold text-rose-400 transition hover:opacity-80 disabled:opacity-50"
                      style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      <XCircle size={12} />
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
