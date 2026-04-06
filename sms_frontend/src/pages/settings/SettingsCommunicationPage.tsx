import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { Check, AlertCircle, Mail, MessageSquare, Phone, RefreshCw } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface CommSettings {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  smtp_use_tls: boolean
  sms_provider: string
  sms_api_key: string
  sms_username: string
  sms_sender_id: string
  whatsapp_api_key: string
  whatsapp_phone_id: string
}

const DEFAULTS: CommSettings = {
  smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', smtp_use_tls: true,
  sms_provider: 'africastalking', sms_api_key: '', sms_username: '', sms_sender_id: '',
  whatsapp_api_key: '', whatsapp_phone_id: '',
}

const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 transition placeholder:text-slate-600'
const passClass = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 transition font-mono placeholder:text-slate-600'

function Section({ icon: Icon, color, title, children }: { icon: React.ElementType; color: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl glass-panel p-6 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export default function SettingsCommunicationPage() {
  const [form, setForm] = useState<CommSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<any>('/school/profile/').then(r => {
      const p = r.data.profile ?? r.data
      setForm({
        smtp_host: p.smtp_host || '',
        smtp_port: p.smtp_port || 587,
        smtp_user: p.smtp_user || '',
        smtp_password: '',
        smtp_use_tls: p.smtp_use_tls ?? true,
        sms_provider: p.sms_provider || 'africastalking',
        sms_api_key: '',
        sms_username: p.sms_username || '',
        sms_sender_id: p.sms_sender_id || '',
        whatsapp_api_key: '',
        whatsapp_phone_id: p.whatsapp_phone_id || '',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const setF = <K extends keyof CommSettings>(k: K, v: CommSettings[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      const payload: Partial<CommSettings> = { ...form }
      if (!payload.smtp_password) delete payload.smtp_password
      if (!payload.sms_api_key) delete payload.sms_api_key
      if (!payload.whatsapp_api_key) delete payload.whatsapp_api_key
      await apiClient.patch('/school/profile/', payload)
      setSuccess('Communication settings saved successfully.')
    } catch { setError('Failed to save settings. Check your inputs.') }
    finally { setSaving(false) }
  }

  const testSmtp = async () => {
    setTesting('email'); setError(null)
    try {
      await apiClient.post('/school/test-email/')
      setSuccess('Test email sent! Check your inbox.')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'SMTP test failed. Check your settings.')
    } finally { setTesting(null) }
  }

  const testSms = async () => {
    setTesting('sms'); setError(null)
    try {
      await apiClient.post('/school/test-sms/')
      setSuccess('Test SMS sent successfully.')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'SMS test failed. Check your API key.')
    } finally { setTesting(null) }
  }

  if (loading) return <div className="py-20 text-center text-slate-500 animate-pulse">Loading…</div>

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHero
        badge="SETTINGS"
        badgeColor="sky"
        title="Communication Config"
        subtitle="Email, SMS gateway and notification settings"
        icon="⚙️"
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Communication Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure email (SMTP), SMS gateway, and WhatsApp API for system notifications, fee reminders, attendance alerts, and report distribution.
        </p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4 flex-shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4 flex-shrink-0" />{success}</div>}

      {/* Email / SMTP */}
      <Section icon={Mail} color="text-sky-400" title="Email — SMTP Configuration">
        <p className="text-xs text-slate-500">Used for sending fee receipts, report cards, attendance alerts, and bulk announcements. Supports Gmail, Outlook, Zoho, and custom SMTP servers.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">SMTP Host</label>
            <input value={form.smtp_host} onChange={e => setF('smtp_host', e.target.value)} placeholder="smtp.gmail.com" className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Port</label>
            <input type="number" value={form.smtp_port} onChange={e => setF('smtp_port', Number(e.target.value))} className={cls} />
            <p className="text-[10px] text-slate-600 mt-1">587 (TLS) or 465 (SSL)</p>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Use TLS</label>
            <select value={form.smtp_use_tls ? 'yes' : 'no'} onChange={e => setF('smtp_use_tls', e.target.value === 'yes')} className={cls}>
              <option value="yes">Yes — Recommended</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">SMTP Username / Email</label>
            <input value={form.smtp_user} onChange={e => setF('smtp_user', e.target.value)} placeholder="school@gmail.com" className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">App Password</label>
            <input type="password" value={form.smtp_password} onChange={e => setF('smtp_password', e.target.value)} placeholder="Leave blank to keep existing" className={passClass} />
            <p className="text-[10px] text-slate-600 mt-1">For Gmail: use an App Password (not your account password)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => void testSmtp()} disabled={testing === 'email'}
            className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50 transition">
            {testing === 'email' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            Test Email Connection
          </button>
          <p className="text-[10px] text-slate-600">Sends a test email to the SMTP user address</p>
        </div>
      </Section>

      {/* SMS Gateway */}
      <Section icon={Phone} color="text-emerald-400" title="SMS Gateway — Africa's Talking / Twilio">
        <p className="text-xs text-slate-500">Send SMS notifications for attendance, fee reminders, and emergency alerts. Recommended for Kenya: Africa's Talking.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">SMS Provider</label>
            <select value={form.sms_provider} onChange={e => setF('sms_provider', e.target.value)} className={cls}>
              <option value="africastalking">Africa's Talking</option>
              <option value="twilio">Twilio</option>
              <option value="infobip">Infobip</option>
              <option value="vonage">Vonage (Nexmo)</option>
              <option value="custom">Custom API</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">API Key</label>
            <input type="password" value={form.sms_api_key} onChange={e => setF('sms_api_key', e.target.value)} placeholder="Leave blank to keep existing" className={passClass} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Username / Account SID</label>
            <input value={form.sms_username} onChange={e => setF('sms_username', e.target.value)} placeholder="e.g. schoolapp" className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Sender ID / From Number</label>
            <input value={form.sms_sender_id} onChange={e => setF('sms_sender_id', e.target.value)} placeholder="SCHOOL or +254XXXXXXXXX" className={cls} />
            <p className="text-[10px] text-slate-600 mt-1">Africa's Talking accepts alphanumeric sender IDs (max 11 chars)</p>
          </div>
        </div>
        <button onClick={() => void testSms()} disabled={testing === 'sms'}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 transition">
          {testing === 'sms' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
          Test SMS Connection
        </button>
      </Section>

      {/* WhatsApp */}
      <Section icon={MessageSquare} color="text-violet-400" title="WhatsApp Business API">
        <p className="text-xs text-slate-500">
          Send WhatsApp messages directly to parents. Requires a <strong className="text-slate-300">Meta Business Account</strong> and WhatsApp Business API access (via Meta or a Business Solution Provider).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">API Key / Access Token</label>
            <input type="password" value={form.whatsapp_api_key} onChange={e => setF('whatsapp_api_key', e.target.value)} placeholder="Leave blank to keep existing" className={passClass} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Phone Number ID</label>
            <input value={form.whatsapp_phone_id} onChange={e => setF('whatsapp_phone_id', e.target.value)} placeholder="From Meta Business Manager" className={cls} />
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-300 space-y-1">
          <p className="font-semibold">Setup Guide</p>
          <p>1. Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com</a> and create a WhatsApp Business app.</p>
          <p>2. Get your <strong>Phone Number ID</strong> and <strong>Permanent Access Token</strong> from Meta Business Manager.</p>
          <p>3. Messages sent through this system will use WhatsApp Cloud API — no third-party gateway needed.</p>
        </div>
      </Section>

      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-8 py-2.5 text-sm font-bold text-slate-950 transition">
          {saving ? 'Saving…' : 'Save Communication Settings'}
        </button>
      </div>
    </div>
  )
}
