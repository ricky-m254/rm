import { useEffect, useState } from 'react'
import {
  FileText, Plus, Copy, Eye, Trash2, EyeOff,
  CheckCheck, AlertTriangle, Loader2,
  Mail, Phone, Bell, Globe,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Template = { id: number; name: string; category: string; channel: string; subject: string; body: string; language?: string; created_at?: string }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray((value as { results?: T[] }).results) ? (value as { results: T[] }).results : []
}

const CHANNEL_ICONS: Record<string, React.ElementType> = { Email: Mail, SMS: Phone, WhatsApp: Phone, Push: Bell, All: Globe }
const CHANNEL_COLORS: Record<string, string> = {
  Email: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  SMS: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  WhatsApp: 'text-green-400 bg-green-500/10 border-green-500/25',
  Push: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  All: 'text-slate-300 bg-slate-700/50 border-slate-600',
}

const PRESET_TEMPLATES = [
  {
    name: 'Fee Payment Receipt',
    category: 'Finance',
    channel: 'Email',
    subject: 'Payment Receipt — Ksh {{amount}} received',
    body: 'Dear {{parent_name}},\n\nWe acknowledge receipt of Ksh {{amount}} for {{student_name}} (Adm No: {{admission_number}}) dated {{payment_date}}.\n\nReceipt No: {{receipt_number}}\nBalance: Ksh {{balance}}\n\nThank you for your prompt payment.\n\nSt. Mary\'s Nairobi High School\nBursar\'s Office',
  },
  {
    name: 'Admission Offer Letter',
    category: 'Admissions',
    channel: 'Email',
    subject: 'Offer of Admission — St. Mary\'s Nairobi High School',
    body: 'Dear {{parent_name}},\n\nWe are pleased to offer {{student_name}} a place at St. Mary\'s Nairobi High School for {{academic_year}}.\n\nThe student has been placed in {{class_name}}.\n\nReporting date: {{reporting_date}}\n\nPlease confirm acceptance within 7 days and pay the caution money of Ksh 500.\n\nYours faithfully,\nThe Principal',
  },
  {
    name: 'Low Balance Alert',
    category: 'Finance',
    channel: 'SMS',
    subject: 'Fee Balance Alert',
    body: 'Dear Parent, {{student_name}} has an outstanding balance of Ksh {{balance}} for {{term_name}}. Please pay by {{due_date}}. Contact bursar: 0722000000. St. Mary\'s Nairobi HS.',
  },
  {
    name: 'Absent Student Alert',
    category: 'Attendance',
    channel: 'SMS',
    subject: 'Absence Notification',
    body: 'Dear Parent, {{student_name}} ({{class_name}}) was absent on {{date}}. Please contact school: 0722000000. St. Mary\'s Nairobi HS.',
  },
  {
    name: 'Exam Results Ready',
    category: 'Academics',
    channel: 'Email',
    subject: '{{term_name}} Examination Results — {{student_name}}',
    body: 'Dear {{parent_name}},\n\nThe {{term_name}} examination results for {{student_name}} are now ready.\n\nMean Grade: {{mean_grade}} | Position: {{position}}\n\nPlease visit the school portal or contact the class teacher for detailed results.\n\nSt. Mary\'s Nairobi High School',
  },
]

