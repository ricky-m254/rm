import { useEffect, useState } from 'react'
import {
  Phone, Send, Wifi, WifiOff, CheckCircle2, XCircle, Clock,
  AlertTriangle, Loader2, Users, MessageSquare,
  Hash,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type SmsRow = { id: number; recipient_phone: string; channel: string; status: string; message: string; failure_reason?: string; created_at?: string }
type Balance = { provider_configured: boolean; balance: string; note?: string }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray((value as { results?: T[] }).results) ? (value as { results: T[] }).results : []
}

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const STATUS_STYLES: Record<string, { cls: string; icon: React.ElementType }> = {
  Sent: { cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: Send },
  Delivered: { cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
  Failed: { cls: 'bg-red-500/15 text-red-300 border-red-500/30', icon: XCircle },
  Pending: { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Clock },
}

const PRESET_MESSAGES = [
  { label: 'Fee Reminder', text: 'Dear Parent, this is a reminder that school fees for Term 1 2025 are due by 14th February 2025. Total: Ksh 36,000. Contact the bursar for payment plans. St. Mary\'s Nairobi High School.' },
  { label: 'Attendance Alert', text: 'Dear Parent, your child was absent from school today. Please contact the school at 0722 000 000. St. Mary\'s Nairobi High School.' },
  { label: 'Report Card', text: 'Dear Parent, your child\'s end of term report card is ready. Please collect it from the school office. St. Mary\'s Nairobi High School.' },
  { label: 'Meeting Notice', text: 'Dear Parent, you are invited to a parents\' meeting on Saturday 15th February 2025 at 9:00 AM. Your attendance is highly valued. St. Mary\'s Nairobi High School.' },
]

export default function CommunicationSmsPage() {
  const [rows, setRows] = useState<SmsRow[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [phones, setPhones] = useState('')
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState('SMS')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('All')

  const load = async () => {
    setLoading(true)
    try {
      const [smsRes, balRes] = await Promise.all([
        apiClient.get<SmsRow[] | { results: SmsRow[] }>('/communication/sms/'),
        apiClient.get<Balance>('/communication/sms/balance/'),
      ])
      setRows(asArray(smsRes.data))
      setBalance(balRes.data)
    } catch {
      setError('Unable to load SMS data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const send = async () => {
    const list = phones.split(',').map(v => v.trim()).filter(Boolean)
    if (!list.length) { setError('Enter at least one phone number.'); return }
    if (!message.trim()) { setError('Message cannot be empty.'); return }
    if (message.length > 160) { setError('Message exceeds 160 characters.'); return }
    setSending(true)
    setError(null)
    try {
      await apiClient.post('/communication/sms/send/', { phones: list, message: message.trim(), channel })
      setMessage('')
      setPhones('')
      setSuccess(`${channel} sent to ${list.length} recipient${list.length !== 1 ? 's' : ''}!`)
      setTimeout(() => setSuccess(null), 4000)
      await load()
    } catch {
      setError('Failed to send message. Check SMS gateway configuration in Settings.')
    } finally {
      setSending(false)
    }
  }

  const displayed = statusFilter === 'All' ? rows : rows.filter(r => r.status === statusFilter)
  const charCount = message.length
  const charLimit = 160

  return (
    <div className="space-y-5 pb-8">
      <PageHero
        badge="COMMUNICATION"
        badgeColor="rose"
        title="SMS Campaigns"
        subtitle="Send bulk SMS to students, parents and staff"
        icon="📣"
      />
      {/* Header */}

      {/* Gateway Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${balance?.provider_configured ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/[0.09] glass-panel'}`}>
          {balance?.provider_configured
            ? <Wifi size={18} className="text-emerald-400 flex-shrink-0" />
            : <WifiOff size={18} className="text-slate-500 flex-shrink-0" />
          }
          <div>
            <p className="text-xs font-bold text-slate-300">Gateway Status</p>
            <p className={`text-sm font-semibold ${balance?.provider_configured ? 'text-emerald-400' : 'text-slate-500'}`}>
              {balance?.provider_configured ? 'Connected' : 'Not Configured'}
            </p>
          </div>
        </div>
        <div className="rounded-2xl glass-panel p-4 flex items-center gap-3">
          <Hash size={18} className="text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-300">SMS Balance</p>
            <p className="text-sm font-semibold text-amber-400">{balance?.balance ?? 'N/A'}</p>
          </div>
        </div>
        <div className="rounded-2xl glass-panel p-4 flex items-center gap-3">
          <MessageSquare size={18} className="text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-300">Messages Sent</p>
            <p className="text-sm font-semibold text-blue-400">{rows.filter(r => r.status === 'Delivered').length} delivered</p>
          </div>
        </div>
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
      {balance?.note && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-slate-400">
          <AlertTriangle size={12} className="text-blue-400 flex-shrink-0" />{balance.note}
        </div>
      )}

      {/* Compose */}
      <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Send size={15} className="text-emerald-400" />
          <h2 className="text-sm font-bold text-white">Compose Message</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5">
            <Users size={13} className="text-slate-500 flex-shrink-0" />
            <input
              value={phones}
              onChange={(e) => setPhones(e.target.value)}
              placeholder="Phone numbers, comma-separated (e.g. 0722000001, 0733000002)"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white"
          >
            <option value="SMS">SMS</option>
            <option value="WhatsApp">WhatsApp</option>
          </select>
        </div>

        {/* Quick Presets */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Quick Templates</p>
          <div className="flex gap-2 flex-wrap">
            {PRESET_MESSAGES.map((p) => (
              <button
                key={p.label}
                onClick={() => setMessage(p.text)}
                className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/30 hover:text-emerald-300 transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Type your message here… (max 160 characters for standard SMS)"
            className={`w-full rounded-xl border bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none resize-none ${charCount > charLimit ? 'border-red-500/50' : 'border-white/[0.09] focus:border-emerald-500/50'}`}
          />
          <span className={`absolute bottom-3 right-3 text-[10px] font-mono ${charCount > charLimit ? 'text-red-400' : charCount > charLimit * 0.8 ? 'text-amber-400' : 'text-slate-600'}`}>
            {charCount}/{charLimit}
          </span>
        </div>

        <button
          onClick={send}
          disabled={sending || !phones.trim() || !message.trim()}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send {channel}</>}
        </button>
      </div>

      {/* Delivery Log */}
      <div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Phone size={14} className="text-slate-400" /> Delivery Log
          </h2>
          <div className="flex gap-1 rounded-xl glass-panel p-1">
            {['All', 'Delivered', 'Sent', 'Pending', 'Failed'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${statusFilter === s ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-400" /></div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <Phone size={32} className="text-slate-700 mb-2" />
            <p className="text-sm text-slate-500">No messages in log</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((row) => {
              const sStyle = STATUS_STYLES[row.status] ?? STATUS_STYLES.Pending
              const StatusIcon = sStyle.icon
              return (
                <div key={row.id} className="flex items-start gap-3 rounded-2xl glass-panel px-4 py-3">
                  <div className={`flex-shrink-0 mt-0.5 rounded-xl p-1.5 border ${sStyle.cls}`}>
                    <StatusIcon size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-mono font-semibold text-slate-300">{row.recipient_phone}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sStyle.cls}`}>{row.status}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{row.channel}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{row.message}</p>
                    {row.failure_reason && (
                      <p className="text-[11px] text-red-300 mt-1 flex items-center gap-1">
                        <XCircle size={10} /> {row.failure_reason}
                      </p>
                    )}
                    {row.created_at && (
                      <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                        <Clock size={9} />{fmtDate(row.created_at)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
