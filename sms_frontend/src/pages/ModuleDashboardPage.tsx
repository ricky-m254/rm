import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const MODULE_LABELS: Record<string, string> = {
  STUDENTS: 'Students',
  ADMISSIONS: 'Admissions',
  FINANCE: 'Finance',
  ACADEMICS: 'Academics',
  HR: 'Human Resources',
  STAFF: 'Staff Management',
  COMMUNICATION: 'Communication',
  LIBRARY: 'Library Management',
  REPORTING: 'Reporting',
  CORE: 'Core Administration',
  ASSETS: 'Assets & Inventory',
}

export default function ModuleDashboardPage() {
  const { moduleKey } = useParams<{ moduleKey: string }>()
  const username = useAuthStore((state) => state.username)
  const tenantId = useAuthStore((state) => state.tenantId)

  const label = useMemo(() => {
    if (!moduleKey) return 'Module'
    return MODULE_LABELS[moduleKey.toUpperCase()] ?? moduleKey
  }, [moduleKey])

  if (moduleKey?.toLowerCase() === 'students') {
    return (
      <div className="min-h-screen text-white" style={{ background: '#070b12' }}>
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6 sm:py-16">
          <div className="rounded-2xl p-6 w-full" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h1 className="text-xl font-display font-semibold">Redirecting...</h1>
            <p className="mt-2 text-sm text-slate-400">Students dashboard is available at <code className="text-emerald-400">/modules/students</code>.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white" style={{ background: '#070b12' }}>
      <header className="border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Module Dashboard</p>
            <h1 className="text-2xl font-display font-semibold text-white">{label}</h1>
            <p className="text-sm text-slate-400">Tenant: {tenantId ?? 'public'}</p>
          </div>
          <Link
            className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 transition hover:text-emerald-400 sm:w-auto"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            to="/dashboard"
          >
            ← Back to main dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <span className="text-2xl font-bold text-emerald-400">{label.charAt(0)}</span>
          </div>
          <h2 className="text-xl font-display font-bold text-white">{label}</h2>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            The {label} module is active. Use the sidebar navigation to access specific features and reports.
          </p>
          <p className="mt-4 text-xs text-slate-500">Signed in as <span className="text-slate-300">{username ?? 'user'}</span> · Tenant: <span className="text-slate-300">{tenantId ?? 'public'}</span></p>
        </div>
      </main>
    </div>
  )
}
