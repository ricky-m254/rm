import { useEffect, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type AdminRole = 'OWNER' | 'ADMIN' | 'SUPPORT' | 'AUDITOR'

type PlatformAdminUser = {
  id: number
  user_id: number
  username: string
  email: string
  role: AdminRole
  is_active: boolean
  is_staff: boolean
  is_superuser: boolean
  created_at: string
  updated_at: string
}

type ConfirmAction =
  | { kind: 'none' }
  | { kind: 'revoke'; row: PlatformAdminUser }
  | { kind: 'toggle-active'; row: PlatformAdminUser }
  | { kind: 'reset-password'; row: PlatformAdminUser }

const ROLE_OPTIONS: AdminRole[] = ['OWNER', 'ADMIN', 'SUPPORT', 'AUDITOR']

export default function PlatformAdminUsersPage() {
  const [rows, setRows] = useState<PlatformAdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>({ kind: 'none' })
  const [newPasswords, setNewPasswords] = useState<Record<number, string>>({})
  const [roleEdits, setRoleEdits] = useState<Record<number, AdminRole>>({})
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'ADMIN' as AdminRole,
    is_active: true,
  })

  const loadAdmins = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await publicApiClient.get<PlatformAdminUser[] | { results: PlatformAdminUser[]; count: number }>('/platform/admin-users/')
      const items = normalizePaginatedResponse(response.data).items
      setRows(items)
      setRoleEdits(
        items.reduce<Record<number, AdminRole>>((acc, item) => {
          acc[item.id] = item.role
          return acc
        }, {}),
      )
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load platform admin users.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAdmins()
  }, [])

  const grantAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)
    try {
      await publicApiClient.post('/platform/admin-users/', {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
        role: form.role,
        is_active: form.is_active,
      })
      setMessage(`Saved super admin user "${form.username.trim()}".`)
      setForm({ username: '', email: '', password: '', role: 'ADMIN', is_active: true })
      await loadAdmins()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to save super admin user.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateAdmin = async (row: PlatformAdminUser, payload: Record<string, unknown>, successMessage: string) => {
    setError(null)
    setMessage(null)
    setIsSubmitting(true)
    try {
      await publicApiClient.patch(`/platform/admin-users/${row.id}/update/`, payload)
      setMessage(successMessage)
      await loadAdmins()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to update admin user.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const revokeAdmin = async (row: PlatformAdminUser) => {
    setError(null)
    setMessage(null)
    setIsConfirming(true)
    try {
      await publicApiClient.post(`/platform/admin-users/${row.id}/revoke/`, {})
      setMessage(`Revoked "${row.username}".`)
      await loadAdmins()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to revoke admin user.'))
    } finally {
      setIsConfirming(false)
      setConfirmAction({ kind: 'none' })
    }
  }

  const resetPassword = async (row: PlatformAdminUser) => {
    const nextPassword = (newPasswords[row.id] || '').trim()
    if (!nextPassword) {
      setError(`Enter a new password for "${row.username}" first.`)
      return
    }
    if (nextPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError(null)
    setMessage(null)
    setIsConfirming(true)
    try {
      await publicApiClient.post(`/platform/admin-users/${row.id}/reset-password/`, {
        password: nextPassword,
      })
      setNewPasswords((prev) => ({ ...prev, [row.id]: '' }))
      setMessage(`Password reset for "${row.username}".`)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to reset admin password.'))
    } finally {
      setIsConfirming(false)
      setConfirmAction({ kind: 'none' })
    }
  }

  const confirmTitle =
    confirmAction.kind === 'revoke'
      ? 'Revoke Super Admin Access'
      : confirmAction.kind === 'toggle-active'
        ? 'Update Admin Status'
        : confirmAction.kind === 'reset-password'
          ? 'Reset Admin Password'
          : 'Confirm'

  const confirmDescription =
    confirmAction.kind === 'revoke'
      ? `This will revoke platform admin access for "${confirmAction.row.username}".`
      : confirmAction.kind === 'toggle-active'
        ? `This will ${confirmAction.row.is_active ? 'deactivate' : 'activate'} "${confirmAction.row.username}".`
        : confirmAction.kind === 'reset-password'
          ? `Reset password for "${confirmAction.row.username}" using the value entered in this row.`
          : ''

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Super Admin Users & Roles"
        subtitle="Manage platform administrators: create users, change roles, activate/deactivate, revoke access, and reset passwords."
        icon="📋"
      />
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Create or Grant Super Admin</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-5" onSubmit={grantAdmin}>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="username" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} required />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="email" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="password (optional)" type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as AdminRole }))}>
            {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
            Active
          </label>
          <button className="md:col-span-5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Admin User'}
          </button>
        </form>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Current Platform Admins</h2>
          <button className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm" onClick={() => void loadAdmins()}>Refresh</button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[1180px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Flags</th>
                <th className="px-3 py-2">Password Reset</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? <tr><td className="px-3 py-3 text-slate-400" colSpan={7}>Loading platform admins...</td></tr> : null}
              {rows.map((row) => (
                <tr key={row.id} className="bg-slate-950/50">
                  <td className="px-3 py-2">{row.username}</td>
                  <td className="px-3 py-2">{row.email || '--'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded border border-white/[0.09] bg-slate-950 px-2 py-1 text-xs"
                        value={roleEdits[row.id] ?? row.role}
                        onChange={(e) => setRoleEdits((prev) => ({ ...prev, [row.id]: e.target.value as AdminRole }))}
                      >
                        {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                      <button
                        className="rounded border border-white/[0.09] px-2 py-1 text-xs"
                        onClick={() => void updateAdmin(row, { role: roleEdits[row.id] ?? row.role }, `Role updated for "${row.username}".`)}
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">{row.is_active ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{row.is_superuser ? 'Superuser' : 'GlobalAdmin'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        className="w-44 rounded border border-white/[0.09] bg-slate-950 px-2 py-1 text-xs"
                        type="password"
                        placeholder="new password"
                        value={newPasswords[row.id] ?? ''}
                        onChange={(e) => setNewPasswords((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      />
                      <button
                        className="rounded border border-white/[0.09] px-2 py-1 text-xs"
                        onClick={() => setConfirmAction({ kind: 'reset-password', row })}
                      >
                        Reset
                      </button>
                    </div>
                  </td>
                  <td className="space-x-2 px-3 py-2">
                    <button
                      className="rounded border border-white/[0.09] px-2 py-1 text-xs"
                      onClick={() => setConfirmAction({ kind: 'toggle-active', row })}
                    >
                      {row.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="rounded border border-rose-500/60 px-2 py-1 text-xs text-rose-300"
                      onClick={() => setConfirmAction({ kind: 'revoke', row })}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 ? <tr><td className="px-3 py-4 text-slate-400" colSpan={7}>No platform admins found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={confirmAction.kind !== 'none'}
        title={confirmTitle}
        description={confirmDescription}
        isProcessing={isConfirming}
        onCancel={() => setConfirmAction({ kind: 'none' })}
        onConfirm={() => {
          if (confirmAction.kind === 'revoke') {
            void revokeAdmin(confirmAction.row)
            return
          }
          if (confirmAction.kind === 'toggle-active') {
            void updateAdmin(
              confirmAction.row,
              { is_active: !confirmAction.row.is_active },
              `Status updated for "${confirmAction.row.username}".`,
            )
            setConfirmAction({ kind: 'none' })
            return
          }
          if (confirmAction.kind === 'reset-password') {
            void resetPassword(confirmAction.row)
            return
          }
        }}
      />
    </div>
  )
}

