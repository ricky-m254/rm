import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import { getRoleMeta } from '../lib/roleCatalog'
import { useAuthStore } from '../store/auth'
import {
  Eye, EyeOff, ArrowRight, Loader2, GraduationCap, Shield,
  BarChart3, Globe, Zap, Lock, Users, BookOpen, ChevronRight,
  Building2, WifiOff,
} from 'lucide-react'
import brandLogo from '@/assets/brand/rynatyschool-logo.png'
import { useTenantDetection } from '../hooks/useTenantDetection'

type LoginResponse = {
  access: string
  refresh: string
  role?: string | null
  available_roles?: string[]
  redirect_to?: string
  tenant_id?: string
  force_password_change?: boolean
}
type RoutingResponse = {
  user: string
  role: string | null
  available_roles?: string[]
  permissions?: string[]
  target?: string
  target_module?: string | null
  redirect_path?: string
}
type LoginError = { detail?: string }
type LoginMode = 'staff' | 'parent' | 'student'

const FEATURES = [
  { icon: GraduationCap, label: '28 Integrated Modules',    sub: 'Admissions to alumni — all in one place'   },
  { icon: BarChart3,     label: 'Real-time Analytics',      sub: 'Live KPIs, dashboards and reports'          },
  { icon: Shield,        label: 'IPSAS-Compliant Finance',  sub: 'Full audit trail and accountability'        },
  { icon: Globe,         label: 'Multi-tenant Architecture',sub: 'Scale across a network of schools'          },
  { icon: Zap,           label: 'CBC Kenya Aligned',        sub: 'PP1 through Grade 9 curriculum-ready'       },
  { icon: Lock,          label: 'Enterprise-grade Security',sub: 'Role-based access & encrypted data'         },
]

const MODES: { key: LoginMode; label: string; icon: typeof Shield; hint: string; userLabel: string; userPlaceholder: string }[] = [
  {
    key: 'staff',
    label: 'Staff / Admin',
    icon: Shield,
    hint: 'Teachers, accountants, administrators and school management staff.',
    userLabel: 'Username',
    userPlaceholder: 'admin',
  },
  {
    key: 'parent',
    label: 'Parent / Guardian',
    icon: Users,
    hint: 'Use your username, email address, or phone number and your password.',
    userLabel: 'Username / Email / Phone',
    userPlaceholder: 'parent_kamau or 0700000000',
  },
  {
    key: 'student',
    label: 'Student',
    icon: BookOpen,
    hint: 'Use your username. Admission number login still works temporarily during the transition.',
    userLabel: 'Username or Admission Number',
    userPlaceholder: 'student_001 or STM2025001',
  },
]

function FloatingOrb({ size, color, top, left, delay }: {
  size: number; color: string; top: string; left: string; delay: number
}) {
  return (
    <div
      className="absolute rounded-full pointer-events-none blur-3xl opacity-20 animate-pulse"
      style={{ width: size, height: size, background: color, top, left, animationDelay: `${delay}s`, animationDuration: '5s' }}
    />
  )
}

