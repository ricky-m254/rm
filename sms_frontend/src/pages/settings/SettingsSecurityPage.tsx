import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Lock, Clock, AlertTriangle, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { type SecurityPolicy, getSecurityPolicy, updateSecurityPolicy } from '../../api/controlPlane'
import PageHero from '../../components/PageHero'

const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 transition placeholder:text-slate-600'

const DEFAULT_POLICY: SecurityPolicy = {
  id: 0,
  session_timeout_minutes: 60,
  max_login_attempts: 5,
  lockout_duration_minutes: 15,
  min_password_length: 8,
  require_uppercase: true,
  require_numbers: true,
  require_special_characters: false,
  password_expiry_days: 90,
  mfa_mode: 'DISABLED',
  mfa_method: 'SMS',
  ip_whitelist_enabled: false,
  allowed_ip_ranges: [],
  audit_log_retention_days: 365,
  updated_by: null,
  updated_by_name: null,
  created_at: '',
  updated_at: '',
}

export default function SettingsSecurityPage() {
  const [policy, setPolicy] = useState<SecurityPolicy>(DEFAULT_POLICY)
  const [allowedIpsText, setAllowedIpsText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const nextPolicy = await getSecurityPolicy()
      setPolicy(nextPolicy)
      setAllowedIpsText((nextPolicy.allowed_ip_ranges ?? []).join('\n'))
    } catch {
      setError('Failed to load security settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const nextPolicy = await updateSecurityPolicy({
        session_timeout_minutes: policy.session_timeout_minutes,
        max_login_attempts: policy.max_login_attempts,
        lockout_duration_minutes: policy.lockout_duration_minutes,
        min_password_length: policy.min_password_length,
        require_uppercase: policy.require_uppercase,
        require_numbers: policy.require_numbers,
        require_special_characters: policy.require_special_characters,
        password_expiry_days: policy.password_expiry_days,
        mfa_mode: policy.mfa_mode,
        mfa_method: policy.mfa_method,
        ip_whitelist_enabled: policy.ip_whitelist_enabled,
        allowed_ip_ranges: allowedIpsText,
        audit_log_retention_days: policy.audit_log_retention_days,
      })
      setPolicy(nextPolicy)
      setAllowedIpsText((nextPolicy.allowed_ip_ranges ?? []).join('\n'))
      setSuccess('Security settings saved.')
    } catch {
      setError('Failed to save security settings.')
    } finally {
      setSaving(false)
    }
  }

  const setField = <K extends keyof SecurityPolicy>(key: K, value: SecurityPolicy[K]) => {
    setPolicy((current) => ({ ...current, [key]: value }))
  }

  const passwordStrength = [
    policy.require_uppercase,
    policy.require_numbers,
    policy.require_special_characters,
    policy.min_password_length >= 10,
  ].filter(Boolean).length
  const strengthLabel = ['Weak', 'Fair', 'Good', 'Strong'][Math.min(passwordStrength, 3)]
  const strengthColor = ['text-rose-400', 'text-amber-400', 'text-sky-400', 'text-emerald-400'][Math.min(passwordStrength, 3)]

  if (loading) {
    return <div className="rounded-2xl glass-panel p-6 text-sm text-slate-300">Loading security policy...</div>
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHero
        badge="SETTINGS"
        badgeColor="rose"
        title="Security Policy"
        subtitle="Canonical password, session, MFA, and audit settings for the tenant."
        icon={<Shield className="h-6 w-6 text-rose-300" />}
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Security & Access Control</h1>
        <p className="mt-1 text-sm text-slate-400">These settings now persist through the institution control plane and feed readiness checks directly.</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{success}</div>}

      <section className="rounded-2xl border border-white/[0.07] bg-slate-950/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">Control-Plane Ownership</h2>
            <p className="mt-2 text-sm text-slate-400">Security policy is now stored separately from school profile and contributes directly to readiness and lifecycle runs.</p>
          </div>
          <Link to="/settings/control-plane" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200">
            Open Control Plane
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-sky-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Session Management</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Session Timeout (minutes)</label>
            <input type="number" min={5} max={1440} value={policy.session_timeout_minutes} onChange={e => setField('session_timeout_minutes', Number(e.target.value))} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Audit Log Retention (days)</label>
            <input type="number" min={30} value={policy.audit_log_retention_days} onChange={e => setField('audit_log_retention_days', Number(e.target.value))} className={cls} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-amber-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Login Protection</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Max Failed Login Attempts</label>
            <input type="number" min={1} max={20} value={policy.max_login_attempts} onChange={e => setField('max_login_attempts', Number(e.target.value))} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Account Lockout Duration (minutes)</label>
            <input type="number" min={1} value={policy.lockout_duration_minutes} onChange={e => setField('lockout_duration_minutes', Number(e.target.value))} className={cls} />
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-200">After {policy.max_login_attempts} failed attempts, the account is locked for {policy.lockout_duration_minutes} minutes.</p>
        </div>
      </section>

      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-violet-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Password Policy</h2></div>
          <span className={`text-xs font-bold ${strengthColor}`}>Strength: {strengthLabel}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Minimum Length</label>
            <input type="number" min={6} max={32} value={policy.min_password_length} onChange={e => setField('min_password_length', Number(e.target.value))} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Password Expiry (days)</label>
            <input type="number" min={0} value={policy.password_expiry_days} onChange={e => setField('password_expiry_days', Number(e.target.value))} className={cls} />
          </div>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Require uppercase letters (A-Z)', value: policy.require_uppercase, set: (value: boolean) => setField('require_uppercase', value) },
            { label: 'Require numbers (0-9)', value: policy.require_numbers, set: (value: boolean) => setField('require_numbers', value) },
            { label: 'Require special characters (!@#$%)', value: policy.require_special_characters, set: (value: boolean) => setField('require_special_characters', value) },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={value} onChange={e => set(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500 transition" />
              <span className="text-sm text-slate-300">{label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Multi-Factor Authentication</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">MFA Scope</label>
            <select value={policy.mfa_mode} onChange={e => setField('mfa_mode', e.target.value as SecurityPolicy['mfa_mode'])} className={cls}>
              <option value="DISABLED">Disabled</option>
              <option value="ADMIN_ONLY">Admins only</option>
              <option value="ALL_STAFF">All staff</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">MFA Method</label>
            <select value={policy.mfa_method} onChange={e => setField('mfa_method', e.target.value as SecurityPolicy['mfa_method'])} className={cls} disabled={policy.mfa_mode === 'DISABLED'}>
              <option value="SMS">SMS OTP</option>
              <option value="EMAIL">Email OTP</option>
              <option value="TOTP">Authenticator App (TOTP)</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-rose-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">IP Access Control</h2></div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={policy.ip_whitelist_enabled} onChange={e => setField('ip_whitelist_enabled', e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500 transition" />
          <span className="text-sm text-slate-300">Restrict admin access to specific IP addresses</span>
        </label>
        {policy.ip_whitelist_enabled ? (
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Allowed IP Addresses (one per line)</label>
            <textarea value={allowedIpsText} onChange={e => setAllowedIpsText(e.target.value)} rows={4} placeholder="192.168.1.0/24&#10;10.0.0.1&#10;203.0.113.42" className={`${cls} resize-none font-mono`} />
          </div>
        ) : null}
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          {policy.updated_at ? `Last updated ${new Date(policy.updated_at).toLocaleString()}${policy.updated_by_name ? ` by ${policy.updated_by_name}` : ''}` : 'No saved security changes yet.'}
        </p>
        <button onClick={() => void save()} disabled={saving}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-8 py-2.5 text-sm font-bold text-slate-950 transition">
          {saving ? 'Saving...' : 'Save Security Policy'}
        </button>
      </div>
    </div>
  )
}
