import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type FeeStructure = {
  id: number
  name: string
  amount: number
  category?: string
  academic_year: number
  term: number
  grade_level?: number | string | null
  is_active: boolean
}

const statusBadgeClass = (isActive: boolean) =>
  isActive
    ? 'border-emerald-400/40 text-emerald-200'
    : 'border-slate-600 text-slate-300'

export default function FinanceFeeStructuresPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [fees, setFees] = useState<FeeStructure[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FeeStructure | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 8
  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  )

  useEffect(() => {
    const state = location.state as { flash?: string } | null
    if (state?.flash) {
      setFlash(state.flash)
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        if (isMounted) setError(null)
        const feeRes = await apiClient.get<FeeStructure[] | { results: FeeStructure[]; count: number }>(
          '/finance/fees/',
          {
            params: {
              page,
              search: query.trim() || undefined,
              category: categoryFilter !== 'all' ? categoryFilter : undefined,
              is_active:
                statusFilter === 'all' ? undefined : statusFilter === 'active' ? true : false,
            },
          },
        )
        if (isMounted) {
          const normalized = normalizePaginatedResponse(feeRes.data)
          setFees(normalized.items)
          setTotalCount(normalized.totalCount)
          setIsServerPaginated(normalized.isPaginated)
        }
      } catch (err) {
        if (isMounted) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            setError('Session expired. Please log in again.')
          } else if (status === 403) {
            setError('Access denied. Ensure this user has the FINANCE module and proper role.')
          } else if (status === 404) {
            setError('Fee structure endpoints not found (404). Verify tenant routing.')
          } else {
            setError(extractApiErrorMessage(err, 'Unable to load fee structures. Please try again.'))
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [page, query, categoryFilter, statusFilter])

  const filteredFees = useMemo(() => {
    if (isServerPaginated) return fees
    const term = query.trim().toLowerCase()
    return fees.filter((fee) => {
      if (categoryFilter !== 'all' && fee.category !== categoryFilter) return false
      if (statusFilter !== 'all' && fee.is_active !== (statusFilter === 'active')) return false
      if (!term) return true
      return fee.name.toLowerCase().includes(term)
    })
  }, [fees, query, isServerPaginated, categoryFilter, statusFilter])

  const feeCategories = useMemo(() => {
    const set = new Set<string>()
    fees.forEach((fee) => {
      if (fee.category) set.add(fee.category)
    })
    return Array.from(set).sort()
  }, [fees])

  const pagedFees = useMemo(() => {
    if (isServerPaginated) return filteredFees
    const start = (page - 1) * pageSize
    return filteredFees.slice(start, start + pageSize)
  }, [filteredFees, page, isServerPaginated])

  const totalPages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : filteredFees.length) / pageSize),
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await apiClient.delete(`/finance/fees/${deleteTarget.id}/`)
      setFees((prev) => prev.filter((fee) => fee.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(extractApiErrorMessage(err, 'Unable to delete fee structure.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title="Fee Structures"
        subtitle="Base fees by academic year and term."
        icon="💰"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading fee structures...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}

      {flash ? (
        <div className="col-span-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="text-sm text-emerald-200">{flash}</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Fee list</h2>
            <p className="mt-1 text-sm text-slate-400">From `/api/finance/fees/`</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="w-full max-w-xs rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search fee name"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
            />
            <select
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white sm:w-auto"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All categories</option>
              {feeCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white sm:w-auto"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
                setPage(1)
              }}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              className="w-full rounded-xl border border-white/[0.09] px-3 py-2 text-sm text-slate-200 sm:w-auto"
              onClick={() => {
                setQuery('')
                setCategoryFilter('all')
                setStatusFilter('all')
                setPage(1)
              }}
            >
              Reset
            </button>
            <button
              className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 sm:w-auto"
              onClick={() => navigate('/modules/finance/fee-structures/new')}
            >
              Create fee
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">On small screens, scroll the table horizontally.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Academic Year</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pagedFees.map((fee) => (
                <tr key={fee.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">{fee.name}</td>
                  <td className="px-4 py-3">{fee.category ?? '--'}</td>
                  <td className="px-4 py-3">{Number(fee.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{fee.academic_year}</td>
                  <td className="px-4 py-3">{fee.term}</td>
                  <td className="px-4 py-3">{fee.grade_level ?? '--'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-1 text-xs ${statusBadgeClass(fee.is_active)}`}>
                      {fee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200"
                      onClick={() => navigate(`/modules/finance/fee-structures/${fee.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button
                      className="ml-2 rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200"
                      onClick={() => setDeleteTarget(fee)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {pagedFees.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={8}>
                    No fee structures found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete fee structure"
        description={
          <>
            This will permanently remove <strong>{deleteTarget?.name}</strong>. Continue?
          </>
        }
        confirmLabel="Confirm delete"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
