import { useState, useEffect, useCallback } from 'react'
import type { FormEvent } from 'react'
import { Search, Grid3X3, List, BookOpen, Loader2, X, ExternalLink, Globe, CheckCircle, AlertCircle } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'
import { cachedGet } from '../../api/cache'

interface LibraryResource {
  id: number
  title: string
  subtitle: string
  authors: string
  publisher: string
  publication_year: number | null
  isbn: string
  resource_type: string
  subjects: string
  language: string
  category_name: string
  total_copies: number
  available_copies: number
  is_active: boolean
}

interface LibraryMember {
  id: number
  member_id: string
  member_type: string
  status: string
  total_fines: string
  student_name: string
  user_name: string
}

interface ResourceCopy {
  id: number
  barcode: string
  status: string
}

type ViewMode = 'grid' | 'list'
type ModalMode = 'borrow' | 'reserve'

const SUBJECT_COLORS: Record<string, { from: string; to: string; icon: string }> = {
  'Mathematics':    { from: '#1d4ed8', to: '#3b82f6', icon: '📐' },
  'Biology':        { from: '#166534', to: '#22c55e', icon: '🧬' },
  'Chemistry':      { from: '#581c87', to: '#a855f7', icon: '⚗️' },
  'Physics':        { from: '#0c4a6e', to: '#0ea5e9', icon: '⚡' },
  'English':        { from: '#065f46', to: '#10b981', icon: '📖' },
  'Kiswahili':      { from: '#92400e', to: '#f59e0b', icon: '🗣️' },
  'History':        { from: '#7c2d12', to: '#f97316', icon: '🏛️' },
  'Geography':      { from: '#14532d', to: '#84cc16', icon: '🌍' },
  'Computer Studies': { from: '#1e1b4b', to: '#6366f1', icon: '💻' },
  'Business':       { from: '#1e3a5f', to: '#64748b', icon: '💼' },
  'Agriculture':    { from: '#052e16', to: '#16a34a', icon: '🌱' },
  'Literature':     { from: '#065f46', to: '#10b981', icon: '📚' },
  'Fiction':        { from: '#713f12', to: '#eab308', icon: '📕' },
  'Reference':      { from: '#292524', to: '#78716c', icon: '📕' },
}
const getColors = (subject: string, type: string) => {
  for (const [key, v] of Object.entries(SUBJECT_COLORS)) {
    if (subject?.toLowerCase().includes(key.toLowerCase()) || type?.toLowerCase().includes(key.toLowerCase())) return v
  }
  return { from: '#1e293b', to: '#475569', icon: '📖' }
}

const CBC_RESOURCES = [
  {
    name: 'Kenya Education Cloud',
    short: 'KEC',
    desc: 'Official KICD platform with full CBC curriculum — pre-primary to Form 4, radio lessons, e-books, and OER.',
    url: 'https://kec.ac.ke/',
    lmsUrl: 'https://lms.kec.ac.ke/',
    color: '#10b981',
    icon: '🇰🇪',
    tag: 'Official · Free',
  },
  {
    name: 'KICD OER Portal',
    short: 'OER',
    desc: 'Openly licensed CBC materials with no restrictions. Free to integrate into your school catalog.',
    url: 'https://oer.kec.ac.ke/',
    color: '#6366f1',
    icon: '📂',
    tag: 'Open Access',
  },
  {
    name: 'KICD CBC Materials',
    short: 'KICD',
    desc: 'Approved CBC course materials, teacher guides, assessment resources, and values-based education content.',
    url: 'https://kicd.ac.ke/cbc-materials/',
    color: '#f59e0b',
    icon: '📘',
    tag: 'Curriculum Authority',
  },
  {
    name: 'MsingiPACK Cloud',
    short: 'MSP',
    desc: 'KICD-approved interactive digital content with an integrated data API. Cost-effective exam revision.',
    url: 'https://www.msingipack.cloud/',
    color: '#3b82f6',
    icon: '📱',
    tag: 'API Available',
  },
  {
    name: 'OER Commons Kenya',
    short: 'OER',
    desc: 'Kenya ICT CFT resources and Ministry of Education materials. API available for content integration.',
    url: 'https://oercommons.org/curated-collections/604',
    color: '#a855f7',
    icon: '🌐',
    tag: 'API Available',
  },
  {
    name: 'M-Shule Platform',
    short: 'SMS',
    desc: '60,000+ curriculum items delivered via SMS — ideal for low-bandwidth and rural environments.',
    url: 'https://m-shule.com/',
    color: '#ec4899',
    icon: '📡',
    tag: 'SMS-based',
  },
]

