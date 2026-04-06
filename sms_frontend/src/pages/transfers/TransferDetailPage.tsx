import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import {
  ArrowRightLeft, CheckCircle2, XCircle, AlertCircle,
  Package, ArrowLeft, Ban, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-yellow-400', approved_from: 'text-blue-400',
  approved_to: 'text-teal-400', completed: 'text-emerald-400',
  rejected: 'text-red-400', cancelled: 'text-slate-400',
}

export default function TransferDetailPage() {
  const { transferId } = useParams<{ transferId: string }>()
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const isAdmin = role === 'ADMIN' || role === 'TENANT_SUPER_ADMIN'

  const [transfer, setTransfer] = useState<any>(null)
  const [pkg, setPkg] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pkgOpen, setPkgOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const load = () => {
    setLoading(true)
    apiClient.get(`/transfers/${transferId}/`)
      .then((r) => {
        setTransfer(r.data)
        if (r.data.has_package) {
          apiClient.get(`/transfers/${transferId}/package/`).then((pr) => setPkg(pr.data)).catch(() => {})
        }
        if (r.data.transfer_type?.includes('student')) {
          apiClient.get(`/students/${r.data.entity_id}/transfer-history/`).then((hr) => setHistory(hr.data)).catch(() => {})
        } else {
          apiClient.get(`/staff/${r.data.entity_id}/transfer-history/`).then((hr) => setHistory(hr.data)).catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [transferId])

  const doAction = async (action: string, reason?: string) => {
    setActionLoading(true); setMsg(null)
    try {
      await apiClient.post(`/transfers/${transferId}/${action}/`, reason ? { reason } : {})
      setMsg({ text: `"${action}" completed.`, ok: true })
      load()
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.detail || 'Action failed.', ok: false })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.04]" />)}
    </div>
  )

  if (!transfer) return (
    <div className="text-center py-20 text-slate-500">Transfer not found.</div>
  )

  const steps = [
    { key: 'pending', label: 'Initiated', done: true },
    { key: 'approved_from', label: 'Source Approved', done: ['approved_from', 'approved_to', 'completed'].includes(transfer.status) },
    { key: 'approved_to', label: 'Dest. Approved', done: ['approved_to', 'completed'].includes(transfer.status) },
    { key: 'completed', label: 'Executed', done: transfer.status === 'completed' },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        title={`Transfer #${transfer.id}`}
        subtitle={`${transfer.type_display} · ${transfer.entity_name}`}
        icon={<ArrowRightLeft className="w-6 h-6 text-emerald-400" />}
        actions={
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />

      {msg && (
        <div className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg.text}
        </div>
      )}

      {/* Progress stepper */}
      {!['rejected', 'cancelled'].includes(transfer.status) && (
        <div style={GLASS} className="rounded-xl border p-5">
          <div className="flex items-center gap-0">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className={`flex flex-col items-center text-center flex-1 ${i > 0 ? 'min-w-0' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold
                    ${step.done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-600 text-slate-500'}`}>
                    {step.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <p className={`mt-1 text-[10px] font-medium ${step.done ? 'text-emerald-400' : 'text-slate-500'}`}>{step.label}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 mb-4 ${step.done ? 'bg-emerald-500/40' : 'bg-white/[0.06]'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {['rejected', 'cancelled'].includes(transfer.status) && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-2">
          {transfer.status === 'rejected' ? <XCircle className="w-5 h-5 text-red-400" /> : <Ban className="w-5 h-5 text-slate-400" />}
          <div>
            <p className={`font-semibold ${STATUS_COLOR[transfer.status]}`}>
              {transfer.status === 'rejected' ? 'Transfer Rejected' : 'Transfer Cancelled'}
            </p>
            {transfer.rejection_reason && <p className="text-xs text-slate-400 mt-0.5">{transfer.rejection_reason}</p>}
          </div>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div style={GLASS} className="rounded-xl border p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Transfer Details</h3>
          {[
            ['Entity', transfer.entity_name],
            ['Type', transfer.type_display],
            ['Status', <span className={`font-medium ${STATUS_COLOR[transfer.status]}`}>{transfer.status_display}</span>],
            ['From School', transfer.from_tenant_id],
            ['To School', transfer.to_tenant_id || '(Internal)'],
            ['Effective Date', transfer.effective_date || '—'],
            ['Initiated By', transfer.initiated_by_name || '—'],
            ['Executed At', transfer.executed_at ? new Date(transfer.executed_at).toLocaleString() : '—'],
            ['Reason', transfer.reason || '—'],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between gap-2 text-sm">
              <span className="text-slate-500 shrink-0">{label}</span>
              <span className="text-slate-200 text-right">{value}</span>
            </div>
          ))}
        </div>

        <div style={GLASS} className="rounded-xl border p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Flags & Approvals</h3>
          {[
            ['Fee Balance Cleared', transfer.fee_balance_cleared ? '✓ Yes' : '✗ Outstanding'],
            ['Exam in Progress', transfer.exam_in_progress ? '⚠ Yes' : 'No'],
            ['Mid-Term Transfer', transfer.mid_term ? '⚠ Yes' : 'No'],
            ['Source Approved By', transfer.approved_from_name || '—'],
            ['Dest. Approved By', transfer.approved_to_name || '—'],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between gap-2 text-sm">
              <span className="text-slate-500 shrink-0">{label}</span>
              <span className={`text-right ${String(value).startsWith('✗') ? 'text-orange-400' : String(value).startsWith('⚠') ? 'text-yellow-400' : 'text-slate-200'}`}>{value}</span>
            </div>
          ))}
          {(transfer.from_class || transfer.to_class) && (
            <>
              <div className="border-t border-white/[0.05] pt-3 text-xs font-semibold text-slate-400 uppercase">Internal Details</div>
              {transfer.from_class && <div className="flex justify-between text-sm"><span className="text-slate-500">From Class</span><span className="text-slate-200">{transfer.from_class} {transfer.from_stream}</span></div>}
              {transfer.to_class && <div className="flex justify-between text-sm"><span className="text-slate-500">To Class</span><span className="text-slate-200">{transfer.to_class} {transfer.to_stream}</span></div>}
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {isAdmin && (
        <div style={GLASS} className="rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Actions</h3>
          <div className="flex flex-wrap gap-2">
            {transfer.status === 'pending' && (
              <>
                <button onClick={() => doAction('approve-from')} disabled={actionLoading} className="rounded-lg px-4 py-2 bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 text-sm transition">Approve (Source School)</button>
                <button onClick={() => doAction('reject', 'Rejected by admin')} disabled={actionLoading} className="rounded-lg px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm transition">Reject</button>
              </>
            )}
            {transfer.status === 'approved_from' && (
              <button onClick={() => doAction('approve-to')} disabled={actionLoading} className="rounded-lg px-4 py-2 bg-teal-500/15 border border-teal-500/30 text-teal-400 hover:bg-teal-500/25 text-sm transition">Approve (Destination School)</button>
            )}
            {transfer.status === 'approved_to' && (
              <button onClick={() => doAction('execute')} disabled={actionLoading} className="rounded-lg px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-sm font-semibold transition">Execute Transfer Now</button>
            )}
            {!['completed', 'cancelled', 'rejected'].includes(transfer.status) && (
              <button onClick={() => doAction('cancel', 'Cancelled by admin')} disabled={actionLoading} className="rounded-lg px-4 py-2 border border-white/[0.07] text-slate-400 hover:text-slate-200 text-sm transition">Cancel Transfer</button>
            )}
          </div>
          {actionLoading && <p className="text-xs text-slate-400 mt-2 animate-pulse">Processing…</p>}
        </div>
      )}

      {/* Transfer Package */}
      {pkg && (
        <div style={GLASS} className="rounded-xl border p-5">
          <button className="flex items-center justify-between w-full" onClick={() => setPkgOpen((o) => !o)}>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-200">Transfer Package</span>
              <span className="text-xs text-slate-500">Generated {new Date(pkg.generated_at).toLocaleString()}</span>
            </div>
            {pkgOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {pkgOpen && (
            <div className="mt-4 rounded-xl bg-slate-950/60 p-4 overflow-x-auto">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap">{JSON.stringify(pkg.data_snapshot, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={GLASS} className="rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">School History</h3>
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h.id} className="flex justify-between text-sm border-b border-white/[0.04] pb-2">
                <div>
                  <p className="text-slate-200">{h.school_name || h.tenant_id}</p>
                  <p className="text-xs text-slate-500">{h.class_name} {h.stream} · {h.role} {h.department}</p>
                </div>
                <p className="text-xs text-slate-400 text-right">{h.start_date} → {h.end_date || 'present'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
