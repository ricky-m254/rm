import { useState } from 'react'
import PageHero from '../../components/PageHero'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Flag = { id: number; name: string; description: string; enabled: boolean; scope: 'global' | 'per-tenant'; category: string }

const INITIAL_FLAGS: Flag[] = [
  { id: 1, name: 'ai_reports', description: 'AI-generated progress reports for CBC learners', enabled: true, scope: 'per-tenant', category: 'AI & Analytics' },
  { id: 2, name: 'advanced_analytics', description: 'Extended analytics dashboards with trend forecasting', enabled: true, scope: 'per-tenant', category: 'AI & Analytics' },
  { id: 3, name: 'attendance_biometrics', description: 'Fingerprint / facial recognition clock-in integration', enabled: false, scope: 'per-tenant', category: 'Attendance' },
  { id: 4, name: 'lms_module', description: 'Full LMS with CBC e-learning materials (PP1–Grade 9)', enabled: true, scope: 'per-tenant', category: 'Learning' },
  { id: 5, name: 'parent_portal', description: 'Parent self-service portal for fees, results & comms', enabled: true, scope: 'global', category: 'Portals' },
  { id: 6, name: 'sms_notifications', description: 'SMS gateway integration for parent and staff alerts', enabled: true, scope: 'global', category: 'Communication' },
  { id: 7, name: 'multi_currency', description: 'Accept payments in multiple currencies (USD, KES, GBP)', enabled: false, scope: 'per-tenant', category: 'Finance' },
  { id: 8, name: 'payroll_automation', description: 'Automated payslip generation and bank integration', enabled: true, scope: 'per-tenant', category: 'Finance' },
  { id: 9, name: 'library_module', description: 'Digital library with barcode scanning', enabled: false, scope: 'per-tenant', category: 'Learning' },
  { id: 10, name: 'transport_tracking', description: 'GPS-based school bus tracking and alerts', enabled: false, scope: 'per-tenant', category: 'Operations' },
]

export default function PlatformFeatureFlagsPage() {
  const [flags, setFlags] = useState<Flag[]>(INITIAL_FLAGS)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const categories = [...new Set(flags.map(f => f.category))]

  const toggle = (id: number) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
    setMessage('Flag updated successfully.')
    setTimeout(() => setMessage(null), 2000)
  }

  const filtered = flags.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.description.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = categories.map(cat => ({
    cat,
    items: filtered.filter(f => f.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-6">
      <PageHero title="Feature Flags" subtitle="Enable or disable platform features globally or per tenant" />

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          ✓ {message}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3 text-sm text-slate-400">
          <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-emerald-300">
            {flags.filter(f => f.enabled).length} enabled
          </span>
          <span className="rounded-lg bg-white/5 px-3 py-1.5">
            {flags.filter(f => !f.enabled).length} disabled
          </span>
        </div>
        <input
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:w-64"
          placeholder="Search flags…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-5">
        {grouped.map(({ cat, items }) => (
          <div key={cat} className="rounded-2xl p-5" style={GLASS}>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">{cat}</h3>
            <div className="space-y-3">
              {items.map(flag => (
                <div key={flag.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.018] px-4 py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-slate-200">{flag.name}</code>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${flag.scope === 'global' ? 'bg-blue-500/15 text-blue-300' : 'bg-violet-500/15 text-violet-300'}`}>
                        {flag.scope}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{flag.description}</p>
                  </div>
                  <button
                    onClick={() => toggle(flag.id)}
                    className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${flag.enabled ? 'bg-emerald-500' : 'bg-white/15'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${flag.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
