import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { publicApiClient } from '../../api/publicClient'
import { useAuthStore } from '../../store/auth'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type LoginResponse = {
  access: string
  refresh: string
}

export default function PlatformLoginPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setAuthMode = useAuthStore((state) => state.setAuthMode)
  const setTenant = useAuthStore((state) => state.setTenant)
  const setUsername = useAuthStore((state) => state.setUsername)
  const setRole = useAuthStore((state) => state.setRole)
  const setPermissions = useAuthStore((state) => state.setPermissions)

  const [username, setUsernameInput] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const loginResponse = await publicApiClient.post<LoginResponse>('/auth/login/', {
        username: username.trim(),
        password,
      })
      setTokens(loginResponse.data.access, loginResponse.data.refresh)
      setAuthMode('platform')
      setTenant(null)
      setUsername(username.trim())
      setRole('GLOBAL_SUPER_ADMIN')
      setPermissions(['PLATFORM_ADMIN'])
      // Role-guard probe: this call is protected by IsGlobalSuperAdmin.
      await publicApiClient.get('/platform/analytics/overview/')
      navigate('/platform')
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Platform login failed or user is not a platform admin.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PageHero
        badge="PLATFORM"
        badgeColor="rose"
        title="Platform Login"
        subtitle="Manage platform login for this school"
        icon="🛡️"
      />
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-10 px-4 py-10 sm:px-6 sm:py-16 md:flex-row">
        <div className="flex-1 space-y-6">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">SMS Platform</p>
          <h1 className="text-4xl font-display font-semibold leading-tight md:text-5xl">
            Super Admin control center
          </h1>
          <p className="text-base text-slate-300">
            Platform-level access for tenant provisioning, support, monitoring, and analytics.
          </p>
        </div>
        <div className="w-full max-w-md rounded-3xl border border-white/[0.07] bg-[#0d1421]/70 p-6 shadow-2xl sm:p-8">
          <h2 className="text-xl font-display font-semibold">Platform sign in</h2>
          <p className="mt-2 text-sm text-slate-400">Public schema login for Global Super Admin users.</p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm">
              Username
              <input
                className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                placeholder="platform-admin"
                value={username}
                onChange={(event) => setUsernameInput(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Password
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <button
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-400">
            School user?{' '}
            <button type="button" className="text-emerald-300 hover:text-emerald-200" onClick={() => navigate('/login')}>
              Use tenant login
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