function RoleSelectModal({
  roles,
  onSelect,
  isLoading,
}: {
  roles: string[]
  onSelect: (role: string) => void
  isLoading: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(7,11,18,0.88)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 space-y-6"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Select your role</h3>
          <p className="text-sm text-slate-400">
            Your account has access to multiple roles. Choose which dashboard to open.
          </p>
        </div>
        <div className="space-y-3">
          {roles.map(role => {
            const roleMeta = getRoleMeta(role)
            const meta = { label: roleMeta.shortLabel, description: roleMeta.description, color: roleMeta.accentColor }
            return (
              <button
                key={role}
                disabled={isLoading}
                onClick={() => onSelect(role)}
                className="w-full flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${meta.color}28` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-[13px]"
                  style={{ background: `${meta.color}18`, color: meta.color }}
                >
                  {meta.label.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{meta.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{meta.description}</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
              </button>
            )
          })}
        </div>
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            <span>Redirecting…</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const {
    setTokens, setTenant, setAuthMode, setUsername,
    setRole, setPermissions, setAssignedModules, setAvailableRoles,
    tenantId: storedTenant,
  } = useAuthStore()

  const subdomainTenant = useTenantDetection()

  const [mode,          setMode]          = useState<LoginMode>('staff')
  const [username,      setUsernameInput] = useState('')
  const [password,      setPassword]      = useState('')
  const [tenantId,      setTenantId]      = useState(storedTenant ?? 'demo_school')
  const [error,         setError]         = useState<string | null>(null)
  const [isLoading,     setIsLoading]     = useState(false)
  const [showPass,      setShowPass]      = useState(false)
  const [mounted,       setMounted]       = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [pendingRoles,  setPendingRoles]  = useState<string[]>([])
  const [roleSwitching, setRoleSwitching] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Auto-fill tenant when resolved from subdomain
  useEffect(() => {
    if (subdomainTenant.detected && subdomainTenant.tenantId) {
      setTenantId(subdomainTenant.tenantId)
    }
  }, [subdomainTenant.detected, subdomainTenant.tenantId])

  const activeMode = MODES.find(m => m.key === mode)!

  /** Derive a final navigation path from the routing response */
  const resolveRedirect = (routing: RoutingResponse, loginRedirectTo?: string): string => {
    if (loginRedirectTo && loginRedirectTo !== '/dashboard') return loginRedirectTo
    if (routing.redirect_path) return routing.redirect_path
    if (routing.target === 'PARENT_PORTAL') return '/modules/parent-portal/dashboard'
    if (routing.target === 'STUDENT_PORTAL') return '/student-portal'
    return '/dashboard'
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const tid = tenantId.trim() || null

      // Explicit tenant header on every call.
      const tenantHeaders = tid ? { 'X-Tenant-ID': tid } : {}

      console.log('[LOGIN] attempt', { url: `${apiClient.defaults.baseURL}/auth/login/`, username: username.trim(), tenantId: tid, headers: tenantHeaders })

      // 1. Login — response includes role, available_roles, redirect_to, tenant_id
      const loginRes = await apiClient.post<LoginResponse>(
        '/auth/login/',
        { username: username.trim(), password },
        { headers: tenantHeaders },
      )
      console.log('[LOGIN] success', { role: loginRes.data.role, tenant_id: loginRes.data.tenant_id })

      const resolvedTenantId = loginRes.data.tenant_id || tid

      // Explicit auth headers for ALL subsequent calls — DO NOT call setTokens() yet.
      // If we write tokens to the store here, React re-renders the /login route with
      // isTenantAuth=true, which fires <Navigate to="/dashboard" replace /> BEFORE our
      // final navigate() call, sending portal users (PARENT/STUDENT) to the staff
      // dashboard. By deferring store writes until after all awaits, we ensure the
      // first render with isTenantAuth=true happens at the correct destination URL.
      const authHeaders: Record<string, string> = {
        Authorization: `Bearer ${loginRes.data.access}`,
        ...(resolvedTenantId ? { 'X-Tenant-ID': resolvedTenantId } : {}),
      }

      // 2. Fetch routing (permissions + module list)
      const routing = await apiClient.get<RoutingResponse>('/dashboard/routing/', { headers: authHeaders })

      // 3. Fetch full profile (authoritative role + module keys)
      let meRole: string | null = loginRes.data.role ?? null
      let meModules: string[] = []
      try {
        const me = await apiClient.get<{ role: string; assigned_module_keys: string[] }>('/auth/me/', { headers: authHeaders })
        meModules = me.data.assigned_module_keys ?? []
        if (me.data.role) meRole = me.data.role
      } catch { /* fall back to login role */ }

      // 4. Available roles — prefer routing (freshest), fall back to login response
      const available: string[] = (
        (routing.data.available_roles ?? loginRes.data.available_roles ?? []).filter(Boolean) as string[]
      )

      // 5. Persist minimal user context in localStorage (audit / quick reads)
      try {
        localStorage.setItem('sms_user', JSON.stringify({
          username: username.trim(),
          role: routing.data.role ?? loginRes.data.role,
          tenant_id: resolvedTenantId ?? tenantId.trim(),
          permissions: routing.data.permissions ?? [],
        }))
      } catch { /* ignore */ }

      // 6. Multi-role: show selector — commit store writes first so modal has context
      if (available.length > 1) {
        setTokens(loginRes.data.access, loginRes.data.refresh)
        setAuthMode('tenant')
        setUsername(username.trim())
        if (meRole) setRole(meRole)
        if (resolvedTenantId) setTenant(resolvedTenantId)
        setPermissions(routing.data.permissions ?? [])
        setAssignedModules(meModules)
        setAvailableRoles(available)
        setPendingRoles(available)
        setShowRoleModal(true)
        return
      }

      // 7. Single role — commit ALL store writes + navigate in one synchronous block.
      // React 18 automatic batching ensures these and the router state update from
      // navigate() all flush together in a single render at the destination URL,
      // so the /login guard never sees isTenantAuth=true while still at /login.
      const destination = resolveRedirect(routing.data, loginRes.data.redirect_to)
      setTokens(loginRes.data.access, loginRes.data.refresh)
      setAuthMode('tenant')
      setUsername(username.trim())
      if (meRole) setRole(meRole)
      if (resolvedTenantId) setTenant(resolvedTenantId)
      setPermissions(routing.data.permissions ?? [])
      setAssignedModules(meModules)
      setAvailableRoles(available)
      navigate(destination)
    } catch (err) {
      const errResp = (err as { response?: { data?: LoginError; status?: number } })?.response
      console.error('[LOGIN] failed', { status: errResp?.status, data: errResp?.data, noResponse: !errResp })
      const msg = errResp?.data?.detail
      if (msg) {
        setError(msg)
      } else if (errResp?.status === 400) {
        setError('Invalid School ID or request. Please check and try again.')
      } else if (!errResp) {
        setError('Cannot reach the server. Check your network connection and try again.')
      } else {
        setError('Invalid credentials. Please check your details.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleSelect = async (role: string) => {
    setRoleSwitching(true)
    try {
      const res = await apiClient.post<{ role: string; redirect_to: string }>('/auth/role-switch/', { role })
      setRole(res.data.role)
      setShowRoleModal(false)
      navigate(res.data.redirect_to ?? '/dashboard')
    } catch {
      setError('Failed to switch role. Please log in again.')
      setShowRoleModal(false)
    } finally {
      setRoleSwitching(false)
    }
  }

  return (
    <>
      {showRoleModal && (
        <RoleSelectModal
          roles={pendingRoles}
          onSelect={handleRoleSelect}
          isLoading={roleSwitching}
        />
      )}

      <div className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden" style={{ background: '#070b12' }}>

        {/* ── Left brand panel ────────────────────────── */}
        <div
          className="relative hidden lg:flex flex-col justify-between w-[500px] xl:w-[560px] flex-shrink-0 overflow-hidden"
          style={{
            background: 'linear-gradient(150deg, #0a1f3a 0%, #070b12 55%, #061220 100%)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <FloatingOrb size={500} color="radial-gradient(circle, #10b98135, transparent)" top="-15%"  left="-25%" delay={0} />
          <FloatingOrb size={350} color="radial-gradient(circle, #0ea5e928, transparent)" top="55%"  left="55%"  delay={2.5} />
          <FloatingOrb size={280} color="radial-gradient(circle, #8b5cf618, transparent)" top="75%"  left="-8%"  delay={1.2} />
          <FloatingOrb size={200} color="radial-gradient(circle, #10b98120, transparent)" top="30%"  left="70%"  delay={3.5} />

          <div
            className="absolute inset-0 pointer-events-none opacity-[0.035]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />

          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, #10b981, #0ea5e9, transparent)' }} />

          <div className={`relative z-10 px-12 pt-8 pb-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-10 w-full">
              <img
                src={brandLogo}
                alt="RynatySchool SmartCampus"
                className="w-full h-auto max-h-20 object-contain object-left select-none"
                draggable={false}
              />
            </div>

            <h1 className="text-[38px] xl:text-[44px] font-display font-bold text-white leading-[1.12] mb-5 tracking-tight">
              Powering Smart Schools,<br />
              <span style={{
                background: 'linear-gradient(90deg, #10b981 0%, #0ea5e9 60%, #6366f1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>from Africa to the World.</span>
            </h1>
            <p className="text-slate-400 text-[14px] leading-relaxed mb-10 max-w-[340px]">
              The most advanced school management platform built for Africa's educators — CBC-aligned, IPSAS-compliant, and enterprise-ready.
            </p>

            <div className="space-y-3.5">
              {FEATURES.map((f, i) => (
                <div
                  key={f.label}
                  className={`flex items-center gap-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}
                  style={{ transitionDelay: `${i * 70 + 150}ms` }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.18)' }}>
                    <f.icon size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-200 leading-none">{f.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 px-12 pb-10">
            <div className="border-t border-white/[0.05] pt-6">
              <p className="text-[11px] text-slate-700">
                © {new Date().getFullYear()} RynatySpace Technologies Ltd. All rights reserved.
              </p>
              <p className="text-[10px] text-slate-800 mt-0.5">
                RynatySchool SmartCampus · Powering Smart Schools
              </p>
            </div>
          </div>
        </div>

        {/* ── Right form panel ────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-8 sm:py-12 relative overflow-hidden min-h-screen lg:min-h-0">
          <div className="absolute pointer-events-none"
            style={{
              width: 600, height: 600,
              background: 'radial-gradient(circle, #10b98112 0%, transparent 70%)',
              top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            }}
          />

          <div className={`relative w-full max-w-[420px] transition-all duration-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

            <div className="flex items-start mb-8 lg:hidden">
              <img src={brandLogo} alt="RynatySchool SmartCampus" className="h-12 w-auto object-contain object-left select-none" draggable={false} />
            </div>

            {/* Suspended tenant screen */}
            {subdomainTenant.errorCode === 'TENANT_SUSPENDED' && (
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <Lock size={28} className="text-red-400" />
                </div>
                <h2 className="text-[22px] font-display font-bold text-white mb-2">Account Suspended</h2>
                <p className="text-slate-400 text-[13px] leading-relaxed mb-1">
                  {subdomainTenant.tenantName && <strong className="text-white">{subdomainTenant.tenantName}</strong>}
                  {subdomainTenant.tenantName ? "'s" : "This school's"} account has been suspended.
                </p>
                <p className="text-slate-500 text-[12px] mb-6">
                  Please contact the RynatySpace support team or your school administrator to resolve this.
                </p>
                <a
                  href="mailto:support@rynatyspace.com"
                  className="rounded-xl px-5 py-2.5 text-[12px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  Contact Support
                </a>
                <p className="mt-4 text-[11px] text-slate-700">
                  Subdomain: <code className="text-slate-600">{subdomainTenant.subdomain}</code>
                </p>
              </div>
            )}

            {/* Not found tenant screen */}
            {subdomainTenant.subdomain && subdomainTenant.errorCode === 'TENANT_NOT_FOUND' && !subdomainTenant.loading && (
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <WifiOff size={28} className="text-amber-400" />
                </div>
                <h2 className="text-[22px] font-display font-bold text-white mb-2">School Not Found</h2>
                <p className="text-slate-400 text-[13px] leading-relaxed mb-1">
                  No school is registered at{' '}
                  <code className="text-amber-300 text-[12px]">{subdomainTenant.subdomain}</code>.
                </p>
                <p className="text-slate-500 text-[12px] mb-6">
                  Please check your link or contact your school to confirm the correct address.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.href = '/'}
                  className="rounded-xl px-5 py-2.5 text-[12px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  Go to SmartCampus Home
                </button>
              </div>
            )}

            {/* Normal login form — hidden when showing error states */}
            {!subdomainTenant.errorCode && (
            <>
            <div className="mb-6">
              {subdomainTenant.detected && subdomainTenant.tenantName ? (
                <>
                  <div className="flex items-center gap-2.5 mb-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                    <Building2 size={15} className="text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] text-emerald-400 font-semibold uppercase tracking-widest">School detected</p>
                      <p className="text-[13px] font-bold text-white">{subdomainTenant.tenantName}</p>
                    </div>
                  </div>
                  <h2 className="text-[28px] font-display font-bold text-white leading-tight mb-1">Welcome back</h2>
                  <p className="text-slate-500 text-[13px]">Sign in to your SmartCampus account.</p>
                </>
              ) : (
                <>
                  <h2 className="text-[28px] font-display font-bold text-white leading-tight mb-1">Welcome back</h2>
                  <p className="text-slate-500 text-[13px]">Sign in to your SmartCampus account.</p>
                </>
              )}
            </div>

            {/* ── Login type tabs ── */}
            <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {MODES.map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => { setMode(m.key); setError(null) }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition-all duration-200"
                  style={
                    mode === m.key
                      ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                      : { color: '#64748b', border: '1px solid transparent' }
                  }
                >
                  <m.icon size={12} />
                  <span className="hidden sm:inline">{m.label}</span>
                  <span className="sm:hidden">{m.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Hint banner for current mode */}
            <div className="mb-5 rounded-xl px-3.5 py-2.5 flex items-start gap-2.5"
              style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)' }}>
              <activeMode.icon size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-slate-400 leading-relaxed">{activeMode.hint}</p>
            </div>

            {/* Form */}
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {/* Tenant ID — locked when auto-detected from subdomain */}
              {!subdomainTenant.detected && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-[0.12em]">
                    School ID
                  </label>
                  {subdomainTenant.loading ? (
                    <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-[13px] text-slate-500"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Detecting school…</span>
                    </div>
                  ) : (
                    <input
                      value={tenantId}
                      onChange={e => setTenantId(e.target.value)}
                      placeholder="demo_school"
                      autoComplete="organization"
                      className="w-full rounded-xl px-4 py-3 text-[13px] text-white placeholder-slate-600 outline-none transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; e.target.style.background = 'rgba(16,185,129,0.04)' }}
                      onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
                    />
                  )}
                  {(mode === 'student' || mode === 'parent') && !subdomainTenant.loading && (
                    <p className="text-[10px] text-slate-600 mt-1.5">
                      Your school's unique ID — printed on your fee invoice or letter. Ask the school office if unsure.
                    </p>
                  )}
                </div>
              )}

              {/* Username / Admission No */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-[0.12em]">
                  {activeMode.userLabel}
                </label>
                <input
                  value={username}
                  onChange={e => setUsernameInput(e.target.value)}
                  placeholder={activeMode.userPlaceholder}
                  autoComplete="username"
                  className="w-full rounded-xl px-4 py-3 text-[13px] text-white placeholder-slate-600 outline-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; e.target.style.background = 'rgba(16,185,129,0.04)' }}
                  onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-[0.12em]">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-xl px-4 py-3 pr-11 text-[13px] text-white placeholder-slate-600 outline-none transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; e.target.style.background = 'rgba(16,185,129,0.04)' }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition p-1"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl px-4 py-3 text-[12px] text-rose-300 flex items-start gap-2"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <span className="mt-0.5 flex-shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 text-[13px] font-bold text-white transition-all duration-200 mt-2 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                {isLoading
                  ? <><Loader2 size={15} className="animate-spin" /> Signing in…</>
                  : <><span>Sign in to SmartCampus</span><ArrowRight size={15} /></>
                }
              </button>
            </form>

            {/* Student special note */}
            {mode === 'student' && (
              <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/05 px-4 py-3">
                <p className="text-[11px] text-violet-300 font-semibold mb-0.5">Student Portal Access</p>
                <p className="text-[10px] text-slate-500">After signing in, you will be redirected to your personal student portal where you can view results, attendance, and notices.</p>
              </div>
            )}

            {/* Parent special note */}
            {mode === 'parent' && (
              <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/05 px-4 py-3">
                <p className="text-[11px] text-sky-300 font-semibold mb-0.5">Parent Portal Access</p>
                <p className="text-[10px] text-slate-500">You will see your child's academic progress, fee balance, transport tracking, and school communications in the parent portal.</p>
              </div>
            )}

            {/* Tagline */}
            <div className="mt-6 pt-5 border-t border-white/[0.05] text-center">
              <p className="text-[11px] text-slate-700 tracking-wide uppercase font-medium">
                Powering Smart Schools · From Africa to The World.
              </p>
            </div>

            {/* Platform admin link */}
            <p className="mt-3 text-center text-[12px] text-slate-600">
              Platform administrator?{' '}
              <button
                type="button"
                className="font-semibold transition hover:opacity-80"
                style={{ color: '#10b981' }}
                onClick={() => navigate('/platform/login')}
              >
                Super Admin login →
              </button>
            </p>
            </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
