import { useEffect, useState } from 'react'
import {
  Mail, Send, Eye, Trash2, CheckCircle2, Clock,
  AlertTriangle, FileText, Users, Loader2,
  ExternalLink, XCircle,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Campaign = { id: number; title: string; subject: string; status: string; created_at?: string; sent_count?: number; failed_count?: number }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray((value as { results?: T[] }).results) ? (value as { results: T[] }).results : []
}

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-slate-700/50 text-slate-300 border-slate-600',
  Scheduled: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  Sending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Sent: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Failed: 'bg-red-500/15 text-red-300 border-red-500/30',
}

export default function CommunicationEmailPage() {
  const [rows, setRows] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [previewId, setPreviewId] = useState<number | null>(null)
  const [emailTargets, setEmailTargets] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    subject: '',
    body_text: '',
    sender_name: 'St. Mary\'s Nairobi High School',
    sender_email: 'admin@stmarysnairobi.ac.ke',
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<Campaign[] | { results: Campaign[] }>('/communication/email-campaigns/')
      setRows(asArray(res.data))
    } catch {
      setError('Unable to load email campaigns.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const create = async () => {
    if (!form.title.trim() || !form.subject.trim()) { setError('Title and subject are required.'); return }
    setCreating(true)
    setError(null)
    try {
      await apiClient.post('/communication/email-campaigns/', form)
      setForm({ title: '', subject: '', body_text: '', sender_name: "St. Mary's Nairobi High School", sender_email: 'admin@stmarysnairobi.ac.ke' })
      setShowForm(false)
      setSuccess('Campaign created!')
      setTimeout(() => setSuccess(null), 3000)
      await load()
    } catch {
      setError('Unable to create campaign.')
    } finally {
      setCreating(false)
    }
  }

  const sendCampaign = async (id: number) => {
    const list = emailTargets.split(',').map(v => v.trim()).filter(Boolean)
    if (!list.length) { setError('Enter at least one email address to send to.'); return }
    setSendingId(id)
    setError(null)
    try {
      await apiClient.post(`/communication/email-campaigns/${id}/send/`, { emails: list })
      setSuccess(`Campaign sent to ${list.length} recipient${list.length !== 1 ? 's' : ''}!`)
      setTimeout(() => setSuccess(null), 4000)
      await load()
    } catch {
      setError('Unable to send campaign. Check that email is configured in Settings.')
    } finally {
      setSendingId(null)
    }
  }

  const doDelete = async (id: number) => {
    try {
      await apiClient.delete(`/communication/email-campaigns/${id}/`)
      setRows(prev => prev.filter(r => r.id !== id))
      setSuccess('Campaign deleted.')
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('Unable to delete campaign.')
    }
  }

  const stats = {
    total: rows.length,
    sent: rows.filter(r => r.status === 'Sent').length,
    draft: rows.filter(r => r.status === 'Draft').length,
    failed: rows.filter(r => r.status === 'Failed').length,
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <PageHero
        badge="COMMUNICATION"
        badgeColor="rose"
        title="Email Campaigns"
        subtitle="Create and send targeted email communications"
        icon="📧"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-300', bg: 'bg-slate-700/30' },
          { label: 'Sent', value: stats.sent, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Drafts', value: stats.draft, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Failed', value: stats.failed, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-white/[0.07] ${s.bg} px-4 py-3`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{s.label} Campaigns</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 size={14} />{success}
        </div>
      )}

      {/* Email targets bar */}
      <div className="flex items-center gap-3 rounded-xl glass-panel px-4 py-3">
        <Users size={14} className="text-slate-400 flex-shrink-0" />
        <input
          value={emailTargets}
          onChange={(e) => setEmailTargets(e.target.value)}
          placeholder="Recipient emails (comma-separated) — used when clicking Send on any campaign"
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2"><Mail size={14} /> New Email Campaign</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Campaign title (internal)"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <input
              value={form.subject}
              onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Email subject line"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <input
              value={form.sender_name}
              onChange={(e) => setForm(f => ({ ...f, sender_name: e.target.value }))}
              placeholder="Sender name"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <input
              value={form.sender_email}
              onChange={(e) => setForm(f => ({ ...f, sender_email: e.target.value }))}
              placeholder="Sender email"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <textarea
            value={form.body_text}
            onChange={(e) => setForm(f => ({ ...f, body_text: e.target.value }))}
            rows={6}
            placeholder="Email body text…"
            className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-400 hover:text-white transition">Cancel</button>
            <button onClick={create} disabled={creating} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-400 transition disabled:opacity-50">
              {creating ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} Save Draft
            </button>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Mail size={40} className="text-slate-700 mb-3" />
          <p className="text-sm font-semibold text-slate-400">No campaigns yet</p>
          <p className="text-xs text-slate-600 mt-1">Create your first email campaign to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <div key={c.id} className="rounded-2xl glass-panel overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-4 flex-wrap sm:flex-nowrap">
                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center">
                  <Mail size={15} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.title}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{c.subject}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[c.status] ?? STATUS_STYLES.Draft}`}>{c.status}</span>
                    {c.created_at && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-600"><Clock size={9} />{fmtDate(c.created_at)}</span>
                    )}
                    {c.sent_count != null && (
                      <span className="text-[10px] text-slate-500">Sent: {c.sent_count}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setPreviewId(previewId === c.id ? null : c.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 transition"
                  >
                    <Eye size={12} /> Preview
                  </button>
                  <button
                    onClick={() => sendCampaign(c.id)}
                    disabled={sendingId === c.id}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30 px-3 py-2 text-xs font-bold text-blue-300 hover:bg-blue-500/30 transition disabled:opacity-50"
                  >
                    {sendingId === c.id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                    {sendingId === c.id ? 'Sending…' : 'Send'}
                  </button>
                  <button
                    onClick={() => doDelete(c.id)}
                    className="h-8 w-8 rounded-xl border border-red-500/20 flex items-center justify-center hover:bg-red-500/10 transition"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              </div>
              {previewId === c.id && (
                <div className="border-t border-white/[0.07] px-4 pb-4 pt-3 bg-slate-950/40">
                  <div className="flex items-center gap-2 mb-2">
                    <ExternalLink size={11} className="text-slate-500" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Campaign Preview</p>
                    <button onClick={() => setPreviewId(null)} className="ml-auto">
                      <XCircle size={13} className="text-slate-500 hover:text-slate-300" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400"><strong className="text-slate-300">Subject:</strong> {c.subject}</p>
                  <p className="text-xs text-slate-400 mt-1"><strong className="text-slate-300">Status:</strong> {c.status}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
