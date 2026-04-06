import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import PageHero from '../../components/PageHero'

type AcademicYear = {
  id: number
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  is_current?: boolean
}

type Term = {
  id: number
  academic_year: number
  academic_year_name?: string
  name: string
  start_date: string
  end_date: string
  billing_date?: string | null
  is_active: boolean
  is_current?: boolean
}

type GradeLevel = {
  id: number
  name: string
  order: number
  description?: string
  is_active: boolean
}

type Staff = {
  id: number
  first_name: string
  last_name: string
}

type SchoolClass = {
  id: number
  academic_year: number
  academic_year_name?: string
  grade_level?: number | null
  grade_level_name?: string
  name: string
  stream?: string
  section_name?: string
  display_name?: string
  class_teacher?: number | null
  class_teacher_name?: string
  room?: string
  capacity?: number
  is_active: boolean
}

type BackendError = {
  response?: {
    data?: unknown
  }
}

type ModalKind = 'year' | 'term' | 'grade' | 'class' | 'clone' | null

const initialYearForm = { name: '', start_date: '', end_date: '', is_current: false }
const initialTermForm = {
  academic_year: '',
  name: '',
  start_date: '',
  end_date: '',
  billing_date: '',
  is_current: false,
  is_active: true,
}
const initialGradeForm = { name: '', order: 1, description: '', is_active: true }
const initialClassForm = {
  academic_year: '',
  grade_level: '',
  section_name: '',
  class_teacher: '',
  room: '',
  capacity: 40,
  is_active: true,
}
const initialCloneForm = {
  name: '',
  start_date: '',
  end_date: '',
  copy_terms: true,
  copy_classes: true,
  set_current: false,
}

function getErrorMessage(err: unknown): string {
  const data = (err as BackendError)?.response?.data
  if (!data) return 'Request failed.'
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    const messages: string[] = []
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      if (Array.isArray(value)) messages.push(`${key}: ${value.join(' ')}`)
      else if (typeof value === 'string') messages.push(`${key}: ${value}`)
    })
    if (messages.length > 0) return messages.join(' | ')
  }
  return 'Request failed.'
}

