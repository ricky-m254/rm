import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { apiClient } from '../../api/client'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'
import {
  type StaffLifecycleEvent,
  asRecord,
  formatDate,
  formatDateTime,
  formatLabel,
  readNestedText,
  readSnapshotDepartmentName,
  readSnapshotPositionTitle,
  readSnapshotStatus,
  toArray,
} from './hrLifecycleShared'

type Employee = {
  id: number
  employee_id: string
  full_name: string
  department_name: string
  position_title: string
  status: string
  employment_type: string
  join_date: string
  work_location: string
  archived_at?: string | null
  archive_reason?: string
}

type EmergencyContact = {
  id: number
  employee: number
  name: string
  relationship: string
  phone_primary: string
  phone_alt: string
  address: string
  is_primary: boolean
}

type EmployeeDocument = {
  id: number
  employee: number
  employee_name: string
  document_type: string
  file: string
  file_name: string
  description: string
  issue_date: string | null
  expiry_date: string | null
  uploaded_at: string
}

const defaultContactForm = {
  name: '',
  relationship: '',
  phone_primary: '',
  phone_alt: '',
  address: '',
  is_primary: true,
}

const defaultDocumentForm = {
  document_type: 'Other',
  description: '',
  issue_date: '',
  expiry_date: '',
  file: null as File | null,
}

