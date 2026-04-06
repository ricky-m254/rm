import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { getParentPortalErrorMessage } from './errors'

type Borrowing = {
  id: number
  book_title?: string
  isbn?: string
  due_date: string | null
  borrowed_date?: string
  status?: string
}

type HistoryItem = {
  id: number
  book_title?: string
  borrowed_date?: string
  returned_date?: string
}

type Profile = {
  id: number
  first_name: string
  last_name: string
  email: string
  username: string
  force_password_change?: boolean
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function ParentPortalLibraryProfilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [borrowings, setBorrowings] = useState<Borrowing[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [submittingPassword, setSubmittingPassword] = useState(false)

  const loadPage = async () => {
    setLoading(true)
    setError(null)
    setLibraryError(null)
    try {
      const profileRes = await apiClient.get<Profile>('/parent-portal/profile/')
      const nextProfile = profileRes.data ?? null
      setProfile(nextProfile)

      if (nextProfile?.force_password_change) {
        setBorrowings([])
        setHistory([])
        return
      }

      try {
        const [borrowingsRes, historyRes] = await Promise.all([
          apiClient.get<Borrowing[] | { results: Borrowing[] }>('/parent-portal/library/borrowings/'),
          apiClient.get<HistoryItem[] | { results: HistoryItem[] }>('/parent-portal/library/history/'),
        ])
        setBorrowings(asArray(borrowingsRes.data))
        setHistory(asArray(historyRes.data))
      } catch (err) {
        setBorrowings([])
        setHistory([])
        setLibraryError(getParentPortalErrorMessage(err, 'Unable to load library activity.'))
      }
    } catch (err) {
      setError(getParentPortalErrorMessage(err, 'Unable to load library profile.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPage()
  }, [])

  const mustChangePassword =
    Boolean(profile?.force_password_change) ||
    (!profile && searchParams.get('force_password_change') === '1')

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)
    setSubmittingPassword(true)
    try {
      await apiClient.post('/parent-portal/profile/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setPasswordSuccess('Password updated successfully. Your full parent portal access is now restored.')
      await loadPage()
      navigate('/modules/parent-portal/library-profile', { replace: true })
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setPasswordError(apiError || 'Unable to change password.')
    } finally {
      setSubmittingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Library & Profile"
        subtitle={mustChangePassword
          ? 'Change your temporary password to unlock the rest of the parent portal.'
          : 'Manage your child\'s library borrowings and your account profile.'}
        icon="📋"
      />

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {libraryError ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {libraryError}
        </div>
      ) : null}

      {mustChangePassword ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Your account is using a temporary parent credential. Change your password before continuing to the rest of the portal.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl glass-panel p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">Parent Profile</h2>
          {loading ? <p className="text-xs text-slate-400">Loading...</p> : profile ? (
            <div className="space-y-2 text-xs text-slate-300">
              <p><span className="text-slate-500">Name:</span> {profile.first_name} {profile.last_name}</p>
              <p><span className="text-slate-500">Email:</span> {profile.email || 'N/A'}</p>
              <p><span className="text-slate-500">Username:</span> {profile.username}</p>
            </div>
          ) : <p className="text-xs text-slate-500">No profile data.</p>}
        </section>

        <section className="rounded-xl glass-panel p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">
            {mustChangePassword ? 'Reset Required' : `Active Borrowings (${borrowings.length})`}
          </h2>

          {mustChangePassword ? (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Enter your current password"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Minimum 8 characters"
                />
              </div>

              {passwordError ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {passwordError}
                </div>
              ) : null}

              {passwordSuccess ? (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  {passwordSuccess}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submittingPassword}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          ) : loading ? <p className="text-xs text-slate-400">Loading...</p> : borrowings.length === 0 ? (
            <p className="text-xs text-slate-500">No active borrowings.</p>
          ) : (
            <div className="space-y-2">
              {borrowings.map((borrowing) => {
                const days = daysUntil(borrowing.due_date)
                const isOverdue = days !== null && days < 0
                return (
                  <div key={borrowing.id} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        {borrowing.book_title || `Borrowing #${borrowing.id}`}
                      </p>
                      {borrowing.due_date ? (
                        <p className="text-xs text-slate-400">
                          Due: {new Date(borrowing.due_date).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                    {days !== null ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isOverdue ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {!mustChangePassword ? (
        <section className="rounded-xl glass-panel p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">Borrowing History ({history.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-white/[0.07] text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Book</th>
                  <th className="px-3 py-2 font-medium">Borrowed</th>
                  <th className="px-3 py-2 font-medium">Returned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-400">Loading...</td></tr> : history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/20">
                    <td className="px-3 py-2 text-slate-200">{item.book_title || `Item #${item.id}`}</td>
                    <td className="px-3 py-2 text-slate-400">{item.borrowed_date ? new Date(item.borrowed_date).toLocaleDateString() : '-'}</td>
                    <td className="px-3 py-2 text-emerald-400">{item.returned_date ? new Date(item.returned_date).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
                {!loading && history.length === 0 ? <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-500">No borrowing history.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
