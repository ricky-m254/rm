import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { Check, AlertCircle, Palette, Type, Monitor } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface GlobalSettings {
  primary_color: string
  secondary_color: string
  font_family: string
}

const PRESET_PALETTES = [
  { label: 'Emerald (Default)', primary: '#10b981', secondary: '#0ea5e9' },
  { label: 'Blue', primary: '#3b82f6', secondary: '#8b5cf6' },
  { label: 'Purple', primary: '#8b5cf6', secondary: '#ec4899' },
  { label: 'Rose', primary: '#f43f5e', secondary: '#f97316' },
  { label: 'Amber', primary: '#f59e0b', secondary: '#10b981' },
  { label: 'Cyan', primary: '#06b6d4', secondary: '#3b82f6' },
  { label: 'Teal', primary: '#14b8a6', secondary: '#0ea5e9' },
  { label: 'Indigo', primary: '#6366f1', secondary: '#ec4899' },
]

const FONT_OPTIONS = ['Inter', 'Poppins', 'Roboto', 'Nunito', 'Open Sans', 'Raleway', 'Lato', 'Source Sans 3']

const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 transition'

export default function SettingsGlobalPage() {
  const [form, setForm] = useState<GlobalSettings>({ primary_color: '#10b981', secondary_color: '#0ea5e9', font_family: 'Inter' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<any>('/school/profile/').then(r => {
      const p = r.data.profile ?? r.data
      setForm({
        primary_color: p.primary_color || '#10b981',
        secondary_color: p.secondary_color || '#0ea5e9',
        font_family: p.font_family || 'Inter',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const apply = (primary: string, secondary: string) => {
    setForm(f => ({ ...f, primary_color: primary, secondary_color: secondary }))
    document.documentElement.style.setProperty('--brand-primary', primary)
    document.documentElement.style.setProperty('--brand-secondary', secondary)
  }

  const save = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      await apiClient.patch('/school/profile/', form)
      document.documentElement.style.setProperty('--brand-primary', form.primary_color)
      document.documentElement.style.setProperty('--brand-secondary', form.secondary_color)
      setSuccess('Theme settings saved. Changes apply immediately across the system.')
    } catch { setError('Failed to save theme settings.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="py-20 text-center text-slate-500 animate-pulse">Loading…</div>

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHero
        badge="SETTINGS"
        badgeColor="sky"
        title="Global Settings"
        subtitle="System-wide preferences and school information"
        icon="⚙️"
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Global Theme & Branding</h1>
        <p className="mt-1 text-sm text-slate-400">Customize the system's appearance. These colors appear on buttons, highlights, headers, and printed documents throughout the system.</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{success}</div>}

      {/* Color Presets */}
      <section className="rounded-2xl glass-panel p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Color Palette</h2>
        </div>
        <p className="text-xs text-slate-500">Select a preset color combination or set custom colors below.</p>

        {/* Preset swatches */}
        <div className="grid grid-cols-4 gap-3">
          {PRESET_PALETTES.map(p => (
            <button key={p.label} onClick={() => apply(p.primary, p.secondary)}
              className={`rounded-xl border p-3 text-left transition ${
                form.primary_color === p.primary ? 'border-white/50 bg-slate-800' : 'border-white/[0.09] bg-slate-950 hover:border-slate-500'
              }`}>
              <div className="flex gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-full" style={{ background: p.primary }} />
                <div className="w-5 h-5 rounded-full" style={{ background: p.secondary }} />
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{p.label}</p>
            </button>
          ))}
        </div>

        {/* Custom color pickers */}
        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <div>
            <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-widest">Primary Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primary_color}
                onChange={e => { setForm(f => ({ ...f, primary_color: e.target.value })); document.documentElement.style.setProperty('--brand-primary', e.target.value) }}
                className="w-12 h-10 rounded-lg cursor-pointer border border-white/[0.09] bg-slate-950" />
              <input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                placeholder="#10b981" className="flex-1 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-100 font-mono" />
            </div>
            <div className="mt-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900" style={{ background: form.primary_color }}>
              Primary — buttons, links, highlights
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-widest">Secondary / Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.secondary_color}
                onChange={e => { setForm(f => ({ ...f, secondary_color: e.target.value })); document.documentElement.style.setProperty('--brand-secondary', e.target.value) }}
                className="w-12 h-10 rounded-lg cursor-pointer border border-white/[0.09] bg-slate-950" />
              <input value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))}
                placeholder="#0ea5e9" className="flex-1 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-100 font-mono" />
            </div>
            <div className="mt-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900" style={{ background: form.secondary_color }}>
              Secondary — badges, accents, charts
            </div>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Type className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Typography</h2>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Font Family</label>
          <select value={form.font_family} onChange={e => setForm(f => ({ ...f, font_family: e.target.value }))} className={cls}>
            {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <p className="mt-2 text-sm text-slate-400" style={{ fontFamily: form.font_family }}>
            Preview: The quick brown fox jumps over the lazy dog. — {form.font_family}
          </p>
        </div>
      </section>

      {/* Live preview */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Monitor className="h-4 w-4 text-sky-400" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Live Preview</h2>
        </div>
        <div className="rounded-xl border border-white/[0.09] bg-slate-950 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-950 text-sm" style={{ background: form.primary_color }}>R</div>
            <div>
              <p className="text-sm font-semibold text-white">Your School Name</p>
              <p className="text-[10px]" style={{ color: form.secondary_color }}>School Management System</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-950" style={{ background: form.primary_color }}>Primary Button</button>
            <button className="rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: form.primary_color, color: form.primary_color }}>Outlined Button</button>
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-slate-950" style={{ background: form.secondary_color }}>Badge</span>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-8 py-2.5 text-sm font-bold text-slate-950 transition">
          {saving ? 'Saving…' : 'Save Theme Settings'}
        </button>
      </div>
    </div>
  )
}