export default function CommunicationTemplatesPage() {
  const [rows, setRows] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [previewId, setPreviewId] = useState<number | null>(null)
  const [previewContent, setPreviewContent] = useState<{ subject: string; body: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [channelFilter, setChannelFilter] = useState('All')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const [form, setForm] = useState({
    name: '', category: 'System', channel: 'Email',
    subject: '', body: 'Dear {{parent_name}},\n\n', language: 'en',
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<Template[] | { results: Template[] }>('/communication/templates/')
      setRows(asArray(res.data))
    } catch {
      setError('Unable to load templates.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const create = async () => {
    if (!form.name.trim() || !form.body.trim()) { setError('Name and body are required.'); return }
    setCreating(true)
    setError(null)
    try {
      await apiClient.post('/communication/templates/', form)
      setForm({ name: '', category: 'System', channel: 'Email', subject: '', body: 'Dear {{parent_name}},\n\n', language: 'en' })
      setShowForm(false)
      setSuccess('Template created!')
      setTimeout(() => setSuccess(null), 3000)
      await load()
    } catch {
      setError('Unable to create template.')
    } finally {
      setCreating(false)
    }
  }

  const createPreset = async (preset: typeof PRESET_TEMPLATES[0]) => {
    try {
      await apiClient.post('/communication/templates/', { ...preset, language: 'en' })
      setSuccess(`Template "${preset.name}" added!`)
      setTimeout(() => setSuccess(null), 3000)
      await load()
    } catch { /* ok */ }
  }

  const runPreview = async (id: number) => {
    if (previewId === id) { setPreviewId(null); setPreviewContent(null); return }
    setPreviewId(id)
    setPreviewLoading(true)
    setPreviewContent(null)
    try {
      const res = await apiClient.post<{ subject: string; body: string }>(`/communication/templates/${id}/preview/`, {
        sample: {
          parent_name: 'Mrs. Grace Wanjiku', student_name: 'Peter Kamau', admission_number: 'STM2025001',
          amount: '12,000', balance: '24,000', payment_date: '10 Jan 2025',
          receipt_number: 'RCPT-9001', term_name: 'Term 1 2025', class_name: 'Form 1 East',
          academic_year: '2025', reporting_date: '6th January 2025', due_date: '14 Feb 2025',
          mean_grade: 'B+', position: '5', date: '14 Jan 2025',
        },
      })
      setPreviewContent(res.data)
    } catch {
      setPreviewContent({ subject: 'Preview unavailable', body: 'Could not generate preview for this template.' })
    } finally {
      setPreviewLoading(false)
    }
  }

  const doDelete = async (id: number) => {
    try {
      await apiClient.delete(`/communication/templates/${id}/`)
      setRows(prev => prev.filter(r => r.id !== id))
      if (previewId === id) { setPreviewId(null); setPreviewContent(null) }
      setSuccess('Template deleted.')
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('Unable to delete template.')
    }
  }

  const copyBody = (tmpl: Template) => {
    void navigator.clipboard.writeText(tmpl.body)
    setCopiedId(tmpl.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const displayed = channelFilter === 'All' ? rows : rows.filter(r => r.channel === channelFilter)

  return (
    <div className="space-y-5 pb-8">
      <PageHero
        badge="COMMUNICATION"
        badgeColor="rose"
        title="Message Templates"
        subtitle="Reusable templates for common communications"
        icon="📣"
      />
      {/* Header */}

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCheck size={14} />{success}
        </div>
      )}

      {/* Quick Add Presets */}
      {rows.length === 0 && !loading && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-sm font-bold text-amber-300 mb-3">Quick Start — Add Kenyan School Templates</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PRESET_TEMPLATES.map((p) => (
              <button
                key={p.name}
                onClick={() => createPreset(p)}
                className="flex items-center gap-2 rounded-xl border border-white/[0.09] glass-panel px-3 py-2.5 text-left hover:border-emerald-500/30 hover:bg-slate-800 transition"
              >
                <Plus size={12} className="text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">{p.name}</p>
                  <p className="text-[10px] text-slate-500">{p.category} · {p.channel}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2"><FileText size={14} /> Create Template</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Template name"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <select
              value={form.category}
              onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white"
            >
              {['System', 'Finance', 'Admissions', 'Attendance', 'Academics', 'HR', 'General'].map(c => <option key={c}>{c}</option>)}
            </select>
            <select
              value={form.channel}
              onChange={(e) => setForm(f => ({ ...f, channel: e.target.value }))}
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white"
            >
              {['Email', 'SMS', 'WhatsApp', 'Push', 'All'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <input
            value={form.subject}
            onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="Subject line (for Email/Push)"
            className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          <div>
            <textarea
              value={form.body}
              onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
              rows={6}
              placeholder="Template body — use {{variable}} for merge fields"
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">Available merge fields: {'{{parent_name}}'}, {'{{student_name}}'}, {'{{amount}}'}, {'{{balance}}'}, {'{{term_name}}'}, {'{{class_name}}'}, {'{{due_date}}'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-400 hover:text-white transition">Cancel</button>
            <button onClick={create} disabled={creating} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-400 transition disabled:opacity-50">
              {creating ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} Save Template
            </button>
          </div>
        </div>
      )}

      {/* Channel Filter */}
      <div className="flex gap-1 rounded-xl glass-panel p-1 w-fit flex-wrap">
        {['All', 'Email', 'SMS', 'WhatsApp', 'Push'].map(ch => (
          <button
            key={ch}
            onClick={() => setChannelFilter(ch)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${channelFilter === ch ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {ch}
          </button>
        ))}
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={40} className="text-slate-700 mb-3" />
          <p className="text-sm font-semibold text-slate-400">No templates yet</p>
          <p className="text-xs text-slate-600 mt-1">Add your first template or use the quick-start presets above.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {displayed.map((tmpl) => {
            const chColor = CHANNEL_COLORS[tmpl.channel] ?? CHANNEL_COLORS.All
            const ChIcon = CHANNEL_ICONS[tmpl.channel] ?? Globe
            const isPreview = previewId === tmpl.id
            return (
              <div key={tmpl.id} className="rounded-2xl glass-panel overflow-hidden">
                <div className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 rounded-xl p-2 border ${chColor}`}>
                      <ChIcon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{tmpl.name}</p>
                      {tmpl.subject && <p className="text-xs text-slate-400 truncate mt-0.5">{tmpl.subject}</p>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${chColor}`}>{tmpl.channel}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{tmpl.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => runPreview(tmpl.id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${isPreview ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/[0.09] text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}
                    >
                      {isPreview ? <EyeOff size={11} /> : <Eye size={11} />}
                      {isPreview ? 'Hide' : 'Preview'}
                    </button>
                    <button
                      onClick={() => copyBody(tmpl)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.09] px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition"
                    >
                      {copiedId === tmpl.id ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      {copiedId === tmpl.id ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => doDelete(tmpl.id)}
                      className="ml-auto h-7 w-7 rounded-lg border border-red-500/20 flex items-center justify-center hover:bg-red-500/10 transition"
                    >
                      <Trash2 size={11} className="text-red-400" />
                    </button>
                  </div>
                </div>

                {isPreview && (
                  <div className="border-t border-white/[0.07] px-4 pb-4 pt-3 bg-slate-950/40">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Live Preview (with sample data)</p>
                    {previewLoading ? (
                      <div className="flex items-center gap-2 py-3">
                        <Loader2 size={13} className="animate-spin text-emerald-400" />
                        <p className="text-xs text-slate-400">Generating preview…</p>
                      </div>
                    ) : previewContent ? (
                      <div className="space-y-2">
                        {previewContent.subject && (
                          <p className="text-xs text-slate-400"><strong className="text-slate-300">Subject:</strong> {previewContent.subject}</p>
                        )}
                        <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-[#0d1421] rounded-xl p-3 max-h-48 overflow-y-auto">{previewContent.body}</pre>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