function plusOneYear(input: string): string {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ''
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-2xl border border-white/[0.09] bg-[#0d1421] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-display font-semibold text-slate-100">{title}</h3>
          <button type="button" className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs text-slate-200" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function AcademicsStructurePage() {
  const [years, setYears] = useState<AcademicYear[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [staff, setStaff] = useState<Staff[]>([])

  const [yearForm, setYearForm] = useState(initialYearForm)
  const [termForm, setTermForm] = useState(initialTermForm)
  const [gradeForm, setGradeForm] = useState(initialGradeForm)
  const [classForm, setClassForm] = useState(initialClassForm)
  const [cloneForm, setCloneForm] = useState(initialCloneForm)

  const [editingYearId, setEditingYearId] = useState<number | null>(null)
  const [editingTermId, setEditingTermId] = useState<number | null>(null)
  const [editingGradeId, setEditingGradeId] = useState<number | null>(null)
  const [editingClassId, setEditingClassId] = useState<number | null>(null)
  const [cloneSourceYearId, setCloneSourceYearId] = useState<number | null>(null)

  const [activeModal, setActiveModal] = useState<ModalKind>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const sortedYears = useMemo(() => [...years].sort((a, b) => a.name.localeCompare(b.name)), [years])
  const sortedGrades = useMemo(() => [...gradeLevels].sort((a, b) => a.order - b.order), [gradeLevels])

  const loadAll = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [yearsRes, termsRes, gradesRes, classesRes, staffRes] = await Promise.all([
        apiClient.get('/academics/years/'),
        apiClient.get('/academics/terms/'),
        apiClient.get('/academics/grade-levels/'),
        apiClient.get('/academics/classes/'),
        apiClient.get('/hr/staff/'),
      ])
      setYears(normalizePaginatedResponse<AcademicYear>(yearsRes.data).items)
      setTerms(normalizePaginatedResponse<Term>(termsRes.data).items)
      setGradeLevels(normalizePaginatedResponse<GradeLevel>(gradesRes.data).items)
      setClasses(normalizePaginatedResponse<SchoolClass>(classesRes.data).items)
      setStaff(normalizePaginatedResponse<Staff>(staffRes.data).items)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const closeModal = () => {
    setActiveModal(null)
    setEditingYearId(null)
    setEditingTermId(null)
    setEditingGradeId(null)
    setEditingClassId(null)
    setCloneSourceYearId(null)
    setYearForm(initialYearForm)
    setTermForm({ ...initialTermForm, academic_year: years[0] ? String(years[0].id) : '' })
    setGradeForm(initialGradeForm)
    setClassForm({ ...initialClassForm, academic_year: years[0] ? String(years[0].id) : '' })
    setCloneForm(initialCloneForm)
  }

  const toggleActive = async (path: string, currentState: boolean, label: string) => {
    setError(null)
    setFlash(null)
    try {
      await apiClient.patch(path, { is_active: !currentState })
      setFlash(`${label} ${currentState ? 'archived' : 'activated'}.`)
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const setCurrent = async (path: string, label: string) => {
    setError(null)
    setFlash(null)
    try {
      await apiClient.patch(path, { is_current: true })
      setFlash(`${label} updated.`)
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitYear = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      if (editingYearId) await apiClient.patch(`/academics/years/${editingYearId}/`, yearForm)
      else await apiClient.post('/academics/years/', yearForm)
      setFlash(editingYearId ? 'Academic year updated.' : 'Academic year created.')
      closeModal()
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitTerm = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    const payload = {
      academic_year: Number(termForm.academic_year),
      name: termForm.name,
      start_date: termForm.start_date,
      end_date: termForm.end_date,
      billing_date: termForm.billing_date || null,
      is_current: termForm.is_current,
      is_active: termForm.is_active,
    }
    try {
      if (editingTermId) await apiClient.patch(`/academics/terms/${editingTermId}/`, payload)
      else await apiClient.post('/academics/terms/', payload)
      setFlash(editingTermId ? 'Term updated.' : 'Term created.')
      closeModal()
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitGrade = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      if (editingGradeId) await apiClient.patch(`/academics/grade-levels/${editingGradeId}/`, gradeForm)
      else await apiClient.post('/academics/grade-levels/', gradeForm)
      setFlash(editingGradeId ? 'Grade level updated.' : 'Grade level created.')
      closeModal()
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitClass = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    const payload = {
      academic_year: Number(classForm.academic_year),
      grade_level: classForm.grade_level ? Number(classForm.grade_level) : null,
      section_name: classForm.section_name,
      class_teacher: classForm.class_teacher ? Number(classForm.class_teacher) : null,
      room: classForm.room || '',
      capacity: Number(classForm.capacity),
      is_active: classForm.is_active,
    }
    try {
      if (editingClassId) await apiClient.patch(`/academics/classes/${editingClassId}/`, payload)
      else await apiClient.post('/academics/classes/', payload)
      setFlash(editingClassId ? 'Class section updated.' : 'Class section created.')
      closeModal()
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const startCloneYear = (year: AcademicYear) => {
    setCloneSourceYearId(year.id)
    setCloneForm({
      name: `${year.name} Copy`,
      start_date: plusOneYear(year.start_date),
      end_date: plusOneYear(year.end_date),
      copy_terms: true,
      copy_classes: true,
      set_current: false,
    })
    setActiveModal('clone')
  }

  const submitCloneYear = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!cloneSourceYearId) return
    setError(null)
    setFlash(null)
    try {
      await apiClient.post(`/academics/years/${cloneSourceYearId}/clone-structure/`, cloneForm)
      setFlash('Academic structure cloned.')
      closeModal()
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="ACADEMICS"
        badgeColor="emerald"
        title="Academic Structure"
        subtitle="Terms, years, and institutional hierarchy"
        icon="📖"
      />
      <header className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Academics</p>
            <h1 className="mt-2 text-2xl font-display font-semibold">Academic Structure</h1>
            <p className="mt-2 text-sm text-slate-400">Manage academic years, terms, grade levels, and class sections.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" onClick={() => { setEditingYearId(null); setYearForm(initialYearForm); setActiveModal('year') }}>New Year</button>
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" onClick={() => { setEditingTermId(null); setTermForm({ ...initialTermForm, academic_year: years[0] ? String(years[0].id) : '' }); setActiveModal('term') }}>New Term</button>
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" onClick={() => { setEditingGradeId(null); setGradeForm(initialGradeForm); setActiveModal('grade') }}>New Grade</button>
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" onClick={() => { setEditingClassId(null); setClassForm({ ...initialClassForm, academic_year: years[0] ? String(years[0].id) : '' }); setActiveModal('class') }}>New Class</button>
          </div>
        </div>
      </header>

      {isLoading ? <div className="col-span-12 rounded-2xl glass-panel p-5 text-sm text-slate-300">Loading academic structure...</div> : null}
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div> : null}
      {flash ? <div className="col-span-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">{flash}</div> : null}

      <section className="col-span-12 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Academic Years</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Start</th><th className="px-3 py-2 text-left">End</th><th className="px-3 py-2 text-left">Current</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedYears.map((year) => (
                  <tr key={year.id} className="bg-slate-950/50">
                    <td className="px-3 py-2">{year.name}</td><td className="px-3 py-2">{year.start_date}</td><td className="px-3 py-2">{year.end_date}</td><td className="px-3 py-2">{year.is_current ? 'Yes' : 'No'}</td><td className="px-3 py-2">{year.is_active ? 'Active' : 'Archived'}</td>
                    <td className="px-3 py-2"><div className="flex flex-wrap gap-2">
                      <button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => setCurrent(`/academics/years/${year.id}/`, 'Current academic year')}>Set current</button>
                      <button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => { setEditingYearId(year.id); setYearForm({ name: year.name, start_date: year.start_date, end_date: year.end_date, is_current: Boolean(year.is_current) }); setActiveModal('year') }}>Edit</button>
                      <button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => toggleActive(`/academics/years/${year.id}/`, year.is_active, 'Academic year')}>{year.is_active ? 'Archive' : 'Activate'}</button>
                      <button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => startCloneYear(year)}>Clone</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Terms</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full min-w-[760px] text-sm"><thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Year</th><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Billing</th><th className="px-3 py-2 text-left">Current</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Actions</th></tr></thead><tbody className="divide-y divide-slate-800">{terms.map((term) => <tr key={term.id} className="bg-slate-950/50"><td className="px-3 py-2">{term.academic_year_name ?? term.academic_year}</td><td className="px-3 py-2">{term.name}</td><td className="px-3 py-2">{term.billing_date || '--'}</td><td className="px-3 py-2">{term.is_current ? 'Yes' : 'No'}</td><td className="px-3 py-2">{term.is_active ? 'Active' : 'Archived'}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-2"><button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => setCurrent(`/academics/terms/${term.id}/`, 'Current term')}>Set current</button><button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => { setEditingTermId(term.id); setTermForm({ academic_year: String(term.academic_year), name: term.name, start_date: term.start_date, end_date: term.end_date, billing_date: term.billing_date ?? '', is_current: Boolean(term.is_current), is_active: term.is_active }); setActiveModal('term') }}>Edit</button><button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => toggleActive(`/academics/terms/${term.id}/`, term.is_active, 'Term')}>{term.is_active ? 'Archive' : 'Activate'}</button></div></td></tr>)}</tbody></table>
          </div>
        </div>

        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Grade Levels</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full min-w-[760px] text-sm"><thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Order</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Actions</th></tr></thead><tbody className="divide-y divide-slate-800">{sortedGrades.map((grade) => <tr key={grade.id} className="bg-slate-950/50"><td className="px-3 py-2">{grade.name}</td><td className="px-3 py-2">{grade.order}</td><td className="px-3 py-2">{grade.description || '--'}</td><td className="px-3 py-2">{grade.is_active ? 'Active' : 'Archived'}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-2"><button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => { setEditingGradeId(grade.id); setGradeForm({ name: grade.name, order: grade.order, description: grade.description || '', is_active: grade.is_active }); setActiveModal('grade') }}>Edit</button><button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => toggleActive(`/academics/grade-levels/${grade.id}/`, grade.is_active, 'Grade level')}>{grade.is_active ? 'Archive' : 'Activate'}</button></div></td></tr>)}</tbody></table>
          </div>
        </div>

        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Class Sections</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full min-w-[900px] text-sm"><thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Display</th><th className="px-3 py-2 text-left">Year</th><th className="px-3 py-2 text-left">Grade</th><th className="px-3 py-2 text-left">Teacher</th><th className="px-3 py-2 text-left">Room</th><th className="px-3 py-2 text-left">Capacity</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Actions</th></tr></thead><tbody className="divide-y divide-slate-800">{classes.map((schoolClass) => <tr key={schoolClass.id} className="bg-slate-950/50"><td className="px-3 py-2">{schoolClass.display_name ?? schoolClass.name}</td><td className="px-3 py-2">{schoolClass.academic_year_name ?? schoolClass.academic_year}</td><td className="px-3 py-2">{schoolClass.grade_level_name ?? schoolClass.grade_level ?? '--'}</td><td className="px-3 py-2">{schoolClass.class_teacher_name ?? '--'}</td><td className="px-3 py-2">{schoolClass.room || '--'}</td><td className="px-3 py-2">{schoolClass.capacity ?? '--'}</td><td className="px-3 py-2">{schoolClass.is_active ? 'Active' : 'Archived'}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-2"><button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => { setEditingClassId(schoolClass.id); setClassForm({ academic_year: String(schoolClass.academic_year), grade_level: schoolClass.grade_level ? String(schoolClass.grade_level) : '', section_name: schoolClass.section_name || schoolClass.stream || schoolClass.name || '', class_teacher: schoolClass.class_teacher ? String(schoolClass.class_teacher) : '', room: schoolClass.room || '', capacity: schoolClass.capacity ?? 40, is_active: schoolClass.is_active }); setActiveModal('class') }}>Edit</button><button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => toggleActive(`/academics/classes/${schoolClass.id}/`, schoolClass.is_active, 'Class section')}>{schoolClass.is_active ? 'Archive' : 'Activate'}</button></div></td></tr>)}</tbody></table>
          </div>
        </div>
      </section>

      {activeModal === 'year' ? (
        <ModalShell title={editingYearId ? 'Edit Academic Year' : 'New Academic Year'} onClose={closeModal}>
          <form className="grid gap-4" onSubmit={submitYear}>
            <label className="grid gap-1 text-xs text-slate-300">Name<input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={yearForm.name} onChange={(e) => setYearForm((prev) => ({ ...prev, name: e.target.value }))} required /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-slate-300">Start date<input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={yearForm.start_date} onChange={(e) => setYearForm((prev) => ({ ...prev, start_date: e.target.value }))} required /></label>
              <label className="grid gap-1 text-xs text-slate-300">End date<input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={yearForm.end_date} onChange={(e) => setYearForm((prev) => ({ ...prev, end_date: e.target.value }))} required /></label>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={yearForm.is_current} onChange={(e) => setYearForm((prev) => ({ ...prev, is_current: e.target.checked }))} />Set as current academic year</label>
            <div className="flex justify-end gap-2"><button type="button" className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs" onClick={closeModal}>Cancel</button><button type="submit" className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900">Save</button></div>
          </form>
        </ModalShell>
      ) : null}

      {activeModal === 'term' ? (
        <ModalShell title={editingTermId ? 'Edit Term' : 'New Term'} onClose={closeModal}>
          <form className="grid gap-4" onSubmit={submitTerm}>
            <label className="grid gap-1 text-xs text-slate-300">Academic year<select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={termForm.academic_year} onChange={(e) => setTermForm((prev) => ({ ...prev, academic_year: e.target.value }))} required><option value="">Select year</option>{sortedYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
            <label className="grid gap-1 text-xs text-slate-300">Name<input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={termForm.name} onChange={(e) => setTermForm((prev) => ({ ...prev, name: e.target.value }))} required /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-xs text-slate-300">Start date<input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={termForm.start_date} onChange={(e) => setTermForm((prev) => ({ ...prev, start_date: e.target.value }))} required /></label><label className="grid gap-1 text-xs text-slate-300">End date<input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={termForm.end_date} onChange={(e) => setTermForm((prev) => ({ ...prev, end_date: e.target.value }))} required /></label></div>
            <label className="grid gap-1 text-xs text-slate-300">Billing date (optional)<input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={termForm.billing_date} onChange={(e) => setTermForm((prev) => ({ ...prev, billing_date: e.target.value }))} /></label>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={termForm.is_current} onChange={(e) => setTermForm((prev) => ({ ...prev, is_current: e.target.checked }))} />Set as current term</label>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={termForm.is_active} onChange={(e) => setTermForm((prev) => ({ ...prev, is_active: e.target.checked }))} />Active</label>
            <div className="flex justify-end gap-2"><button type="button" className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs" onClick={closeModal}>Cancel</button><button type="submit" className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900">Save</button></div>
          </form>
        </ModalShell>
      ) : null}

      {activeModal === 'grade' ? (
        <ModalShell title={editingGradeId ? 'Edit Grade Level' : 'New Grade Level'} onClose={closeModal}>
          <form className="grid gap-4" onSubmit={submitGrade}>
            <label className="grid gap-1 text-xs text-slate-300">Name<input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={gradeForm.name} onChange={(e) => setGradeForm((prev) => ({ ...prev, name: e.target.value }))} required /></label>
            <label className="grid gap-1 text-xs text-slate-300">Sort order<input type="number" min={1} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={gradeForm.order} onChange={(e) => setGradeForm((prev) => ({ ...prev, order: Number(e.target.value) }))} required /></label>
            <label className="grid gap-1 text-xs text-slate-300">Description<textarea className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={gradeForm.description} onChange={(e) => setGradeForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} /></label>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={gradeForm.is_active} onChange={(e) => setGradeForm((prev) => ({ ...prev, is_active: e.target.checked }))} />Active</label>
            <div className="flex justify-end gap-2"><button type="button" className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs" onClick={closeModal}>Cancel</button><button type="submit" className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900">Save</button></div>
          </form>
        </ModalShell>
      ) : null}

      {activeModal === 'class' ? (
        <ModalShell title={editingClassId ? 'Edit Class Section' : 'New Class Section'} onClose={closeModal}>
          <form className="grid gap-4" onSubmit={submitClass}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-slate-300">Academic year<select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={classForm.academic_year} onChange={(e) => setClassForm((prev) => ({ ...prev, academic_year: e.target.value }))} required><option value="">Select year</option>{sortedYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
              <label className="grid gap-1 text-xs text-slate-300">Grade level<select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={classForm.grade_level} onChange={(e) => setClassForm((prev) => ({ ...prev, grade_level: e.target.value }))}><option value="">Select grade</option>{sortedGrades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label>
            </div>
            <label className="grid gap-1 text-xs text-slate-300">Section name<input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={classForm.section_name} onChange={(e) => setClassForm((prev) => ({ ...prev, section_name: e.target.value }))} required /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-slate-300">Class teacher<select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={classForm.class_teacher} onChange={(e) => setClassForm((prev) => ({ ...prev, class_teacher: e.target.value }))}><option value="">Unassigned</option>{staff.map((member) => <option key={member.id} value={member.id}>{`${member.first_name} ${member.last_name}`.trim()}</option>)}</select></label>
              <label className="grid gap-1 text-xs text-slate-300">Room<input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={classForm.room} onChange={(e) => setClassForm((prev) => ({ ...prev, room: e.target.value }))} /></label>
            </div>
            <label className="grid gap-1 text-xs text-slate-300">Capacity<input type="number" min={1} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={classForm.capacity} onChange={(e) => setClassForm((prev) => ({ ...prev, capacity: Number(e.target.value) }))} required /></label>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={classForm.is_active} onChange={(e) => setClassForm((prev) => ({ ...prev, is_active: e.target.checked }))} />Active</label>
            <div className="flex justify-end gap-2"><button type="button" className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs" onClick={closeModal}>Cancel</button><button type="submit" className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900">Save</button></div>
          </form>
        </ModalShell>
      ) : null}

      {activeModal === 'clone' ? (
        <ModalShell title="Clone Academic Structure" onClose={closeModal}>
          <form className="grid gap-4" onSubmit={submitCloneYear}>
            <label className="grid gap-1 text-xs text-slate-300">New year name<input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={cloneForm.name} onChange={(e) => setCloneForm((prev) => ({ ...prev, name: e.target.value }))} required /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-xs text-slate-300">Start date<input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={cloneForm.start_date} onChange={(e) => setCloneForm((prev) => ({ ...prev, start_date: e.target.value }))} required /></label><label className="grid gap-1 text-xs text-slate-300">End date<input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={cloneForm.end_date} onChange={(e) => setCloneForm((prev) => ({ ...prev, end_date: e.target.value }))} required /></label></div>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={cloneForm.copy_terms} onChange={(e) => setCloneForm((prev) => ({ ...prev, copy_terms: e.target.checked }))} />Copy terms</label>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={cloneForm.copy_classes} onChange={(e) => setCloneForm((prev) => ({ ...prev, copy_classes: e.target.checked }))} />Copy classes</label>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={cloneForm.set_current} onChange={(e) => setCloneForm((prev) => ({ ...prev, set_current: e.target.checked }))} />Set as current year</label>
            <div className="flex justify-end gap-2"><button type="button" className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs" onClick={closeModal}>Cancel</button><button type="submit" className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900">Clone</button></div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  )
}
