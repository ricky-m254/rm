import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type StaffRow = { id: number; staff_id: string; full_name: string }
type ProfilePayload = {
  staff: StaffRow & { staff_type: string; employment_type: string; status: string; email_work: string; phone_primary: string; join_date: string | null }
  qualifications: Array<{ id: number; qualification_type: string; title: string; institution: string; year_obtained: number | null }>
  emergency_contacts: Array<{ id: number; name: string; relationship: string; phone_primary: string; is_primary: boolean }>
  assignments: Array<{ id: number; department_name: string; role_name: string; is_primary: boolean }>
}

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function StaffProfilesPage() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null)
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [qualificationTitle, setQualificationTitle] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const [deleteQualTarget, setDeleteQualTarget] = useState<{ id: number; title: string } | null>(null)
  const [deletingQual, setDeletingQual] = useState(false)
  const [deleteQualError, setDeleteQualError] = useState<string | null>(null)

  const [deleteContactTarget, setDeleteContactTarget] = useState<{ id: number; name: string } | null>(null)
  const [deletingContact, setDeletingContact] = useState(false)
  const [deleteContactError, setDeleteContactError] = useState<string | null>(null)

  const selected = useMemo(() => staff.find((row) => row.id === selectedStaffId) ?? null, [staff, selectedStaffId])

  const loadStaff = async () => {
    const response = await apiClient.get<StaffRow[] | { results: StaffRow[] }>('/staff/')
    const rows = asArray(response.data)
    setStaff(rows)
    if (!selectedStaffId && rows.length > 0) setSelectedStaffId(rows[0].id)
  }

  const loadProfile = async (staffId: number) => {
    const response = await apiClient.get<ProfilePayload>(`/staff/${staffId}/profile/`)
    setProfile(response.data)
  }

  useEffect(() => {
    const load = async () => {
      setError(null)
      try { await loadStaff() }
      catch { setError('Unable to load staff profiles.') }
    }
    void load()
  }, [])

  useEffect(() => {
    if (!selectedStaffId) return
    const load = async () => {
      try { await loadProfile(selectedStaffId) }
      catch { setError('Unable to load selected staff profile.') }
    }
    void load()
  }, [selectedStaffId])

  const addQualification = async () => {
    if (!selectedStaffId || !qualificationTitle.trim()) return
    setError(null); setNotice(null)
    try {
      await apiClient.post('/staff/qualifications/', { staff: selectedStaffId, qualification_type: 'Certificate', title: qualificationTitle.trim() })
      setQualificationTitle(''); await loadProfile(selectedStaffId); setNotice('Qualification added.')
    } catch { setError('Unable to add qualification.') }
  }

  const confirmDeleteQual = async () => {
    if (!deleteQualTarget || !selectedStaffId) return
    setDeletingQual(true); setDeleteQualError(null)
    try { await apiClient.delete(`/staff/qualifications/${deleteQualTarget.id}/`); setDeleteQualTarget(null); await loadProfile(selectedStaffId) }
    catch { setDeleteQualError('Unable to delete qualification.') }
    finally { setDeletingQual(false) }
  }

  const addEmergencyContact = async () => {
    if (!selectedStaffId || !contactName.trim() || !contactPhone.trim()) return
    setError(null); setNotice(null)
    try {
      await apiClient.post('/staff/emergency-contacts/', { staff: selectedStaffId, name: contactName.trim(), phone_primary: contactPhone.trim(), relationship: 'Contact' })
      setContactName(''); setContactPhone(''); await loadProfile(selectedStaffId); setNotice('Emergency contact added.')
    } catch { setError('Unable to add emergency contact.') }
  }

  const confirmDeleteContact = async () => {
    if (!deleteContactTarget || !selectedStaffId) return
    setDeletingContact(true); setDeleteContactError(null)
    try { await apiClient.delete(`/staff/emergency-contacts/${deleteContactTarget.id}/`); setDeleteContactTarget(null); await loadProfile(selectedStaffId) }
    catch { setDeleteContactError('Unable to delete contact.') }
    finally { setDeletingContact(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="STAFF"
        badgeColor="blue"
        title="Staff Profiles"
        subtitle="Individual staff profile cards and details"
        icon="👤"
      />
      <section className="rounded-2xl glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Staff Profiles</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Qualifications, Assignments, Emergency Contacts</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      <section className="rounded-xl glass-panel p-4">
        <label className="text-xs text-slate-400">Select staff</label>
        <select value={selectedStaffId ?? ''} onChange={(e) => setSelectedStaffId(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
          {staff.map((row) => <option key={row.id} value={row.id}>{row.staff_id} - {row.full_name}</option>)}
        </select>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Profile</h2>
          {profile ? (
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <p><strong>Name:</strong> {profile.staff.full_name}</p>
              <p><strong>Type:</strong> {profile.staff.staff_type}</p>
              <p><strong>Employment:</strong> {profile.staff.employment_type}</p>
              <p><strong>Status:</strong> {profile.staff.status}</p>
              <p><strong>Email:</strong> {profile.staff.email_work || 'N/A'}</p>
              <p><strong>Phone:</strong> {profile.staff.phone_primary || 'N/A'}</p>
              <p><strong>Join Date:</strong> {profile.staff.join_date || 'N/A'}</p>
            </div>
          ) : <p className="mt-3 text-xs text-slate-400">Select a staff member to load profile.</p>}
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Qualifications</h2>
          <div className="mt-3 space-y-2">
            <input value={qualificationTitle} onChange={(e) => setQualificationTitle(e.target.value)} placeholder="Qualification title" className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={addQualification} className="w-full rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Add Qualification</button>
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {(profile?.qualifications ?? []).map((row) => (
              <div key={row.id} className="flex items-start justify-between rounded-lg bg-slate-950/60 px-3 py-2">
                <div>
                  <p>{row.title}</p>
                  <p className="text-slate-400">{row.qualification_type} {row.year_obtained ? `- ${row.year_obtained}` : ''}</p>
                </div>
                <button onClick={() => setDeleteQualTarget({ id: row.id, title: row.title })} className="ml-2 shrink-0 text-[11px] font-semibold text-rose-400 hover:text-rose-300">Delete</button>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Emergency Contacts</h2>
          <div className="mt-3 space-y-2">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone number" className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={addEmergencyContact} className="w-full rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Add Contact</button>
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {(profile?.emergency_contacts ?? []).map((row) => (
              <div key={row.id} className="flex items-start justify-between rounded-lg bg-slate-950/60 px-3 py-2">
                <div>
                  <p>{row.name} {row.is_primary ? '(Primary)' : ''}</p>
                  <p className="text-slate-400">{row.relationship || 'Contact'} - {row.phone_primary}</p>
                </div>
                <button onClick={() => setDeleteContactTarget({ id: row.id, name: row.name })} className="ml-2 shrink-0 text-[11px] font-semibold text-rose-400 hover:text-rose-300">Delete</button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold">Department & Role Assignments</h2>
        {!selected ? <p className="mt-3 text-xs text-slate-400">No staff selected.</p> : null}
        <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
          {(profile?.assignments ?? []).map((row) => (
            <div key={row.id} className="rounded-lg bg-slate-950/60 px-3 py-2">
              <p>{row.department_name}</p>
              <p className="text-slate-400">{row.role_name} {row.is_primary ? '(Primary)' : ''}</p>
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog open={!!deleteQualTarget} title="Delete Qualification" description={`Delete "${deleteQualTarget?.title}"?`} confirmLabel="Delete" isProcessing={deletingQual} error={deleteQualError} onConfirm={confirmDeleteQual} onCancel={() => setDeleteQualTarget(null)} />
      <ConfirmDialog open={!!deleteContactTarget} title="Delete Contact" description={`Delete emergency contact "${deleteContactTarget?.name}"?`} confirmLabel="Delete" isProcessing={deletingContact} error={deleteContactError} onConfirm={confirmDeleteContact} onCancel={() => setDeleteContactTarget(null)} />
    </div>
  )
}