function BookCoverImage({ isbn, title, icon, from: from_, to }: {
  isbn: string; title: string; icon: string; from: string; to: string
}) {
  const [imgState, setImgState] = useState<'loading' | 'ok' | 'error'>('loading')
  const url = isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg` : ''

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: `linear-gradient(160deg, ${from_}, ${to})` }}>
      {isbn && imgState !== 'error' && (
        <img
          src={url} alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: imgState === 'ok' ? 1 : 0 }}
          onLoad={() => setImgState('ok')}
          onError={() => setImgState('error')}
        />
      )}
      {(imgState !== 'ok' || !isbn) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
          <span className="text-4xl drop-shadow-md">{icon}</span>
        </div>
      )}
    </div>
  )
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {children}
    </div>
  )
}

function BorrowModal({
  book,
  mode,
  onClose,
  onSuccess,
}: {
  book: LibraryResource
  mode: ModalMode
  onClose: () => void
  onSuccess: (bookId: number, delta: number) => void
}) {
  const [members, setMembers] = useState<LibraryMember[]>([])
  const [copies, setCopies] = useState<ResourceCopy[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [memberId, setMemberId] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const p1 = apiClient.get('/library/members/?is_active=true&limit=200').then(r => {
      const data = r.data
      setMembers(Array.isArray(data) ? data : data.results ?? [])
    })
    const p2 = mode === 'borrow'
      ? apiClient.get(`/library/copies/?resource=${book.id}&status=Available&limit=10`).then(r => {
          const data = r.data
          setCopies(Array.isArray(data) ? data : data.results ?? [])
        })
      : Promise.resolve()
    Promise.all([p1, p2]).finally(() => setLoadingData(false))
  }, [book.id, mode])

  const displayName = (m: LibraryMember) =>
    m.student_name || m.user_name || m.member_id

  const filteredMembers = members.filter(m =>
    m.status === 'Active' &&
    (memberSearch === '' ||
      displayName(m).toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.member_id.toLowerCase().includes(memberSearch.toLowerCase()))
  )

  const selectedMember = members.find(m => String(m.id) === memberId)

  const handleSubmit = useCallback(async () => {
    if (!memberId) { setError('Please select a member'); return }
    setSubmitting(true)
    setError('')
    try {
      if (mode === 'borrow') {
        if (copies.length === 0) { setError('No available copies found'); setSubmitting(false); return }
        await apiClient.post('/library/circulation/issue/', { member: Number(memberId), copy: copies[0].id })
        onSuccess(book.id, -1)
        onClose()
      } else {
        await apiClient.post('/library/reservations/', { resource: book.id, member: Number(memberId) })
        onSuccess(book.id, 0)
        onClose()
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Request failed. Please try again.'
      setError(msg)
      setSubmitting(false)
    }
  }, [memberId, mode, copies, book.id, onSuccess, onClose])

  const { from, to } = getColors(book.subjects, book.resource_type)
  const isBorrow = mode === 'borrow'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md">
        <GlassCard className="overflow-hidden">
          {/* Header */}
          <div className="p-5 flex items-center gap-4" style={{ background: `linear-gradient(135deg, ${from}88, ${to}88)` }}>
            <div className="w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/20">
              <BookCoverImage isbn={book.isbn} title={book.title} icon={getColors(book.subjects, book.resource_type).icon} from={from} to={to} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white/60 uppercase">{isBorrow ? 'Issue Book' : 'Reserve Book'}</p>
              <p className="text-sm font-bold text-white leading-snug">{book.title}</p>
              <p className="text-xs text-white/60 truncate">{book.authors}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <X size={15} className="text-white" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="text-indigo-400 animate-spin" />
              </div>
            ) : (
              <>
                {/* Availability info */}
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: isBorrow ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${isBorrow ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                  {isBorrow ? (
                    copies.length > 0
                      ? <><CheckCircle size={14} className="text-emerald-400 flex-shrink-0" /><span className="text-xs text-emerald-300">{copies.length} copy/copies available · Copy #{copies[0].barcode}</span></>
                      : <><AlertCircle size={14} className="text-red-400 flex-shrink-0" /><span className="text-xs text-red-300">No available copies</span></>
                  ) : (
                    <><AlertCircle size={14} className="text-amber-400 flex-shrink-0" /><span className="text-xs text-amber-300">All {book.total_copies} copies borrowed — reservation will queue you</span></>
                  )}
                </div>

                {/* Member search */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Search Member</label>
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={memberSearch} onChange={e => { setMemberSearch(e.target.value); setMemberId('') }}
                      placeholder="Name or member ID…"
                      className="w-full pl-8 pr-3 py-2 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  {memberSearch && filteredMembers.length > 0 && !memberId && (
                    <div className="mt-1.5 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#0f172a', maxHeight: 200, overflowY: 'auto' }}>
                      {filteredMembers.slice(0, 8).map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setMemberId(String(m.id)); setMemberSearch(displayName(m)) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-all flex items-center justify-between"
                        >
                          <span className="text-white font-medium">{displayName(m)}</span>
                          <span className="text-xs text-slate-500">{m.member_id} · {m.member_type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {memberSearch && filteredMembers.length === 0 && (
                    <p className="mt-1.5 text-xs text-slate-500 pl-1">No active members found</p>
                  )}
                </div>

                {/* Selected member info */}
                {selectedMember && (
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                      {displayName(selectedMember).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{displayName(selectedMember)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-indigo-300">{selectedMember.member_id}</span>
                        <span className="text-xs text-slate-500">{selectedMember.member_type}</span>
                        {Number(selectedMember.total_fines) > 0 && (
                          <span className="text-xs text-amber-400">Ksh {Number(selectedMember.total_fines).toLocaleString('en-KE', { minimumFractionDigits: 2 })} fines</span>
                        )}
                      </div>
                    </div>
                    <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-red-300" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={13} className="flex-shrink-0" /> {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !memberId || (isBorrow && copies.length === 0)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: isBorrow ? '#6366f1' : '#f59e0b', color: '#fff' }}
                  >
                    {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                    {submitting ? 'Processing…' : isBorrow ? 'Issue Book' : 'Reserve Book'}
                  </button>
                </div>
              </>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

export default function LibraryCatalogPage() {
  const [books, setBooks] = useState<LibraryResource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [view, setView] = useState<ViewMode>('grid')
  const [modal, setModal] = useState<{ book: LibraryResource; mode: ModalMode } | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    cachedGet<LibraryResource[] | { results?: LibraryResource[] }>(
      '/library/resources/200',
      () => apiClient.get('/library/resources/?limit=200').then(r => r.data as LibraryResource[] | { results?: LibraryResource[] }),
      3 * 60_000
    )
      .then(data => setBooks(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSuccess = useCallback((bookId: number, delta: number) => {
    setBooks(prev => prev.map(b =>
      b.id === bookId
        ? { ...b, available_copies: Math.max(0, b.available_copies + delta) }
        : b
    ))
    if (delta < 0) showToast('Book issued successfully — due in 14 days')
    else showToast('Reservation placed — you will be notified when ready')
  }, [])

  const openBorrow = (b: LibraryResource) => setModal({ book: b, mode: b.available_copies > 0 ? 'borrow' : 'reserve' })

  const categories = ['All', ...Array.from(new Set(books.map(b => b.category_name).filter(Boolean))).sort()]

  const filtered = books.filter(b => {
    const matchCat = category === 'All' || b.category_name === category
    const matchSearch = search === '' ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.authors.toLowerCase().includes(search.toLowerCase()) ||
      (b.subjects || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const totalCopies = books.reduce((s, b) => s + (b.total_copies || 0), 0)

  const handleSearch = (e: FormEvent) => e.preventDefault()

  return (
    <div className="space-y-6">
      {/* Borrow/Reserve modal */}
      {modal && (
        <BorrowModal
          book={modal.book}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-[60] flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold shadow-2xl transition-all"
          style={toast.ok
            ? { background: 'rgba(16,185,129,0.95)', color: '#fff' }
            : { background: 'rgba(239,68,68,0.95)', color: '#fff' }}
        >
          {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <PageHero
        badge="LIBRARY"
        badgeColor="teal"
        title="Book Catalogue"
        subtitle="Search and browse the school library collection"
        icon="📚"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white capitalize">Library Catalog</h1>
          <p className="text-slate-400 text-sm mt-1">
            {loading ? '…' : books.length} Titles · {loading ? '…' : totalCopies} Copies Total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('grid')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={view === 'grid' ? { background: '#6366f1', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setView('list')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={view === 'list' ? { background: '#6366f1', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, author, or subject…"
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </form>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(c => (
          <button
            key={c} onClick={() => setCategory(c)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize"
            style={category === c
              ? { background: '#6366f1', color: '#fff' }
              : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400">{filtered.length} results</p>

          {/* Grid View */}
          {view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.map(b => {
                const { from, to, icon } = getColors(b.subjects, b.resource_type)
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl border overflow-hidden hover:border-indigo-500/40 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
                    style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
                  >
                    <div className="h-48 relative">
                      <BookCoverImage isbn={b.isbn} title={b.title} icon={icon} from={from} to={to} />
                      <div className="absolute top-2 right-2">
                        <span
                          className="px-1.5 py-0.5 rounded-md text-xs font-bold backdrop-blur-sm"
                          style={b.available_copies > 0
                            ? { background: 'rgba(0,0,0,0.55)', color: '#34d399' }
                            : { background: 'rgba(0,0,0,0.55)', color: '#f87171' }}
                        >
                          {b.available_copies > 0 ? `${b.available_copies} avail` : 'All Out'}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors line-clamp-2 capitalize">{b.title}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate">{b.authors}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-600">{b.publication_year}</span>
                        <button
                          onClick={e => { e.stopPropagation(); openBorrow(b) }}
                          className="px-2 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
                          style={b.available_copies > 0
                            ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }
                            : { background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)' }}
                        >
                          {b.available_copies > 0 ? 'Borrow' : 'Reserve'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* List View */
            <GlassCard className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Title', 'Author', 'Subject', 'Category', 'Year', 'Copies', 'Status', 'Action'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b => {
                    const { from, to, icon } = getColors(b.subjects, b.resource_type)
                    return (
                      <tr key={b.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-10 rounded overflow-hidden flex-shrink-0">
                              <BookCoverImage isbn={b.isbn} title={b.title} icon={icon} from={from} to={to} />
                            </div>
                            <span className="font-semibold text-white capitalize">{b.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{b.authors}</td>
                        <td className="px-4 py-3 text-slate-400">{b.subjects || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>{b.category_name}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{b.publication_year}</td>
                        <td className="px-4 py-3 text-slate-400">{b.available_copies}/{b.total_copies}</td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={b.available_copies > 0
                              ? { background: 'rgba(16,185,129,0.15)', color: '#34d399' }
                              : { background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}
                          >
                            {b.available_copies > 0 ? 'Available' : 'All Borrowed'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openBorrow(b)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
                            style={b.available_copies > 0
                              ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }
                              : { background: 'rgba(245,158,11,0.1)', color: '#fcd34d' }}
                          >
                            {b.available_copies > 0 ? 'Borrow' : 'Reserve'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </GlassCard>
          )}
        </>
      )}

      {/* CBC Digital Resources Section */}
      <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Globe size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-white">CBC Digital Resources</h2>
            <p className="text-xs text-slate-500 mt-0.5">Kenya Competency-Based Curriculum official and approved online learning platforms</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CBC_RESOURCES.map(r => (
            <a
              key={r.name}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border p-4 flex items-start gap-3 transition-all hover:border-white/20 hover:scale-[1.01]"
              style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-transform group-hover:scale-110"
                style={{ background: `${r.color}20` }}
              >
                {r.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{r.name}</p>
                  <ExternalLink size={12} className="text-slate-500 flex-shrink-0 mt-0.5 group-hover:text-slate-300 transition-colors" />
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{r.desc}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="px-1.5 py-0.5 rounded-md text-xs font-semibold"
                    style={{ background: `${r.color}20`, color: r.color }}
                  >
                    {r.tag}
                  </span>
                  {'lmsUrl' in r && r.lmsUrl && (
                    <a
                      href={r.lmsUrl}
                      onClick={e => e.stopPropagation()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 py-0.5 rounded-md text-xs font-semibold hover:opacity-80 transition-all"
                      style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}
                    >
                      LMS Portal
                    </a>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-slate-600">
          Contact KICD at info@kicd.ac.ke · +254 748029186 to request API access for catalog integration
        </p>
      </div>

      {/* Open Library attribution */}
      <p className="text-center text-xs text-slate-600 flex items-center justify-center gap-1.5">
        <BookOpen size={11} />
        Book covers sourced from Open Library — the world's largest open book catalog
      </p>
    </div>
  )
}