export default function HrEmployeeProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const employeeId = Number(id)
  const includeArchived = searchParams.get('include_archived') === '1'
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [documents, setDocuments] = useState<EmployeeDocument[]>([])
  const [expiringDocuments, setExpiringDocuments] = useState<EmployeeDocument[]>([])
  const [timelineEvents, setTimelineEvents] = useState<StaffLifecycleEvent[]>([])
  const [contactForm, setContactForm] = useState(defaultContactForm)
  const [documentForm, setDocumentForm] = useState(defaultDocumentForm)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [deleteContactTarget, setDeleteContactTarget] = useState<number | null>(null)
  const [deleteDocTarget, setDeleteDocTarget] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const canLoad = useMemo(() => Number.isFinite(employeeId) && employeeId > 0, [employeeId])

  const load = async () => {
    if (!canLoad) {
      setError('Invalid employee ID.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [employeeRes, contactsRes, docsRes, expiringRes, timelineRes] = await Promise.all([
        apiClient.get<Employee>(`/hr/employees/${employeeId}/`, {
          params: includeArchived ? { include_archived: 1 } : undefined,
        }),
        apiClient.get<EmergencyContact[] | { results: EmergencyContact[] }>(`/hr/emergency-contacts/?employee=${employeeId}`),
        apiClient.get<EmployeeDocument[] | { results: EmployeeDocument[] }>(`/hr/documents/?employee=${employeeId}`),
        apiClient.get<EmployeeDocument[] | { results: EmployeeDocument[] }>(`/hr/documents/expiring/?days=45&employee=${employeeId}`),
        apiClient.get<StaffLifecycleEvent[] | { results: StaffLifecycleEvent[] }>(`/hr/employees/${employeeId}/timeline/`),
      ])
      setEmployee(employeeRes.data)
      setContacts(toArray(contactsRes.data))
      setDocuments(toArray(docsRes.data))
      setExpiringDocuments(toArray(expiringRes.data))
      setTimelineEvents(toArray(timelineRes.data))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load employee profile. Please check the employee record exists.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [employeeId, includeArchived])

  const handleAddContact = async () => {
    if (!contactForm.name || !contactForm.relationship || !contactForm.phone_primary) {
      setError('Contact name, relationship, and primary phone are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/emergency-contacts/', {
        employee: employeeId,
        ...contactForm,
      })
      setContactForm(defaultContactForm)
      setNotice('Emergency contact saved.')
      await load()
    } catch {
      setError('Failed to save emergency contact.')
    } finally {
      setWorking(false)
    }
  }

  const handleDeleteContact = async () => {
    if (!deleteContactTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    setNotice(null)
    try {
      await apiClient.delete(`/hr/emergency-contacts/${deleteContactTarget}/`)
      setNotice('Emergency contact archived.')
      setDeleteContactTarget(null)
      await load()
    } catch {
      setDeleteError('Failed to archive emergency contact.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUploadDocument = async () => {
    if (!documentForm.file) {
      setError('Select a file to upload.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const payload = new FormData()
      payload.append('employee', String(employeeId))
      payload.append('document_type', documentForm.document_type)
      payload.append('file', documentForm.file)
      payload.append('description', documentForm.description)
      if (documentForm.issue_date) payload.append('issue_date', documentForm.issue_date)
      if (documentForm.expiry_date) payload.append('expiry_date', documentForm.expiry_date)
      await apiClient.post('/hr/documents/upload/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDocumentForm(defaultDocumentForm)
      setNotice('Document uploaded.')
      await load()
    } catch {
      setError('Failed to upload document.')
    } finally {
      setWorking(false)
    }
  }

  const handleDownloadDocument = async (documentId: number, fileName: string) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const response = await apiClient.get(`/hr/documents/${documentId}/download/`, {
        responseType: 'blob',
      })
      downloadFromResponse(
        response as { data: Blob; headers?: Record<string, unknown> },
        fileName || `document-${documentId}`,
      )
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Failed to download document.'))
    } finally {
      setWorking(false)
    }
  }

  const handleDeleteDocument = async () => {
    if (!deleteDocTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    setNotice(null)
    try {
      await apiClient.delete(`/hr/documents/${deleteDocTarget}/`)
      setNotice('Document archived.')
      setDeleteDocTarget(null)
      await load()
    } catch {
      setDeleteError('Failed to archive document.')
    } finally {
      setIsDeleting(false)
    }
  }

  const timelineTone = (eventGroup: string) => {
    const toneMap: Record<string, string> = {
      TRANSFER: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
      CAREER: 'border-violet-500/30 bg-violet-500/10 text-violet-100',
      DISCIPLINE: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
      EXIT: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
      CLEARANCE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
      ARCHIVE: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-100',
    }
    return toneMap[eventGroup] ?? toneMap.CAREER
  }

  const renderSnapshotChange = (label: string, beforeValue: string, afterValue: string) => {
    if ((!beforeValue && !afterValue) || beforeValue === afterValue) return null
    return (
      <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
        <p className="text-[11px] uppercase tracking-widest text-slate-500">{label}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-[11px] text-slate-500">Before</p>
            <p className="mt-1 text-sm text-slate-200">{beforeValue || '-'}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">After</p>
            <p className="mt-1 text-sm text-slate-200">{afterValue || '-'}</p>
          </div>
        </div>
      </div>
    )
  }

  const renderTimelineMeta = (event: StaffLifecycleEvent) => {
    const metadata = asRecord(event.metadata)
    const exitCase = asRecord(metadata?.exit_case)
    const disciplinaryCase = asRecord(metadata?.case)
    const archiveReason = readNestedText(asRecord(event.after_snapshot), 'archive_reason') || readNestedText(metadata, 'archive_reason')
    const lockedAssignments = readNestedText(metadata, 'deactivated_module_assignment_count')

    return (
      <>
        {exitCase ? (
          <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Exit Context</p>
            <p className="mt-2 text-sm text-slate-200">
              {formatLabel(readNestedText(exitCase, 'exit_type') || event.event_type)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Case status: {formatLabel(readNestedText(exitCase, 'status') || '-')}
            </p>
          </div>
        ) : null}
        {disciplinaryCase ? (
          <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Case Context</p>
            <p className="mt-2 text-sm text-slate-200">{readNestedText(disciplinaryCase, 'case_number') || event.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              Outcome: {formatLabel(readNestedText(disciplinaryCase, 'outcome') || 'Pending')}
            </p>
          </div>
        ) : null}
        {archiveReason || lockedAssignments ? (
          <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Archive Context</p>
            {archiveReason ? <p className="mt-2 text-sm text-slate-200">{archiveReason}</p> : null}
            {lockedAssignments ? (
              <p className="mt-1 text-xs text-slate-500">
                Deactivated module assignments: {lockedAssignments}
              </p>
            ) : null}
          </div>
        ) : null}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="violet"
        title="Employee Profile"
        subtitle="Detailed staff record and career history"
        icon={UserRound}
      />
      <section className="rounded-2xl glass-panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Employee Profile</p>
            <h1 className="mt-2 text-2xl font-display font-semibold">{employee?.full_name || 'Loading...'}</h1>
          </div>
          <Link
            to="/modules/hr/employees"
            className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm text-slate-100"
          >
            Back to directory
          </Link>
        </div>
        {employee ? (
          <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            <p>
              <span className="text-slate-500">Employee ID:</span> {employee.employee_id}
            </p>
            <p>
              <span className="text-slate-500">Department:</span> {employee.department_name || 'Unassigned'}
            </p>
            <p>
              <span className="text-slate-500">Position:</span> {employee.position_title || 'Unassigned'}
            </p>
            <p>
              <span className="text-slate-500">Status:</span> {employee.status}
            </p>
            <p>
              <span className="text-slate-500">Type:</span> {employee.employment_type}
            </p>
            <p>
              <span className="text-slate-500">Join Date:</span> {employee.join_date}
            </p>
            <p className="sm:col-span-2">
              <span className="text-slate-500">Work Location:</span> {employee.work_location || '-'}
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Lifecycle Timeline</p>
            <h2 className="mt-2 text-2xl font-display font-semibold text-slate-100">Permanent staff history</h2>
          </div>
          {includeArchived ? (
            <div className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-100">
              Archived profile view
            </div>
          ) : null}
        </div>

        {timelineEvents.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-slate-500">
            No lifecycle events recorded yet.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {timelineEvents.map((event) => {
              const beforeDepartment = readSnapshotDepartmentName(event.before_snapshot)
              const afterDepartment = readSnapshotDepartmentName(event.after_snapshot)
              const beforePosition = readSnapshotPositionTitle(event.before_snapshot)
              const afterPosition = readSnapshotPositionTitle(event.after_snapshot)
              const beforeStatus = readSnapshotStatus(event.before_snapshot)
              const afterStatus = readSnapshotStatus(event.after_snapshot)

              return (
                <article key={event.id} className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-950/50 p-4">
                  <div className="absolute inset-y-0 left-0 w-1" style={{ background: 'linear-gradient(180deg, rgba(99,102,241,0.6), rgba(16,185,129,0.35))' }} />
                  <div className="pl-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${timelineTone(event.event_group)}`}>
                            {formatLabel(event.event_group)}
                          </span>
                          <p className="text-sm font-semibold text-slate-100">{event.title}</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{event.summary || event.event_type}</p>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <p>{formatDate(event.effective_date)}</p>
                        <p className="mt-1">{event.recorded_by_name || 'System'}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      {renderSnapshotChange('Status', beforeStatus, afterStatus)}
                      {renderSnapshotChange('Department', beforeDepartment, afterDepartment)}
                      {renderSnapshotChange('Position', beforePosition, afterPosition)}
                      {renderTimelineMeta(event)}
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      Recorded {formatDateTime(event.occurred_at)} {event.status_snapshot ? ` / Status snapshot ${event.status_snapshot}` : ''}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="space-y-4 rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Emergency Contacts</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={contactForm.name}
              onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Contact name"
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              value={contactForm.relationship}
              onChange={(event) => setContactForm((prev) => ({ ...prev, relationship: event.target.value }))}
              placeholder="Relationship"
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              value={contactForm.phone_primary}
              onChange={(event) => setContactForm((prev) => ({ ...prev, phone_primary: event.target.value }))}
              placeholder="Primary phone"
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              value={contactForm.phone_alt}
              onChange={(event) => setContactForm((prev) => ({ ...prev, phone_alt: event.target.value }))}
              placeholder="Alternate phone"
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              value={contactForm.address}
              onChange={(event) => setContactForm((prev) => ({ ...prev, address: event.target.value }))}
              placeholder="Address"
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={contactForm.is_primary}
                onChange={(event) => setContactForm((prev) => ({ ...prev, is_primary: event.target.checked }))}
              />
              Primary contact
            </label>
            <button
              onClick={handleAddContact}
              disabled={working}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 sm:col-span-2"
            >
              Add Contact
            </button>
          </div>
          <div className="space-y-2">
            {(loading ? [] : contacts).map((contact) => (
              <div key={contact.id} className="rounded-lg border border-white/[0.07] bg-slate-950/60 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-slate-100">
                    {contact.name} ({contact.relationship}) {contact.is_primary ? '• Primary' : ''}
                  </p>
                  <button
                    onClick={() => setDeleteContactTarget(contact.id)}
                    className="text-xs text-rose-300"
                  >
                    Archive
                  </button>
                </div>
                <p className="mt-1 text-slate-400">{contact.phone_primary}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="space-y-4 rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Employee Documents</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={documentForm.document_type}
              onChange={(event) => setDocumentForm((prev) => ({ ...prev, document_type: event.target.value }))}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            >
              <option value="Resume">Resume</option>
              <option value="Certificate">Certificate</option>
              <option value="License">License</option>
              <option value="ID">ID</option>
              <option value="Contract">Contract</option>
              <option value="Medical">Medical</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="file"
              onChange={(event) =>
                setDocumentForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))
              }
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              value={documentForm.description}
              onChange={(event) => setDocumentForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Description"
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              type="date"
              value={documentForm.issue_date}
              onChange={(event) => setDocumentForm((prev) => ({ ...prev, issue_date: event.target.value }))}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={documentForm.expiry_date}
              onChange={(event) => setDocumentForm((prev) => ({ ...prev, expiry_date: event.target.value }))}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <button
              onClick={handleUploadDocument}
              disabled={working}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 sm:col-span-2"
            >
              Upload Document
            </button>
          </div>

          {expiringDocuments.length > 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              {expiringDocuments.length} document(s) expiring within 45 days.
            </div>
          ) : null}

          <div className="space-y-2">
            {(loading ? [] : documents).map((document) => (
              <div key={document.id} className="rounded-lg border border-white/[0.07] bg-slate-950/60 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-slate-100">{document.file_name}</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => void handleDownloadDocument(document.id, document.file_name)}
                      disabled={working}
                      className="text-xs text-emerald-300"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => setDeleteDocTarget(document.id)}
                      className="text-xs text-rose-300"
                    >
                      Archive
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-slate-400">
                  {document.document_type}
                  {document.expiry_date ? ` • Expiry ${document.expiry_date}` : ''}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <ConfirmDialog
        open={deleteContactTarget !== null}
        title="Archive Emergency Contact"
        description="Are you sure you want to archive this emergency contact?"
        confirmLabel="Archive"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteContact}
        onCancel={() => {
          setDeleteContactTarget(null)
          setDeleteError(null)
        }}
      />

      <ConfirmDialog
        open={deleteDocTarget !== null}
        title="Archive Document"
        description="Are you sure you want to archive this document?"
        confirmLabel="Archive"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteDocument}
        onCancel={() => {
          setDeleteDocTarget(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
