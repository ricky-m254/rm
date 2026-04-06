import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type RegistryEntry = {
  id: number
  fingerprint_id: string
  card_no: string
  dahua_user_id: string
  person_type: 'STUDENT' | 'TEACHER' | 'STAFF'
  display_name: string
  enrolled_at: string
  is_active: boolean
  student_id: number | null
  employee_id: number | null
}

type SearchResult = {
  id: number
  full_name: string
  identifier: string
}

export default function ClockInRegistryPage() {
  const [entries, setEntries]     = useState<RegistryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({
    fingerprint_id: '',
    card_no:        '',
    dahua_user_id:  '',
    person_type:    'STUDENT' as const,
    person_id:      '',
    display_name:   '',
  })
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching]     = useState(false)
  void isSearching

  const [deleteId, setDeleteId]     = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchEntries = async () => {
    try {
      const res = await apiClient.get<RegistryEntry[]>('/clockin/registry/')
      setEntries(res.data)
    } catch {
      setError('Unable to load registry.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchEntries() }, [])

  const handleSearch = async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return }
    setIsSearching(true)
    try {
      const endpoint = formData.person_type === 'STUDENT' ? '/students/' : '/hr/employees/'
      const res = await apiClient.get<any[]>(endpoint, { params: { search: query } })
      setSearchResults(res.data.map(item => ({
        id: item.id,
        full_name: `${item.first_name} ${item.last_name}`,
        identifier: item.admission_number || item.employee_id || 'N/A'
      })))
    } catch { /* ignore */ } finally { setIsSearching(false) }
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    try {
      const payload: any = {
        fingerprint_id: formData.fingerprint_id,
        card_no:        formData.card_no || '',
        dahua_user_id:  formData.dahua_user_id || '',
        person_type:    formData.person_type,
        display_name:   formData.display_name,
      }
      if (formData.person_type === 'STUDENT') {
        payload.student_id = parseInt(formData.person_id)
      } else {
        payload.employee_id = parseInt(formData.person_id)
      }
      await apiClient.post('/clockin/registry/', payload)
      setIsAdding(false)
      setShowForm(false)
      setFormData({ fingerprint_id: '', card_no: '', dahua_user_id: '', person_type: 'STUDENT', person_id: '', display_name: '' })
      fetchEntries()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to enroll person.')
      setIsAdding(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await apiClient.delete(`/clockin/registry/${deleteId}/`)
      setDeleteId(null)
      fetchEntries()
    } catch {
      setError('Failed to delete enrollment.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 font-sans">
      <PageHero badge="CLOCK-IN" badgeColor="emerald" title="Registry" subtitle="Biometric enrollment — maps each person to their fingerprint, RFID card, or Dahua User ID" icon="⏰" />

      <header className="rounded-2xl glass-panel p-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-display font-semibold text-slate-100">Person Registry</h1>
          <p className="mt-1 text-sm text-slate-400">Manage biometric enrollment for students and staff.</p>
          {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition"
        >
          {showForm ? 'Cancel' : '+ Enroll Person'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleEnroll} className="rounded-2xl glass-panel p-6 space-y-5 animate-in fade-in slide-in-from-top-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-emerald-400">Enrollment Form</h2>
            <p className="text-xs text-slate-500 mt-1">
              <strong className="text-slate-300">Fingerprint ID</strong> is required. 
              For Dahua devices, also fill in <strong className="text-slate-300">RFID Card No</strong> (from the card programmed in the device) and/or <strong className="text-slate-300">Dahua User ID</strong> (the Employee No set on the device).
            </p>
          </div>

          {/* Identity */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Fingerprint / Biometric ID *</label>
              <input
                required
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono focus:border-emerald-500 outline-none transition"
                placeholder="e.g. 101"
                value={formData.fingerprint_id}
                onChange={e => setFormData({ ...formData, fingerprint_id: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">RFID Card No <span className="normal-case font-normal text-slate-600">(Dahua CardNo)</span></label>
              <input
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono focus:border-emerald-500 outline-none transition"
                placeholder="e.g. 123456"
                value={formData.card_no}
                onChange={e => setFormData({ ...formData, card_no: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Dahua User ID <span className="normal-case font-normal text-slate-600">(Employee No)</span></label>
              <input
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono focus:border-emerald-500 outline-none transition"
                placeholder="e.g. 1001 (leave blank to use Fingerprint ID)"
                value={formData.dahua_user_id}
                onChange={e => setFormData({ ...formData, dahua_user_id: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Person Type</label>
              <select
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm focus:border-emerald-500 outline-none transition"
                value={formData.person_type}
                onChange={e => setFormData({ ...formData, person_type: e.target.value as any, person_id: '', display_name: '' })}
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="STAFF">Non-Teaching Staff</option>
              </select>
            </div>
          </div>

          {/* Person search */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 relative">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Search Person</label>
              <input
                required
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm focus:border-emerald-500 outline-none transition"
                placeholder="Name or ID..."
                onChange={e => handleSearch(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-xl border border-white/[0.09] bg-[#0d1421] shadow-2xl p-1">
                  {searchResults.map(res => (
                    <button key={res.id} type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-500/20 rounded-lg transition flex justify-between"
                      onClick={() => { setFormData({ ...formData, person_id: String(res.id), display_name: res.full_name }); setSearchResults([]) }}
                    >
                      <span>{res.full_name}</span>
                      <span className="text-slate-500 font-mono text-xs">{res.identifier}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Display Name (Auto)</label>
              <input readOnly
                className="w-full rounded-xl border border-white/[0.09] bg-slate-800 px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                value={formData.display_name}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit"
              disabled={!formData.person_id || !formData.fingerprint_id || isAdding}
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              Confirm Enrollment
            </button>
          </div>
        </form>
      )}

      <section className="rounded-2xl glass-panel overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading registry…</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-slate-500 italic">No persons enrolled yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/[0.07] bg-slate-950/40 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Fingerprint ID</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">RFID / Dahua ID</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Name</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Type</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Status</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Enrolled</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-white/[0.025] transition">
                    <td className="px-6 py-4 font-mono text-emerald-400 text-xs">{entry.fingerprint_id}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {entry.card_no && <span className="block text-sky-400">Card: {entry.card_no}</span>}
                      {entry.dahua_user_id && <span className="block text-violet-400">DahuaID: {entry.dahua_user_id}</span>}
                      {!entry.card_no && !entry.dahua_user_id && <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-100">{entry.display_name}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300 uppercase">
                        {entry.person_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`h-2 w-2 inline-block rounded-full mr-2 ${entry.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                      {entry.is_active ? 'Active' : 'Inactive'}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(entry.enrolled_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setDeleteId(entry.id)}
                        className="text-rose-400 hover:text-rose-300 text-xs font-semibold">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!deleteId}
        title="Remove Enrollment"
        description="Are you sure you want to remove this person from the biometric registry? This will not delete their student/employee record, but they won't be able to clock in."
        confirmLabel="Remove"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
