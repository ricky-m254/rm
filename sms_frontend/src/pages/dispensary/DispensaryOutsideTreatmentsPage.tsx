import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Student = { id: number; full_name: string; admission_number: string }
type OutsideTreatment = {
  id: number; patient_name: string; patient_type: string; referral_date: string
  facility_name: string; reason: string; diagnosis: string; treatment_given: string
  cost: string | null; follow_up_date: string | null; notes: string; created_at: string
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function DispensaryOutsideTreatmentsPage() {
  const [treatments, setTreatments] = useState<OutsideTreatment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [patientName, setPatientName] = useState('')
  const [patientType, setPatientType] = useState('Student')
  const [studentId, setStudentId] = useState('')
  const [referralDate, setReferralDate] = useState(new Date().toISOString().split('T')[0])
  const [facilityName, setFacilityName] = useState('')
  const [reason, setReason] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [treatmentGiven, setTreatmentGiven] = useState('')
  const [cost, setCost] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<OutsideTreatment | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [tRes, sRes] = await Promise.all([
        apiClient.get<OutsideTreatment[] | { results: OutsideTreatment[] }>('/dispensary/outside-treatments/'),
        apiClient.get<Student[] | { results: Student[] }>('/students/?limit=200'),
      ])
      setTreatments(asArray(tRes.data)); setStudents(asArray(sRes.data))
    } catch { setError('Unable to load outside treatments.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const fillStudentName = (id: string) => {
    setStudentId(id)
    if (id) {
      const s = students.find(s => String(s.id) === id)
      if (s) setPatientName(s.full_name)
    }
  }

  const save = async () => {
    if (!patientName.trim() || !referralDate || !facilityName.trim()) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/dispensary/outside-treatments/', {
        patient_name: patientName.trim(), patient_type: patientType,
        student: studentId ? Number(studentId) : null,
        referral_date: referralDate, facility_name: facilityName.trim(),
        reason, diagnosis, treatment_given: treatmentGiven,
        cost: cost ? cost : null, follow_up_date: followUpDate || null, notes,
      })
      setPatientName(''); setStudentId(''); setFacilityName(''); setReason(''); setDiagnosis('')
      setTreatmentGiven(''); setCost(''); setFollowUpDate(''); setNotes('')
      setNotice('Outside treatment recorded.'); await load()
    } catch { setError('Unable to record outside treatment.') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/dispensary/outside-treatments/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete treatment record.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="DISPENSARY"
        badgeColor="rose"
        title="Outside Treatments"
        subtitle="Record external referrals and treatments given at outside facilities."
        icon="💊"
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <div className="rounded-2xl glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">Record Outside Treatment</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Patient Type</label>
            <select value={patientType} onChange={e => setPatientType(e.target.value)} className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
              <option>Student</option><option>Staff</option><option>Other</option>
            </select>
          </div>
          {patientType === 'Student' ? (
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Select Student</label>
              <select value={studentId} onChange={e => fillStudentName(e.target.value)} className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
                <option value="">Choose student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.admission_number} - {s.full_name}</option>)}
              </select>
            </div>
          ) : null}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Patient Name *</label>
            <input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Full name" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Referral Date *</label>
            <input type="date" value={referralDate} onChange={e => setReferralDate(e.target.value)} className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          </div>
          <input value={facilityName} onChange={e => setFacilityName(e.target.value)} placeholder="Facility / Hospital name *" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <input value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost (Ksh)" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <input value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} type="date" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Follow-Up Date (optional)</label>
          </div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for referral" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2 lg:col-span-3" />
          <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Diagnosis" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2 lg:col-span-3" />
          <textarea value={treatmentGiven} onChange={e => setTreatmentGiven(e.target.value)} placeholder="Treatment given at outside facility" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2 lg:col-span-3" />
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2 lg:col-span-3" />
        </div>
        <button onClick={save} disabled={saving || !patientName.trim() || !facilityName.trim()} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Record Treatment'}</button>
      </div>

      <div className="rounded-2xl glass-panel overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.07] text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Facility</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Diagnosis</th>
              <th className="px-4 py-3 font-medium">Cost</th>
              <th className="px-4 py-3 font-medium">Follow-Up</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr> : treatments.map(t => (
              <tr key={t.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-200">{t.patient_name}</p>
                  <span className="text-[10px] text-slate-500">{t.patient_type}</span>
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs">{t.referral_date}</td>
                <td className="px-4 py-3 text-slate-300">{t.facility_name}</td>
                <td className="px-4 py-3 text-slate-400 text-xs max-w-[120px] truncate">{t.reason || '-'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs max-w-[120px] truncate">{t.diagnosis || '-'}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{t.cost ? `Ksh ${Number(t.cost).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : '-'}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{t.follow_up_date || '-'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setDeleteTarget(t)} className="text-xs font-semibold text-rose-400 hover:text-rose-300">Delete</button>
                </td>
              </tr>
            ))}
            {!loading && treatments.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No outside treatments recorded.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Treatment Record" description={`Delete outside treatment for "${deleteTarget?.patient_name}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
