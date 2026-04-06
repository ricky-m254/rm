import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { downloadBlob, extractFilename } from '../../utils/download'
import PageHero from '../../components/PageHero'

const tabs = ['Profiles', 'Immunizations', 'Clinic Visits']

type StudentRef = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
}

type MedicalRecord = {
  id: number
  student: number
  student_name?: string
  blood_type?: string
  allergies?: string
  chronic_conditions?: string
  current_medications?: string
  doctor_name?: string
  doctor_phone?: string
  notes?: string
  last_visit?: string | null
  updated_at?: string
}

type ImmunizationRecord = {
  id: number
  student: number
  student_name?: string
  vaccine_name: string
  date_administered: string
  booster_due_date?: string | null
  certificate_url?: string | null
}

type ClinicVisit = {
  id: number
  student: number
  student_name?: string
  visit_date: string
  visit_time?: string | null
  complaint?: string
  treatment?: string
  parent_notified?: boolean
  severity?: string
}

export default function StudentsMedicalPage() {
  const [activeTab, setActiveTab] = useState('Profiles')
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([])
  const [immunizations, setImmunizations] = useState<ImmunizationRecord[]>([])
  const [clinicVisits, setClinicVisits] = useState<ClinicVisit[]>([])
  const [students, setStudents] = useState<StudentRef[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [studentFilter, setStudentFilter] = useState('')
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const [profileForm, setProfileForm] = useState({
    student: '',
    blood_type: '',
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    doctor_name: '',
    doctor_phone: '',
    notes: '',
  })

  const [immunizationForm, setImmunizationForm] = useState({
    student: '',
    vaccine_name: '',
    date_administered: '',
    booster_due_date: '',
    certificate: null as File | null,
  })

  const [visitForm, setVisitForm] = useState({
    student: '',
    visit_date: '',
    visit_time: '',
    complaint: '',
    treatment: '',
    parent_notified: false,
    severity: '',
  })

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      const [medicalRes, immunRes, visitRes, studentRes] = await Promise.allSettled([
        apiClient.get<MedicalRecord[] | { results: MedicalRecord[]; count: number }>(
          '/medical/records/',
          {
            params: {
              student: studentFilter || undefined,
              search: search.trim() || undefined,
            },
          },
        ),
        apiClient.get<ImmunizationRecord[] | { results: ImmunizationRecord[]; count: number }>(
          '/medical/immunizations/',
          {
            params: {
              student: studentFilter || undefined,
              search: search.trim() || undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            },
          },
        ),
        apiClient.get<ClinicVisit[] | { results: ClinicVisit[]; count: number }>(
          '/medical/visits/',
          {
            params: {
              student: studentFilter || undefined,
              search: search.trim() || undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
              severity: severityFilter || undefined,
            },
          },
        ),
        apiClient.get<StudentRef[] | { results: StudentRef[]; count: number }>('/students/', {
          params: { page_size: 200 },
        }),
      ])

      if (!isMounted) return

      if (medicalRes.status === 'fulfilled') {
        setMedicalRecords(normalizePaginatedResponse(medicalRes.value.data).items)
      } else {
        setMedicalRecords([])
        setError('Unable to load medical profiles.')
      }

      if (immunRes.status === 'fulfilled') {
        setImmunizations(normalizePaginatedResponse(immunRes.value.data).items)
      } else {
        setImmunizations([])
      }

      if (visitRes.status === 'fulfilled') {
        setClinicVisits(normalizePaginatedResponse(visitRes.value.data).items)
      } else {
        setClinicVisits([])
      }

      if (studentRes.status === 'fulfilled') {
        setStudents(normalizePaginatedResponse(studentRes.value.data).items)
      } else {
        setStudents([])
      }

      setIsLoading(false)
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [refreshKey])

  const handleDownload = async (format: 'csv' | 'pdf') => {
    setIsDownloading(true)
    setDownloadError(null)
    try {
      const endpoint =
        activeTab === 'Profiles'
          ? `/medical/records/export/${format}/`
          : activeTab === 'Immunizations'
            ? `/medical/immunizations/export/${format}/`
            : `/medical/visits/export/${format}/`
      const response = await apiClient.get(endpoint, {
        responseType: 'blob',
        params: {
          student: studentFilter || undefined,
          search: search.trim() || undefined,
          severity: activeTab === 'Clinic Visits' ? severityFilter || undefined : undefined,
          date_from: activeTab === 'Clinic Visits' ? dateFrom || undefined : undefined,
          date_to: activeTab === 'Clinic Visits' ? dateTo || undefined : undefined,
        },
      })
      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const fallbackBase =
        activeTab === 'Profiles'
          ? 'medical_profiles_report'
          : activeTab === 'Immunizations'
            ? 'medical_immunizations_report'
            : 'medical_clinic_visits_report'
      const defaultName = `${fallbackBase}.${format}`
      const filename = extractFilename(contentDisposition, defaultName)
      downloadBlob(response.data as Blob, filename)
    } catch {
      setDownloadError(`Unable to download ${activeTab.toLowerCase()} ${format.toUpperCase()} report.`)
    } finally {
      setIsDownloading(false)
    }
  }

  const selectedTabLabel = useMemo(() => activeTab, [activeTab])

  const resetForms = () => {
    setProfileForm({
      student: '',
      blood_type: '',
      allergies: '',
      chronic_conditions: '',
      current_medications: '',
      doctor_name: '',
      doctor_phone: '',
      notes: '',
    })
    setImmunizationForm({
      student: '',
      vaccine_name: '',
      date_administered: '',
      booster_due_date: '',
      certificate: null,
    })
    setVisitForm({
      student: '',
      visit_date: '',
      visit_time: '',
      complaint: '',
      treatment: '',
      parent_notified: false,
      severity: '',
    })
  }

  const handleCreateRecord = async () => {
    setFormError(null)
    setIsSubmitting(true)
    try {
      if (activeTab === 'Profiles') {
        if (!profileForm.student) {
          setFormError('Select a student.')
          return
        }
        await apiClient.post('/medical/records/', {
          student: Number(profileForm.student),
          blood_type: profileForm.blood_type || undefined,
          allergies: profileForm.allergies || undefined,
          chronic_conditions: profileForm.chronic_conditions || undefined,
          current_medications: profileForm.current_medications || undefined,
          doctor_name: profileForm.doctor_name || undefined,
          doctor_phone: profileForm.doctor_phone || undefined,
          notes: profileForm.notes || undefined,
        })
      }

      if (activeTab === 'Immunizations') {
        if (!immunizationForm.student || !immunizationForm.vaccine_name || !immunizationForm.date_administered) {
          setFormError('Student, vaccine name, and date administered are required.')
          return
        }
        if (immunizationForm.certificate) {
          const formData = new FormData()
          formData.append('student', immunizationForm.student)
          formData.append('vaccine_name', immunizationForm.vaccine_name)
          formData.append('date_administered', immunizationForm.date_administered)
          if (immunizationForm.booster_due_date) {
            formData.append('booster_due_date', immunizationForm.booster_due_date)
          }
          formData.append('certificate', immunizationForm.certificate)
          await apiClient.post('/medical/immunizations/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } else {
          await apiClient.post('/medical/immunizations/', {
            student: Number(immunizationForm.student),
            vaccine_name: immunizationForm.vaccine_name,
            date_administered: immunizationForm.date_administered,
            booster_due_date: immunizationForm.booster_due_date || undefined,
          })
        }
      }

      if (activeTab === 'Clinic Visits') {
        if (!visitForm.student || !visitForm.visit_date) {
          setFormError('Student and visit date are required.')
          return
        }
        await apiClient.post('/medical/visits/', {
          student: Number(visitForm.student),
          visit_date: visitForm.visit_date,
          visit_time: visitForm.visit_time || undefined,
          complaint: visitForm.complaint || undefined,
          treatment: visitForm.treatment || undefined,
          parent_notified: visitForm.parent_notified,
          severity: visitForm.severity || undefined,
        })
      }

      setIsFormOpen(false)
      resetForms()
      setRefreshKey((prev) => prev + 1)
    } catch {
      setFormError('Unable to save medical record.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Medical Records"
        subtitle="Profiles, immunizations, and clinic visits."
        icon="📋"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading medical records...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
          {error}
        </div>
      ) : null}

      {downloadError ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
          {downloadError}
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Medical records</h2>
            <p className="mt-1 text-sm text-slate-400">Manage student health data.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-xs text-white"
              value={studentFilter}
              onChange={(event) => setStudentFilter(event.target.value)}
            >
              <option value="">All students</option>
              {students.map((student) => (
                <option key={student.id} value={String(student.id)}>
                  {student.admission_number} - {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
            {activeTab === 'Clinic Visits' ? (
              <>
                <select
                  className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-xs text-white"
                  value={severityFilter}
                  onChange={(event) => setSeverityFilter(event.target.value)}
                >
                  <option value="">All severities</option>
                  <option value="Minor">Minor</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Serious">Serious</option>
                </select>
                <input
                  type="date"
                  className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-xs text-white"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
                <input
                  type="date"
                  className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-xs text-white"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </>
            ) : null}
            <input
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-xs text-white"
              placeholder="Search student/notes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200"
              onClick={() => setRefreshKey((prev) => prev + 1)}
            >
              Filter
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200"
              onClick={() => {
                setStudentFilter('')
                setSearch('')
                setSeverityFilter('')
                setDateFrom('')
                setDateTo('')
                setRefreshKey((prev) => prev + 1)
              }}
            >
              Reset
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200 disabled:opacity-60"
              disabled={isDownloading}
              onClick={() => handleDownload('csv')}
            >
              Download CSV
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200 disabled:opacity-60"
              disabled={isDownloading}
              onClick={() => handleDownload('pdf')}
            >
              Download PDF
            </button>
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`pill-tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={() => {
                setIsFormOpen(true)
                setFormError(null)
              }}
            >
              Add record
            </button>
          </div>
        </div>

        {activeTab === 'Profiles' ? (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Blood Type</th>
                  <th className="px-4 py-3">Allergies</th>
                  <th className="px-4 py-3">Conditions</th>
                  <th className="px-4 py-3">Last Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {medicalRecords.map((row) => (
                  <tr key={row.id} className="bg-slate-950/60">
                    <td className="px-4 py-3 font-semibold">
                      {row.student_name ?? `Student #${row.student}`}
                    </td>
                    <td className="px-4 py-3">{row.blood_type ?? '--'}</td>
                    <td className="px-4 py-3">{row.allergies || '--'}</td>
                    <td className="px-4 py-3">{row.chronic_conditions || '--'}</td>
                    <td className="px-4 py-3">{row.last_visit ?? '--'}</td>
                  </tr>
                ))}
                {medicalRecords.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                      No medical profiles yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === 'Immunizations' ? (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Vaccine</th>
                  <th className="px-4 py-3">Date Administered</th>
                  <th className="px-4 py-3">Booster Due</th>
                  <th className="px-4 py-3">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {immunizations.map((row) => (
                  <tr key={row.id} className="bg-slate-950/60">
                    <td className="px-4 py-3 font-semibold">
                      {row.student_name ?? `Student #${row.student}`}
                    </td>
                    <td className="px-4 py-3">{row.vaccine_name}</td>
                    <td className="px-4 py-3">{row.date_administered}</td>
                    <td className="px-4 py-3">{row.booster_due_date ?? '--'}</td>
                    <td className="px-4 py-3">
                      {row.certificate_url ? (
                        <a
                          className="text-emerald-200 underline"
                          href={row.certificate_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        '--'
                      )}
                    </td>
                  </tr>
                ))}
                {immunizations.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                      No immunization records yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === 'Clinic Visits' ? (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Visit Date</th>
                  <th className="px-4 py-3">Complaint</th>
                  <th className="px-4 py-3">Treatment</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Parent Notified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {clinicVisits.map((row) => (
                  <tr key={row.id} className="bg-slate-950/60">
                    <td className="px-4 py-3 font-semibold">
                      {row.student_name ?? `Student #${row.student}`}
                    </td>
                    <td className="px-4 py-3">{row.visit_date}</td>
                    <td className="px-4 py-3">{row.complaint || '--'}</td>
                    <td className="px-4 py-3">{row.treatment || '--'}</td>
                    <td className="px-4 py-3">{row.severity || '--'}</td>
                    <td className="px-4 py-3">{row.parent_notified ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
                {clinicVisits.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                      No clinic visits yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.07] bg-slate-950 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{selectedTabLabel}</p>
                <h3 className="text-lg font-display font-semibold">Add medical record</h3>
              </div>
              <button
                className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200"
                onClick={() => {
                  setIsFormOpen(false)
                  setFormError(null)
                }}
              >
                Close
              </button>
            </div>

            {activeTab === 'Profiles' ? (
              <div className="mt-4 grid gap-4">
                <label className="block text-sm">
                  Student
                  <select
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={profileForm.student}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, student: event.target.value }))}
                  >
                    <option value="">Select student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.admission_number} - {student.first_name} {student.last_name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm">
                    Blood type
                    <input
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={profileForm.blood_type}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, blood_type: event.target.value }))}
                    />
                  </label>
                  <label className="block text-sm">
                    Allergies
                    <input
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={profileForm.allergies}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, allergies: event.target.value }))}
                    />
                  </label>
                  <label className="block text-sm">
                    Chronic conditions
                    <input
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={profileForm.chronic_conditions}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, chronic_conditions: event.target.value }))
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    Current medications
                    <input
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={profileForm.current_medications}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, current_medications: event.target.value }))
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    Doctor name
                    <input
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={profileForm.doctor_name}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, doctor_name: event.target.value }))}
                    />
                  </label>
                  <label className="block text-sm">
                    Doctor phone
                    <input
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={profileForm.doctor_phone}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, doctor_phone: event.target.value }))}
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  Notes
                  <textarea
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={profileForm.notes}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </label>
              </div>
            ) : null}

            {activeTab === 'Immunizations' ? (
              <div className="mt-4 grid gap-4">
                <label className="block text-sm">
                  Student
                  <select
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={immunizationForm.student}
                    onChange={(event) =>
                      setImmunizationForm((prev) => ({ ...prev, student: event.target.value }))
                    }
                  >
                    <option value="">Select student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.admission_number} - {student.first_name} {student.last_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Vaccine name
                  <input
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={immunizationForm.vaccine_name}
                    onChange={(event) =>
                      setImmunizationForm((prev) => ({ ...prev, vaccine_name: event.target.value }))
                    }
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm">
                    Date administered
                    <input
                      type="date"
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={immunizationForm.date_administered}
                      onChange={(event) =>
                        setImmunizationForm((prev) => ({ ...prev, date_administered: event.target.value }))
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    Booster due date (optional)
                    <input
                      type="date"
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={immunizationForm.booster_due_date}
                      onChange={(event) =>
                        setImmunizationForm((prev) => ({ ...prev, booster_due_date: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  Certificate (optional)
                  <input
                    type="file"
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-xs text-slate-200"
                    onChange={(event) =>
                      setImmunizationForm((prev) => ({
                        ...prev,
                        certificate: event.target.files?.[0] ?? null,
                      }))
                    }
                  />
                </label>
              </div>
            ) : null}

            {activeTab === 'Clinic Visits' ? (
              <div className="mt-4 grid gap-4">
                <label className="block text-sm">
                  Student
                  <select
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={visitForm.student}
                    onChange={(event) => setVisitForm((prev) => ({ ...prev, student: event.target.value }))}
                  >
                    <option value="">Select student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.admission_number} - {student.first_name} {student.last_name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm">
                    Visit date
                    <input
                      type="date"
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={visitForm.visit_date}
                      onChange={(event) => setVisitForm((prev) => ({ ...prev, visit_date: event.target.value }))}
                    />
                  </label>
                  <label className="block text-sm">
                    Visit time (optional)
                    <input
                      type="time"
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={visitForm.visit_time}
                      onChange={(event) => setVisitForm((prev) => ({ ...prev, visit_time: event.target.value }))}
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  Complaint
                  <textarea
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={visitForm.complaint}
                    onChange={(event) => setVisitForm((prev) => ({ ...prev, complaint: event.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  Treatment
                  <textarea
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={visitForm.treatment}
                    onChange={(event) => setVisitForm((prev) => ({ ...prev, treatment: event.target.value }))}
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm">
                    Severity
                    <select
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={visitForm.severity}
                      onChange={(event) => setVisitForm((prev) => ({ ...prev, severity: event.target.value }))}
                    >
                      <option value="">Select severity</option>
                      <option value="Minor">Minor</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Serious">Serious</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={visitForm.parent_notified}
                      onChange={(event) =>
                        setVisitForm((prev) => ({ ...prev, parent_notified: event.target.checked }))
                      }
                    />
                    Parent notified
                  </label>
                </div>
              </div>
            ) : null}

            {formError ? <p className="mt-4 text-xs text-rose-300">{formError}</p> : null}
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900"
                onClick={handleCreateRecord}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
