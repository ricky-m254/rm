import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type AcademicYear = { id: number; name: string }
type Term = { id: number; name: string }
type SchoolClass = { id: number; display_name?: string; name: string }
type CalendarEvent = {
  id: number
  title: string
  event_type: string
  start_date: string
  end_date: string
  description?: string
  academic_year: number
  academic_year_name?: string
  term?: number | null
  term_name?: string
  scope: 'School-wide' | 'Class-specific' | 'Staff-only'
  class_section?: number | null
  class_section_name?: string
  is_public: boolean
}

export default function AcademicsCalendarPage() {
  const [years, setYears] = useState<AcademicYear[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<CalendarEvent | null>(null)

  const [form, setForm] = useState({
    title: '',
    event_type: 'Other',
    start_date: '',
    end_date: '',
    description: '',
    academic_year: '',
    term: '',
    scope: 'School-wide',
    class_section: '',
    is_public: true,
    is_active: true,
  })

  const loadAll = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [yearsRes, termsRes, classesRes, eventsRes] = await Promise.all([
        apiClient.get('/academics/ref/academic-years/'),
        apiClient.get('/academics/ref/terms/'),
        apiClient.get('/academics/classes/'),
        apiClient.get('/academics/calendar/'),
      ])
      setYears(normalizePaginatedResponse<AcademicYear>(yearsRes.data).items)
      setTerms(normalizePaginatedResponse<Term>(termsRes.data).items)
      setClasses(normalizePaginatedResponse<SchoolClass>(classesRes.data).items)
      setEvents(normalizePaginatedResponse<CalendarEvent>(eventsRes.data).items)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load calendar data.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const createEvent = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      setError('Invalid date range: start date cannot be after end date.')
      return
    }
    try {
      await apiClient.post('/academics/calendar/', {
        ...form,
        academic_year: Number(form.academic_year),
        term: form.term ? Number(form.term) : null,
        class_section: form.class_section ? Number(form.class_section) : null,
      })
      setForm({
        title: '',
        event_type: 'Other',
        start_date: '',
        end_date: '',
        description: '',
        academic_year: '',
        term: '',
        scope: 'School-wide',
        class_section: '',
        is_public: true,
        is_active: true,
      })
      setFlash('Calendar event created.')
      await loadAll()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create calendar event.'))
    }
  }

  const deleteEvent = async () => {
    if (!archiveTarget) return
    setError(null)
    setFlash(null)
    try {
      await apiClient.delete(`/academics/calendar/${archiveTarget.id}/`)
      setArchiveTarget(null)
      setFlash('Calendar event archived.')
      await loadAll()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to archive calendar event.'))
    }
  }

  const exportCalendar = async () => {
    setError(null)
    try {
      const response = await apiClient.get('/academics/calendar/export/', { responseType: 'blob' })
      downloadFromResponse(response as { data: Blob; headers?: Record<string, unknown> }, 'academic_calendar.ics')
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to export academic calendar.'))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="ACADEMICS"
        badgeColor="blue"
        title="Academic Calendar"
        subtitle="Create school calendar events and export iCal files."
        icon="📖"
      />

      {isLoading ? <div className="col-span-12 rounded-2xl glass-panel p-4 text-sm text-slate-300">Loading calendar...</div> : null}
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div> : null}
      {flash ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200">{flash}</div> : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-display font-semibold">Create Event</h2>
          <button className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs font-semibold text-slate-200" onClick={exportCalendar}>
            Export iCal
          </button>
        </div>
        <form className="mt-4 grid gap-3" onSubmit={createEvent}>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          <div className="grid gap-3 sm:grid-cols-4">
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={form.event_type} onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))}>
              {['Holiday', 'Exam', 'Sports', 'Trip', 'Meeting', 'Closure', 'Other'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} required />
            <input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} required />
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={form.scope} onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value as 'School-wide' | 'Class-specific' | 'Staff-only' }))}>
              {['School-wide', 'Class-specific', 'Staff-only'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={form.academic_year} onChange={(e) => setForm((p) => ({ ...p, academic_year: e.target.value }))} required>
              <option value="">Academic Year</option>
              {years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={form.term} onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))}>
              <option value="">Term (optional)</option>
              {terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={form.class_section} onChange={(e) => setForm((p) => ({ ...p, class_section: e.target.value }))} disabled={form.scope !== 'Class-specific'}>
              <option value="">Class (if class-specific)</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.display_name ?? item.name}</option>)}
            </select>
          </div>
          <textarea className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <button type="submit" className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900">Create Event</button>
        </form>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-display font-semibold">Calendar Events</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Date Range</th>
                <th className="px-3 py-2 text-left">Year/Term</th>
                <th className="px-3 py-2 text-left">Scope</th>
                <th className="px-3 py-2 text-left">Public</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {events.map((item) => (
                <tr key={item.id} className="bg-slate-950/50">
                  <td className="px-3 py-2">{item.title}</td>
                  <td className="px-3 py-2">{item.event_type}</td>
                  <td className="px-3 py-2">{item.start_date} to {item.end_date}</td>
                  <td className="px-3 py-2">{item.academic_year_name} {item.term_name ? `| ${item.term_name}` : ''}</td>
                  <td className="px-3 py-2">{item.scope} {item.class_section_name ? `(${item.class_section_name})` : ''}</td>
                  <td className="px-3 py-2">{item.is_public ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">
                    <button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => setArchiveTarget(item)}>
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
              {events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">No events yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive Calendar Event"
        description={
          archiveTarget
            ? `Archive "${archiveTarget.title}" (${archiveTarget.start_date} to ${archiveTarget.end_date})?`
            : 'Archive this calendar event?'
        }
        confirmLabel="Archive"
        cancelLabel="Cancel"
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => void deleteEvent()}
      />
    </div>
  )
}
