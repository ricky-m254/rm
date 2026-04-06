import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import { downloadBlob } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import PrintButton from '../../components/PrintButton'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHero from '../../components/PageHero'

type Expense = {
  id: number
  category: string
  amount: number
  expense_date: string
  description?: string
  vendor?: string
  payment_method?: string
  invoice_number?: string
  approval_status?: string
}

type AcademicYear = {
  id: number
  name: string
}

type Term = {
  id: number
  name: string
  academic_year?: number
  academic_year_id?: number
}

type Budget = {
  id?: number
  name?: string
  academic_year: number
  term: number
  monthly_budget: number
  quarterly_budget: number
  annual_budget: number
  term_name?: string
  created_at?: string
  updated_at?: string
  categories?: Array<{
    category: string
    limit: number
  }>
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const parseDateInput = (value?: string) => {
  if (!value) return null
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getIsoWeekKey = (date: Date) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-${pad2(weekNumber)}`
}

const formatDateKey = (date: Date, granularity: 'monthly' | 'weekly' | 'daily') => {
  if (granularity === 'daily') {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
  }
  if (granularity === 'weekly') {
    return getIsoWeekKey(date)
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`
}

export default function FinanceExpensesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expenseQuery, setExpenseQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [approvalFilter, setApprovalFilter] = useState('all')
  const [vendorQuery, setVendorQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expensePage, setExpensePage] = useState(1)
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [budgetName, setBudgetName] = useState('')
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [quarterlyBudget, setQuarterlyBudget] = useState('')
  const [annualBudget, setAnnualBudget] = useState('')
  const [budgetTouched, setBudgetTouched] = useState(false)
  const [isSavingBudget, setIsSavingBudget] = useState(false)
  const [budgetNotice, setBudgetNotice] = useState<string | null>(null)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetModalMode, setBudgetModalMode] = useState<'create' | 'edit'>('create')
  const [budgetQuery, setBudgetQuery] = useState('')
  const [budgetDateFrom, setBudgetDateFrom] = useState('')
  const [budgetDateTo, setBudgetDateTo] = useState('')
  const [trendGranularity, setTrendGranularity] = useState<'monthly' | 'weekly' | 'daily'>(
    'monthly',
  )
  const [trendCategory, setTrendCategory] = useState('all')
  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  )

  const pageSize = 8
  const hasInvalidExpenseDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo)
  const hasInvalidBudgetDateRange = Boolean(
    budgetDateFrom && budgetDateTo && budgetDateFrom > budgetDateTo,
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
    const loadReferences = async () => {
      try {
        const [yearRes, termRes] = await Promise.all([
          apiClient.get<AcademicYear[] | { results: AcademicYear[]; count: number }>(
            '/academics/ref/academic-years/',
          ),
          apiClient.get<Term[] | { results: Term[]; count: number }>('/academics/ref/terms/'),
        ])
        if (isMounted) {
          const yearItems = normalizePaginatedResponse(yearRes.data).items
          const termItems = normalizePaginatedResponse(termRes.data).items
          setAcademicYears(yearItems)
          setTerms(termItems)
          if (!selectedAcademicYear && yearItems.length > 0) {
            setSelectedAcademicYear(String(yearItems[0].id))
          }
          if (!selectedTerm && termItems.length > 0) {
            setSelectedTerm(String(termItems[0].id))
          }
        }
      } catch {
        if (isMounted) {
          setAcademicYears([])
          setTerms([])
          setSelectedAcademicYear('')
          setSelectedTerm('')
          setBudgetNotice('Academic references unavailable. Budget planner is disabled until references load.')
        }
      }
    }
    loadReferences()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedAcademicYear || !selectedTerm) return
    let isMounted = true
    const loadBudgets = async () => {
      setBudgetNotice(null)
      try {
        const response = await apiClient.get<Budget[] | { results: Budget[]; count: number }>(
          '/finance/budgets/',
          {
            params: { academic_year: selectedAcademicYear, term: selectedTerm },
          },
        )
        const items = normalizePaginatedResponse(response.data).items
        if (isMounted) {
          setBudgets(items)
          if (items.length === 0) {
            setBudgetNotice('No saved budget for this academic year yet.')
          }
        }
      } catch (err) {
        if (!isMounted) return
        const status = (err as { response?: { status?: number } })?.response?.status
        setBudgets([])
        if (status === 403) {
          setBudgetNotice('Budget API access denied.')
        } else if (status === 404) {
          setBudgetNotice('Budget API endpoint not found.')
        } else {
          setBudgetNotice(extractApiErrorMessage(err, 'Budget API unavailable.'))
        }
      }
    }
    loadBudgets()
    return () => {
      isMounted = false
    }
  }, [selectedAcademicYear, selectedTerm])

  useEffect(() => {
    if (budgetTouched) return
    const budget = budgets.find((item) => String(item.term) === String(selectedTerm)) ?? budgets[0]
    if (!budget) {
      setMonthlyBudget('')
      setQuarterlyBudget('')
      setAnnualBudget('')
      return
    }
    setMonthlyBudget(budget.monthly_budget ? String(budget.monthly_budget) : '')
    setQuarterlyBudget(budget.quarterly_budget ? String(budget.quarterly_budget) : '')
    setAnnualBudget(budget.annual_budget ? String(budget.annual_budget) : '')
  }, [budgets, budgetTouched, selectedTerm])

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      if (hasInvalidExpenseDateRange) {
        if (isMounted) {
          setError('Invalid expense date range: From date cannot be after To date.')
          setIsLoading(false)
        }
        return
      }
      try {
        if (isMounted) setError(null)
        const response = await apiClient.get<Expense[] | { results: Expense[]; count: number }>(
          '/finance/expenses/',
          {
            params: {
              page: expensePage,
              search: expenseQuery.trim() || undefined,
              category: categoryFilter !== 'all' ? categoryFilter : undefined,
              approval_status: approvalFilter !== 'all' ? approvalFilter : undefined,
              vendor: vendorQuery.trim() || undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            },
          },
        )
        if (isMounted) {
          const normalized = normalizePaginatedResponse(response.data)
          setExpenses(normalized.items)
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
            setError('Finance endpoints not found (404). Verify tenant routing.')
          } else {
            setError(extractApiErrorMessage(err, 'Unable to load expenses. Please try again.'))
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
  }, [
    expensePage,
    expenseQuery,
    categoryFilter,
    approvalFilter,
    vendorQuery,
    dateFrom,
    dateTo,
    hasInvalidExpenseDateRange,
  ])

  const filteredExpenses = useMemo(() => {
    if (isServerPaginated) return expenses
    const term = expenseQuery.trim().toLowerCase()
    return expenses.filter((expense) => {
      if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false
      if (approvalFilter !== 'all' && expense.approval_status !== approvalFilter) return false
      if (vendorQuery.trim()) {
        const vendor = expense.vendor?.toLowerCase() ?? ''
        if (!vendor.includes(vendorQuery.trim().toLowerCase())) return false
      }
      if (dateFrom && expense.expense_date && expense.expense_date < dateFrom) return false
      if (dateTo && expense.expense_date && expense.expense_date > dateTo) return false
      if (!term) return true
      return (
        expense.category.toLowerCase().includes(term) ||
        (expense.description ?? '').toLowerCase().includes(term)
      )
    })
  }, [expenseQuery, expenses, categoryFilter, approvalFilter, vendorQuery, dateFrom, dateTo])


  const totalSpend = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses],
  )

  const monthlySpendData = useMemo(() => {
    const grouped = new Map<string, number>()
    expenses.forEach((expense) => {
      if (!expense.expense_date) return
      const date = parseDateInput(expense.expense_date)
      if (!date) return
      const key = formatDateKey(date, 'monthly')
      grouped.set(key, (grouped.get(key) ?? 0) + Number(expense.amount || 0))
    })
    return grouped
  }, [expenses])

  const currentMonthKey = formatDateKey(new Date(), 'monthly')
  const spendThisMonth = monthlySpendData.get(currentMonthKey) ?? 0
  const monthlyBudgetValue = Number(monthlyBudget) || 0
  const quarterlyBudgetValue = Number(quarterlyBudget) || 0
  const annualBudgetValue = Number(annualBudget) || 0
  const budgetValidationError = useMemo(() => {
    if (!selectedAcademicYear || !selectedTerm) {
      return 'Select academic year and term before saving budget.'
    }
    if (!monthlyBudget.trim() || !quarterlyBudget.trim() || !annualBudget.trim()) {
      return 'Monthly, quarterly, and annual budget values are required.'
    }
    const monthly = Number(monthlyBudget)
    const quarterly = Number(quarterlyBudget)
    const annual = Number(annualBudget)
    if ([monthly, quarterly, annual].some((value) => Number.isNaN(value))) {
      return 'Budget values must be valid numbers.'
    }
    if ([monthly, quarterly, annual].some((value) => value < 0)) {
      return 'Budget values cannot be negative.'
    }
    if (monthly > quarterly) {
      return 'Monthly budget cannot exceed quarterly budget.'
    }
    if (quarterly > annual) {
      return 'Quarterly budget cannot exceed annual budget.'
    }
    return null
  }, [annualBudget, monthlyBudget, quarterlyBudget, selectedAcademicYear, selectedTerm])
  const remainingMonthly = monthlyBudgetValue - spendThisMonth
  const utilization =
    monthlyBudgetValue > 0 ? Math.min(100, (spendThisMonth / monthlyBudgetValue) * 100) : 0
  const selectedBudget = useMemo(
    () => budgets.find((budget) => String(budget.term) === String(selectedTerm)),
    [budgets, selectedTerm],
  )
  const filteredBudgets = useMemo(() => {
    if (hasInvalidBudgetDateRange) return []
    const query = budgetQuery.trim().toLowerCase()
    return budgets.filter((budget) => {
      const termLabel =
        budget.term_name ??
        terms.find((term) => term.id === budget.term)?.name ??
        String(budget.term)
      const matchesQuery =
        query.length === 0 ||
        termLabel.toLowerCase().includes(query) ||
        String(budget.monthly_budget).includes(query) ||
        String(budget.quarterly_budget).includes(query) ||
        String(budget.annual_budget).includes(query)

      const stamp = (budget.updated_at ?? budget.created_at ?? '').slice(0, 10)
      const matchesFrom = !budgetDateFrom || (stamp && stamp >= budgetDateFrom)
      const matchesTo = !budgetDateTo || (stamp && stamp <= budgetDateTo)
      return matchesQuery && matchesFrom && matchesTo
    })
  }, [budgets, budgetDateFrom, budgetDateTo, budgetQuery, terms, hasInvalidBudgetDateRange])

  const trendExpenses = useMemo(() => {
    if (trendCategory === 'all') return expenses
    return expenses.filter((expense) => expense.category === trendCategory)
  }, [expenses, trendCategory])

  const expenseCategories = useMemo(() => {
    const set = new Set<string>()
    expenses.forEach((expense) => {
      if (expense.category) {
        set.add(expense.category)
      }
    })
    return Array.from(set).sort()
  }, [expenses])

  const trendSeries = useMemo(() => {
    const grouped = new Map<string, number>()
    trendExpenses.forEach((expense) => {
      if (!expense.expense_date) return
      const date = parseDateInput(expense.expense_date)
      if (!date) return
      const key = formatDateKey(date, trendGranularity)
      grouped.set(key, (grouped.get(key) ?? 0) + Number(expense.amount || 0))
    })
    const entries = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))
    const limit = trendGranularity === 'daily' ? 14 : trendGranularity === 'weekly' ? 12 : 6
    const tail = entries.slice(-limit)
    return tail.map(([key, value]) => ({
      period: key,
      spend: value,
      budget: trendGranularity === 'monthly' ? monthlyBudgetValue || null : null,
    }))
  }, [trendExpenses, trendGranularity, monthlyBudgetValue])

  const pagedExpenses = useMemo(() => {
    if (isServerPaginated) return filteredExpenses
    const start = (expensePage - 1) * pageSize
    return filteredExpenses.slice(start, start + pageSize)
  }, [filteredExpenses, expensePage, isServerPaginated])

  const totalExpensePages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : filteredExpenses.length) / pageSize),
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await apiClient.delete(`/finance/expenses/${deleteTarget.id}/`)
      setExpenses((prev) => prev.filter((expense) => expense.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(extractApiErrorMessage(err, 'Unable to delete expense.'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveBudget = async () => {
    if (budgetValidationError) {
      setBudgetNotice(budgetValidationError)
      return
    }
    setIsSavingBudget(true)
    setBudgetNotice(null)
    const payload = {
      name: budgetName.trim() || 'General Budget',
      academic_year: Number(selectedAcademicYear),
      term: Number(selectedTerm),
      monthly_budget: Number(monthlyBudget) || 0,
      quarterly_budget: Number(quarterlyBudget) || 0,
      annual_budget: Number(annualBudget) || 0,
    }
    try {
      let savedMessage = 'Budget saved.'
      if (budgetModalMode === 'edit' && selectedBudget?.id) {
        await apiClient.put(`/finance/budgets/${selectedBudget.id}/`, payload)
        savedMessage = 'Budget updated successfully.'
      } else {
        await apiClient.post('/finance/budgets/', payload)
        savedMessage = 'Budget created successfully.'
      }
      await (async () => {
        const response = await apiClient.get<Budget[] | { results: Budget[]; count: number }>(
          '/finance/budgets/',
          { params: { academic_year: selectedAcademicYear } },
        )
        setBudgets(normalizePaginatedResponse(response.data).items)
      })()
      setBudgetNotice(savedMessage)
    } catch (err) {
      setBudgetNotice(extractApiErrorMessage(err, 'Budget API unavailable. Save failed.'))
    } finally {
      setIsSavingBudget(false)
    }
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    downloadBlob(blob, filename)
  }

  const handleExportCsv = () => {
    const rows = filteredExpenses.map((expense) => [
      expense.id,
      expense.category,
      expense.amount,
      expense.expense_date,
      expense.vendor ?? '',
      expense.payment_method ?? '',
      expense.invoice_number ?? '',
      expense.approval_status ?? '',
      expense.description ?? '',
    ])
    const header = [
      'id',
      'category',
      'amount',
      'expense_date',
      'vendor',
      'payment_method',
      'invoice_number',
      'approval_status',
      'description',
    ]
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadFile(csv, 'expenses-report.csv', 'text/csv')
  }

  const handleExportSummary = () => {
    const totalsByCategory = filteredExpenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.category] = (acc[expense.category] ?? 0) + Number(expense.amount || 0)
      return acc
    }, {})
    const payload = {
      generated_at: new Date().toISOString(),
      academic_year: selectedAcademicYear || null,
      term: selectedTerm || null,
      total_expenses: filteredExpenses.length,
      total_amount: filteredExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0,
      ),
      totals_by_category: totalsByCategory,
    }
    downloadFile(JSON.stringify(payload, null, 2), 'expenses-summary.json', 'application/json')
  }

  const handleExportBudgetCsv = () => {
    const rows = filteredBudgets.map((budget) => [
      budget.id ?? '',
      budget.term_name ?? terms.find((term) => term.id === budget.term)?.name ?? budget.term,
      budget.monthly_budget,
      budget.quarterly_budget,
      budget.annual_budget,
      budget.created_at ?? '',
      budget.updated_at ?? '',
    ])
    const header = [
      'id',
      'term',
      'monthly_budget',
      'quarterly_budget',
      'annual_budget',
      'created_at',
      'updated_at',
    ]
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadFile(csv, 'budget-list.csv', 'text/csv')
  }

  const handleExportBudgetSummary = () => {
    const payload = {
      generated_at: new Date().toISOString(),
      academic_year: selectedAcademicYear || null,
      term: selectedTerm || null,
      records: filteredBudgets.length,
      total_monthly: filteredBudgets.reduce((sum, item) => sum + Number(item.monthly_budget || 0), 0),
      total_quarterly: filteredBudgets.reduce(
        (sum, item) => sum + Number(item.quarterly_budget || 0),
        0,
      ),
      total_annual: filteredBudgets.reduce((sum, item) => sum + Number(item.annual_budget || 0), 0),
    }
    downloadFile(JSON.stringify(payload, null, 2), 'budget-summary.json', 'application/json')
  }

  const openBudgetPlanner = () => {
    setMonthlyBudget('')
    setQuarterlyBudget('')
    setAnnualBudget('')
    setBudgetTouched(true)
    document.getElementById('budget-planner')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title="Expenses"
        subtitle="Track operational spend and categories."
        icon="💰"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading expenses...</p>
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

      <section className="col-span-12 grid gap-6 lg:grid-cols-12">
        <div id="budget-planner" className="rounded-2xl glass-panel p-5 lg:col-span-3">
          <p className="text-xs uppercase text-slate-400">Total spend</p>
          <p className="mt-2 text-2xl font-semibold">{totalSpend.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-400">Based on loaded expenses.</p>
        </div>
        <div className="rounded-2xl glass-panel p-5 lg:col-span-3">
          <p className="text-xs uppercase text-slate-400">This month</p>
          <p className="mt-2 text-2xl font-semibold">{spendThisMonth.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-400">Month: {currentMonthKey}</p>
        </div>
        <div className="rounded-2xl glass-panel p-5 lg:col-span-3">
          <p className="text-xs uppercase text-slate-400">Remaining budget</p>
          <p className="mt-2 text-2xl font-semibold">
            {monthlyBudgetValue ? remainingMonthly.toLocaleString() : '--'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {monthlyBudgetValue ? `${utilization.toFixed(0)}% used` : 'Set monthly budget'}
          </p>
        </div>
        <div className="rounded-2xl glass-panel p-5 lg:col-span-3">
          <p className="text-xs uppercase text-slate-400">Budget planning</p>
          <div className="mt-2">
            <p className="text-2xl font-semibold">
              {annualBudgetValue ? annualBudgetValue.toLocaleString() : '--'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {annualBudgetValue ? 'Annual budget set' : 'No budget set yet'}
            </p>
            {monthlyBudgetValue > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Monthly: {monthlyBudgetValue.toLocaleString()} | Quarterly: {quarterlyBudgetValue.toLocaleString()}
              </p>
            )}
          </div>
          <div className="mt-3 grid gap-2">
            <button
              onClick={() => {
                setBudgetModalMode('create')
                setBudgetName('')
                setMonthlyBudget('')
                setQuarterlyBudget('')
                setAnnualBudget('')
                setBudgetTouched(false)
                setBudgetNotice(null)
                setShowBudgetModal(true)
              }}
              className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-400 transition"
            >
              + Create Budget
            </button>
            {selectedBudget && (
              <button
                onClick={() => {
                  setBudgetModalMode('edit')
                  setBudgetName(selectedBudget.name ?? '')
                  setMonthlyBudget(String(selectedBudget.monthly_budget ?? ''))
                  setQuarterlyBudget(String(selectedBudget.quarterly_budget ?? ''))
                  setAnnualBudget(String(selectedBudget.annual_budget ?? ''))
                  setBudgetTouched(false)
                  setBudgetNotice(null)
                  setShowBudgetModal(true)
                }}
                className="w-full rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:text-white hover:border-slate-400 transition"
              >
                Edit Budget
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-semibold">Spending trends</h2>
            <p className="mt-1 text-sm text-slate-400">
              Daily, weekly, or monthly breakdowns by category.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <select
              className="rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs text-white"
              value={trendGranularity}
              onChange={(event) =>
                setTrendGranularity(event.target.value as 'monthly' | 'weekly' | 'daily')
              }
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
            <select
              className="rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs text-white"
              value={trendCategory}
              onChange={(event) => setTrendCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {expenseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <span>
              Monthly budget: {monthlyBudgetValue ? monthlyBudgetValue.toLocaleString() : 'Not set'}
            </span>
          </div>
        </div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="period" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                formatter={(value: number) => Number(value).toLocaleString()}
                contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }}
              />
              <Legend />
              <Bar dataKey="spend" name="Spend" fill="#ef4444" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="budget" name="Budget" stroke="#22c55e" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Expense list</h2>
            <p className="mt-1 text-sm text-slate-400">From `/api/finance/expenses/`</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PrintButton />
            <input
              className="w-full max-w-xs rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search category or description"
              value={expenseQuery}
              onChange={(event) => {
                setExpenseQuery(event.target.value)
                setExpensePage(1)
              }}
            />
            <select
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white sm:w-auto"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value)
                setExpensePage(1)
              }}
            >
              <option value="all">All categories</option>
              {expenseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white sm:w-auto"
              value={approvalFilter}
              onChange={(event) => {
                setApprovalFilter(event.target.value)
                setExpensePage(1)
              }}
            >
              <option value="all">All status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <input
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 sm:max-w-[160px]"
              placeholder="Vendor"
              value={vendorQuery}
              onChange={(event) => {
                setVendorQuery(event.target.value)
                setExpensePage(1)
              }}
            />
            <input
              type="date"
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 sm:max-w-[150px]"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value)
                setExpensePage(1)
              }}
            />
            <input
              type="date"
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 sm:max-w-[150px]"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value)
                setExpensePage(1)
              }}
            />
            <button
              className="w-full rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 sm:w-auto"
              onClick={handleExportCsv}
            >
              Export CSV
            </button>
            <button
              className="w-full rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 sm:w-auto"
              onClick={handleExportSummary}
            >
              Export summary
            </button>
            <button
              className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 sm:w-auto"
              onClick={() => navigate('/modules/finance/expenses/new')}
            >
              Create expense
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">On small screens, scroll the table horizontally.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Receipt #</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pagedExpenses.map((expense) => (
                <tr key={expense.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">{expense.category}</td>
                  <td className="px-4 py-3">{Number(expense.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{expense.expense_date}</td>
                  <td className="px-4 py-3">{expense.vendor ?? '--'}</td>
                  <td className="px-4 py-3">{expense.payment_method ?? '--'}</td>
                  <td className="px-4 py-3">{expense.invoice_number ?? '--'}</td>
                  <td className="px-4 py-3">{expense.approval_status ?? '--'}</td>
                  <td className="px-4 py-3">{expense.description ?? '--'}</td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200"
                      onClick={() => navigate(`/modules/finance/expenses/${expense.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button
                      className="ml-2 rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200"
                      onClick={() => setDeleteTarget(expense)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {pagedExpenses.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={9}>
                    No expenses found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {expensePage} of {totalExpensePages}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={expensePage === 1}
              onClick={() => setExpensePage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={expensePage === totalExpensePages}
              onClick={() => setExpensePage((prev) => Math.min(totalExpensePages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Budget list</h2>
            <p className="mt-1 text-sm text-slate-400">
              Saved budget records for the selected academic year.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="w-full max-w-xs rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search term or amount"
              value={budgetQuery}
              onChange={(event) => setBudgetQuery(event.target.value)}
            />
            <input
              type="date"
              className="w-full max-w-[150px] rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={budgetDateFrom}
              onChange={(event) => setBudgetDateFrom(event.target.value)}
            />
            <input
              type="date"
              className="w-full max-w-[150px] rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={budgetDateTo}
              onChange={(event) => setBudgetDateTo(event.target.value)}
            />
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              onClick={handleExportBudgetCsv}
            >
              Export CSV
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              onClick={handleExportBudgetSummary}
            >
              Export summary
            </button>
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={openBudgetPlanner}
            >
              Create budget
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          {hasInvalidBudgetDateRange ? (
            <p className="px-4 py-3 text-xs text-amber-300">
              Invalid budget date range: From date cannot be after To date.
            </p>
          ) : null}
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Monthly</th>
                <th className="px-4 py-3">Quarterly</th>
                <th className="px-4 py-3">Annual</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredBudgets.map((budget) => (
                <tr key={`${budget.id ?? 'local'}-${budget.term}`} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-medium">{budget.name || 'General Budget'}</td>
                  <td className="px-4 py-3">
                    {budget.term_name ?? terms.find((term) => term.id === budget.term)?.name ?? budget.term}
                  </td>
                  <td className="px-4 py-3">{Number(budget.monthly_budget || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">{Number(budget.quarterly_budget || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">{Number(budget.annual_budget || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">{budget.created_at ? budget.created_at.replace('T', ' ').slice(0, 16) : '--'}</td>
                  <td className="px-4 py-3">{budget.updated_at ? budget.updated_at.replace('T', ' ').slice(0, 16) : '--'}</td>
                </tr>
              ))}
              {filteredBudgets.length === 0 ? (
                <tr className="bg-slate-950/60">
                  <td className="px-4 py-3 text-slate-400" colSpan={7}>
                    No budget records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#0d1421] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">
                {budgetModalMode === 'edit' ? 'Edit Budget' : 'Create Budget'}
              </h2>
              <button onClick={() => { setShowBudgetModal(false); setBudgetNotice(null) }} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="grid gap-4">
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Budget Name</span>
                <input
                  type="text"
                  placeholder="e.g. Operations Budget Q1"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Academic Year</span>
                <select
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white"
                  value={selectedAcademicYear}
                  disabled={academicYears.length === 0}
                  onChange={(e) => { setSelectedAcademicYear(e.target.value); setBudgetTouched(false) }}
                >
                  {academicYears.length === 0 ? <option value="">No academic years available</option> : null}
                  {academicYears.map(y => <option key={y.id} value={String(y.id)}>{y.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Term</span>
                <select
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white"
                  value={selectedTerm}
                  disabled={terms.length === 0}
                  onChange={(e) => { setSelectedTerm(e.target.value); setBudgetTouched(false) }}
                >
                  {terms.length === 0 ? <option value="">No terms available</option> : null}
                  {terms
                    .filter(t => selectedAcademicYear ? Number(selectedAcademicYear) === Number(t.academic_year_id ?? t.academic_year) : true)
                    .map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Monthly Budget Amount</span>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 50000"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none"
                  value={monthlyBudget}
                  onChange={(e) => { setMonthlyBudget(e.target.value); setBudgetTouched(true) }}
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Quarterly Budget Amount</span>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 150000"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none"
                  value={quarterlyBudget}
                  onChange={(e) => { setQuarterlyBudget(e.target.value); setBudgetTouched(true) }}
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Annual Budget Amount</span>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 600000"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none"
                  value={annualBudget}
                  onChange={(e) => { setAnnualBudget(e.target.value); setBudgetTouched(true) }}
                />
              </label>
              {budgetValidationError && (
                <p className="text-sm text-amber-300">{budgetValidationError}</p>
              )}
              {budgetNotice && (
                <p className="text-sm text-emerald-300">{budgetNotice}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-60 transition"
                  onClick={async () => { await handleSaveBudget(); if (!budgetValidationError) setTimeout(() => setShowBudgetModal(false), 900) }}
                  disabled={isSavingBudget || Boolean(budgetValidationError)}
                >
                  {isSavingBudget ? 'Saving…' : 'Save Budget'}
                </button>
                <button
                  onClick={() => { setShowBudgetModal(false); setBudgetNotice(null) }}
                  className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete expense"
        description={
          <>
            This will permanently remove <strong>{deleteTarget?.category}</strong>. Continue?
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
