import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { Hash, RefreshCw, Eye, Save, AlertCircle, CheckCircle, Info } from 'lucide-react'
import PageHero from '../../components/PageHero'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const INPUT = 'w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500/50'
const SELECT = 'w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0d1117] border border-white/10 focus:outline-none focus:border-emerald-500/50'
const LABEL = 'block text-xs text-white/50 mb-1 font-medium uppercase tracking-wide'

interface AdmissionConfig {
  prefix: string
  year: number
  sequence: number
  padding: number
  include_year: boolean
  reset_policy: string
  transfer_policy: string
  auto_generate: boolean
  updated_at?: string
  legacy_prefix?: string
  legacy_mode?: string
}

const DEFAULTS: AdmissionConfig = {
  prefix: 'ADM-',
  year: new Date().getFullYear(),
  sequence: 0,
  padding: 4,
  include_year: true,
  reset_policy: 'never',
  transfer_policy: 'new',
  auto_generate: true,
}

export default function SettingsAdmissionPage() {
  const [cfg, setCfg] = useState<AdmissionConfig>(DEFAULTS)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = async () => {
    try {
      const r = await apiClient.get('/settings/admission/')
      setCfg(r.data)
    } catch {
      showToast('Failed to load admission settings', false)
    } finally {
      setLoading(false)
    }
  }

  const fetchPreview = async () => {
    setPreviewing(true)
    try {
      const r = await apiClient.get('/settings/admission/preview/')
      setPreview(r.data.preview)
    } catch {
      setPreview('—')
    } finally {
      setPreviewing(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await apiClient.patch('/settings/admission/', {
        prefix: cfg.prefix,
        year: cfg.year,
        sequence: cfg.sequence,
        padding: cfg.padding,
        include_year: cfg.include_year,
        reset_policy: cfg.reset_policy,
        transfer_policy: cfg.transfer_policy,
        auto_generate: cfg.auto_generate,
      })
      showToast('Admission settings saved')
      await load()
      await fetchPreview()
    } catch {
      showToast('Save failed', false)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => { load(); fetchPreview() }, []) // eslint-disable-line

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  )

  const Toggle = ({ value, onChange, label, hint }: {
    value: boolean; onChange: (v: boolean) => void; label: string; hint?: string
  }) => (
    <div className="flex items-start gap-3">
      <button
        onClick={() => onChange(!value)}
        className={`mt-0.5 w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-emerald-500' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
      <div>
        <div className="text-sm text-white/80">{label}</div>
        {hint && <div className="text-xs text-white/40 mt-0.5">{hint}</div>}
      </div>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHero
        title="Admission Number Settings"
        subtitle="Configure how student admission numbers are generated, formatted, and handled for transfers."
        icon={<Hash className="w-6 h-6 text-emerald-400" />}
      />

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${toast.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Next number preview */}
      <div className="rounded-xl p-4 flex items-center gap-4" style={GLASS}>
        <div className="flex-1">
          <div className="text-xs text-white/40 uppercase tracking-wide mb-1">Next Admission Number Preview</div>
          <div className="text-2xl font-mono font-bold text-emerald-400">
            {previewing ? '...' : (preview || '—')}
          </div>
          <div className="text-xs text-white/30 mt-1">Current sequence: #{cfg.sequence}</div>
        </div>
        <button onClick={fetchPreview} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition">
          <RefreshCw className={`w-4 h-4 ${previewing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Format Configuration */}
        <div className="rounded-xl p-5 space-y-4" style={GLASS}>
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide flex items-center gap-2">
            <Hash className="w-4 h-4 text-emerald-400" /> Number Format
          </h3>

          <Field label="Prefix (e.g. STM- or SCH/)">
            <input
              className={INPUT}
              value={cfg.prefix}
              onChange={e => setCfg(p => ({ ...p, prefix: e.target.value }))}
              placeholder="ADM-"
            />
          </Field>

          <Field label="Academic Year">
            <input
              className={INPUT}
              type="number"
              value={cfg.year}
              onChange={e => setCfg(p => ({ ...p, year: parseInt(e.target.value) || p.year }))}
              min={2000} max={2100}
            />
          </Field>

          <Field label="Sequence Padding (digits)">
            <input
              className={INPUT}
              type="number"
              value={cfg.padding}
              onChange={e => setCfg(p => ({ ...p, padding: Math.max(1, parseInt(e.target.value) || 4) }))}
              min={1} max={8}
            />
            <div className="text-xs text-white/30 mt-1">
              Padding = {cfg.padding} → {String(cfg.sequence + 1).padStart(cfg.padding, '0')}
            </div>
          </Field>

          <Field label="Current Sequence (last used)">
            <input
              className={INPUT}
              type="number"
              value={cfg.sequence}
              onChange={e => setCfg(p => ({ ...p, sequence: Math.max(0, parseInt(e.target.value) || 0) }))}
              min={0}
            />
            <div className="text-xs text-white/30 mt-1">Next student will get #{cfg.sequence + 1}</div>
          </Field>

          <Toggle
            value={cfg.include_year}
            onChange={v => setCfg(p => ({ ...p, include_year: v }))}
            label="Include year in number"
            hint={cfg.include_year
              ? `Format: ${cfg.prefix}${cfg.year}-XXXX`
              : `Format: ${cfg.prefix}XXXX`}
          />
        </div>

        {/* Policies */}
        <div className="space-y-4">
          <div className="rounded-xl p-5 space-y-4" style={GLASS}>
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" /> Generation Policy
            </h3>

            <Toggle
              value={cfg.auto_generate}
              onChange={v => setCfg(p => ({ ...p, auto_generate: v }))}
              label="Auto-generate on enrolment"
              hint="If off, admin must enter admission number manually"
            />

            <Field label="Year Reset Policy">
              <select className={SELECT} value={cfg.reset_policy} onChange={e => setCfg(p => ({ ...p, reset_policy: e.target.value }))}>
                <option value="never">Never reset — numbers keep incrementing</option>
                <option value="yearly">Reset sequence each academic year</option>
              </select>
            </Field>
          </div>

          <div className="rounded-xl p-5 space-y-4" style={GLASS}>
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide flex items-center gap-2">
              <Info className="w-4 h-4 text-violet-400" /> Transfer Policy
            </h3>

            <Field label="Transferred-student admission number">
              <select className={SELECT} value={cfg.transfer_policy} onChange={e => setCfg(p => ({ ...p, transfer_policy: e.target.value }))}>
                <option value="new">Assign new number (store previous in history)</option>
                <option value="keep">Retain old number from source school</option>
              </select>
            </Field>

            <div className="rounded-lg p-3 bg-violet-500/5 border border-violet-500/10 text-xs text-white/40 leading-relaxed">
              {cfg.transfer_policy === 'new'
                ? 'Incoming transfer students receive a brand-new admission number. Their previous number is stored in the transfer history record.'
                : 'Incoming transfer students keep the admission number they had at their previous school. Uniqueness is still enforced within this tenant.'}
            </div>
          </div>

          {cfg.updated_at && (
            <div className="text-xs text-white/25 text-right">
              Last updated: {new Date(cfg.updated_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold rounded-lg transition disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Admission Settings'}
        </button>
      </div>
    </div>
  )
}
