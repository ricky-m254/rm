import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../../api/client'
import {
  Globe, Copy, CheckCircle, XCircle, Clock, RefreshCw, Loader2,
  AlertTriangle, Trash2, ExternalLink, Info, CheckCheck,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type DomainRequest = {
  id: number
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
  created_at: string
  dns_instructions: {
    record_type: string
    host: string
    value: string
    ttl: number
    note: string
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pending DNS Verification', color: 'text-amber-400 bg-amber-400/10 border-amber-400/25' },
    VERIFIED: { label: 'Verified — Awaiting Activation', color: 'text-sky-400 bg-sky-400/10 border-sky-400/25' },
    ACTIVE:   { label: 'Active', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25' },
    FAILED:   { label: 'Verification Failed', color: 'text-rose-400 bg-rose-400/10 border-rose-400/25' },
    REJECTED: { label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/25' },
  }
  const s = map[status] ?? { label: status, color: 'text-slate-400 bg-slate-400/10 border-slate-400/25' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border ${s.color}`}>
      {status === 'ACTIVE' && <CheckCircle size={11} />}
      {status === 'FAILED' || status === 'REJECTED' ? <XCircle size={11} /> : null}
      {status === 'PENDING' && <Clock size={11} />}
      {status === 'VERIFIED' && <CheckCheck size={11} />}
      {s.label}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="ml-2 flex-shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-80"
      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
    >
      {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
    </button>
  )
}

export default function SettingsDomainPage() {
  const [domainRequest, setDomainRequest] = useState<DomainRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [verifyResult, setVerifyResult] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiClient.get('/settings/domain/')
      setDomainRequest(res.data?.status ? res.data : null)
    } catch {
      setDomainRequest(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchStatus() }, [fetchStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain.trim()) return
    setSubmitting(true); setError(null); setSuccess(null)
    try {
      const res = await apiClient.post('/settings/domain/request/', { domain: newDomain.trim().toLowerCase() })
      setDomainRequest(res.data)
      setNewDomain('')
      setSuccess('Domain request created. Follow the DNS instructions below.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Failed to submit domain request.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async () => {
    setVerifying(true); setVerifyResult(null); setError(null)
    try {
      const res = await apiClient.post('/settings/domain/verify/')
      setDomainRequest(res.data)
      setVerifyResult(res.data.message ?? 'Verification attempted.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Verification request failed.')
    } finally {
      setVerifying(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this domain request? You can submit a new one anytime.')) return
    setCancelling(true); setError(null)
    try {
      await apiClient.delete('/settings/domain/')
      setDomainRequest(null)
      setSuccess('Domain request cancelled.')
    } catch {
      setError('Failed to cancel request.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12 text-slate-500">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-[13px]">Loading domain settings…</span>
      </div>
    )
  }

  const dns = domainRequest?.dns_instructions
  const canCancel = domainRequest?.status === 'PENDING' || domainRequest?.status === 'FAILED'

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Globe size={18} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-[22px] font-display font-bold text-white">Custom Domain</h1>
            <p className="text-[12px] text-slate-500">Connect your school's own domain to SmartCampus</p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl px-4 py-3.5 flex gap-3"
        style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
        <Info size={14} className="text-violet-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-semibold text-violet-300 mb-1">How custom domains work</p>
          <ol className="text-[11px] text-slate-400 space-y-0.5 list-decimal list-inside">
            <li>Enter your school's domain below (e.g. <code className="text-slate-300">portal.greenfieldschool.com</code>)</li>
            <li>Add the TXT record shown to your DNS provider</li>
            <li>Click "Check DNS" — once verified, the platform team will activate it</li>
            <li>After activation, your school loads at the custom domain automatically</li>
          </ol>
        </div>
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

      {/* Current request status */}
      {domainRequest ? (
        <div className="rounded-2xl p-5 space-y-5" style={GLASS}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Domain Request</p>
              <p className="text-[18px] font-bold text-white font-mono">{domainRequest.requested_domain}</p>
              <div className="mt-2">
                <StatusBadge status={domainRequest.status} />
              </div>
            </div>
            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold text-rose-400 transition hover:opacity-80 disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {cancelling ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Cancel
              </button>
            )}
          </div>

          {/* DNS Instructions — shown when pending/failed */}
          {dns && (domainRequest.status === 'PENDING' || domainRequest.status === 'FAILED') && (
            <div className="rounded-xl p-4 space-y-4"
              style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.18)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-amber-400" />
                <p className="text-[12px] font-semibold text-amber-300">DNS TXT Record Required</p>
              </div>
              <p className="text-[11px] text-slate-400">{dns.note}</p>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Type', value: dns.record_type },
                  { label: 'Host', value: dns.host },
                  { label: 'TTL', value: String(dns.ttl) },
                ].map(f => (
                  <div key={f.label} className="rounded-lg p-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">{f.label}</p>
                    <p className="text-[12px] font-mono text-white">{f.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg p-3 flex items-center justify-between gap-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Value</p>
                  <p className="text-[12px] font-mono text-emerald-300 break-all">{dns.value}</p>
                </div>
                <CopyButton text={dns.value} />
              </div>

              {verifyResult && (
                <div className="rounded-xl px-3 py-2.5 text-[12px] flex items-center gap-2 text-amber-300"
                  style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Clock size={13} />
                  {verifyResult}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifying}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  {verifying ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Check DNS
                </button>
                {domainRequest.verification_attempts > 0 && (
                  <p className="text-[11px] text-slate-600">
                    {domainRequest.verification_attempts} attempt{domainRequest.verification_attempts > 1 ? 's' : ''} made
                    {domainRequest.last_verification_attempt && ` · last ${new Date(domainRequest.last_verification_attempt).toLocaleTimeString()}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Verified — awaiting activation */}
          {domainRequest.status === 'VERIFIED' && (
            <div className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)' }}>
              <CheckCheck size={16} className="text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-sky-300 mb-1">DNS verified successfully!</p>
                <p className="text-[11px] text-slate-400">
                  Your domain ownership has been confirmed. The RynatySpace platform team will activate
                  it within 24 hours. Once active, your school will be accessible at{' '}
                  <strong className="text-white">{domainRequest.requested_domain}</strong>.
                </p>
                {domainRequest.verified_at && (
                  <p className="text-[10px] text-slate-600 mt-1">
                    Verified at {new Date(domainRequest.verified_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Active */}
          {domainRequest.status === 'ACTIVE' && (
            <div className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-emerald-300 mb-1">Custom domain is live!</p>
                <p className="text-[11px] text-slate-400">
                  Your school is now accessible at{' '}
                  <a
                    href={`https://${domainRequest.requested_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-300 hover:underline inline-flex items-center gap-1"
                  >
                    {domainRequest.requested_domain}
                    <ExternalLink size={10} />
                  </a>
                </p>
                {domainRequest.activated_at && (
                  <p className="text-[10px] text-slate-600 mt-1">
                    Activated on {new Date(domainRequest.activated_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Rejected */}
          {domainRequest.status === 'REJECTED' && (
            <div className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-red-300 mb-1">Domain request rejected</p>
                {domainRequest.rejection_reason && (
                  <p className="text-[11px] text-slate-400">{domainRequest.rejection_reason}</p>
                )}
                <button
                  type="button"
                  className="mt-2 text-[11px] text-emerald-400 hover:underline"
                  onClick={() => setDomainRequest(null)}
                >
                  Submit a new request →
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Submit new domain */
        <div className="rounded-2xl p-5" style={GLASS}>
          <h2 className="text-[14px] font-bold text-white mb-1">Connect a Custom Domain</h2>
          <p className="text-[12px] text-slate-500 mb-5">
            Enter the domain you want to use (e.g. <code className="text-slate-400">portal.greenfieldschool.com</code>).
            You must own and control the domain's DNS settings.
          </p>
          <form onSubmit={(e) => void handleSubmit(e)} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <input
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                placeholder="portal.myschool.com"
                className="w-full rounded-xl pl-9 pr-4 py-3 text-[13px] text-white placeholder-slate-600 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !newDomain.trim()}
              className="flex items-center gap-2 rounded-xl px-5 py-3 text-[12px] font-bold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
              Request Domain
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
