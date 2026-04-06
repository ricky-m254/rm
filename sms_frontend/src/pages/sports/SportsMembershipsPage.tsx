import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Club = {
  id: number
  name: string
  club_type: string
}

type Student = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
  is_active: boolean
}

type Membership = {
  id: number
  club: number
  club_name?: string
  student: number
  student_name?: string
  role: string
  joined_date: string
  is_active: boolean
}

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  return Array.isArray(value) ? value : (value.results ?? [])
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const data = (error.response as { data?: Record<string, unknown> }).data
    if (typeof data?.detail === 'string') return data.detail
    if (typeof data?.error === 'string') return data.error
    if (Array.isArray(data?.non_field_errors) && typeof data.non_field_errors[0] === 'string') {
      return data.non_field_errors[0]
    }
  }
  return fallback
}

const ROLES = ['Member', 'Captain', 'Vice Captain', 'Secretary']

export default function SportsMembershipsPage() {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [clubId, setClubId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [role, setRole] = useState('Member')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Membership | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [membershipsResponse, clubsResponse, studentsResponse] = await Promise.all([
        apiClient.get<Membership[] | { results: Membership[] }>('/sports/memberships/'),
        apiClient.get<Club[] | { results: Club[] }>('/sports/clubs/'),
        apiClient.get<Student[] | { results: Student[] }>('/students/?limit=200'),
      ])
      setMemberships(asArray(membershipsResponse.data))
      setClubs(asArray(clubsResponse.data))
      setStudents(asArray(studentsResponse.data))
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load memberships.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const reset = () => {
    setEditingId(null)
    setClubId('')
    setStudentId('')
    setRole('Member')
    setIsActive(true)
  }

  const startEdit = (membership: Membership) => {
    setEditingId(membership.id)
    setClubId(String(membership.club))
    setStudentId(String(membership.student))
    setRole(membership.role)
    setIsActive(membership.is_active)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    if (!clubId || !studentId) return
    setSaving(true)
    setError(null)
    setNotice(null)
    const payload = {
      club: Number(clubId),
      student: Number(studentId),
      role,
      is_active: isActive,
    }
    try {
      if (editingId) {
        await apiClient.patch(`/sports/memberships/${editingId}/`, payload)
        setNotice('Membership updated.')
      } else {
        await apiClient.post('/sports/memberships/', payload)
        setNotice('Membership created.')
      }
      reset()
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save membership.'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await apiClient.delete(`/sports/memberships/${deleteTarget.id}/`)
      setDeleteTarget(null)
      await load()
    } catch (deleteRequestError) {
      setDeleteError(getErrorMessage(deleteRequestError, 'Unable to delete membership.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="SPORTS & CO-CURRICULAR"
        badgeColor="amber"
        title="Club Memberships"
        subtitle="Track who belongs to each club, team, and society."
        icon={Users}
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <div className="rounded-2xl glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">{editingId ? 'Edit Membership' : 'New Membership'}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={clubId} onChange={(event) => setClubId(event.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option value="">Select club *</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name} ({club.club_type})
              </option>
            ))}
          </select>
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option value="">Select student *</option>
            {students
              .filter((student) => student.is_active)
              .map((student) => (
                <option key={student.id} value={student.id}>
                  {student.admission_number} - {student.first_name} {student.last_name}
                </option>
              ))}
          </select>
          <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            {ROLES.map((membershipRole) => (
              <option key={membershipRole} value={membershipRole}>
                {membershipRole}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-3 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-200">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Active membership
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={save} disabled={saving || !clubId || !studentId} className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">
            {saving ? 'Saving...' : editingId ? 'Update Membership' : 'Create Membership'}
          </button>
          {editingId ? (
            <button onClick={reset} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200">
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl glass-panel overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.07] text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Club</th>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : (
              memberships.map((membership) => (
                <tr key={membership.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold text-slate-200">{membership.club_name || `Club #${membership.club}`}</td>
                  <td className="px-4 py-3 text-slate-300">{membership.student_name || `Student #${membership.student}`}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">{membership.role}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{membership.joined_date}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        membership.is_active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-500/15 text-slate-300'
                      }`}
                    >
                      {membership.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(membership)} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(membership)} className="text-xs font-semibold text-rose-400 hover:text-rose-300">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && memberships.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No memberships recorded.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Membership"
        description={`Remove ${deleteTarget?.student_name || 'this student'} from ${deleteTarget?.club_name || 'this club'}?`}
        confirmLabel="Delete"
        isProcessing={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
