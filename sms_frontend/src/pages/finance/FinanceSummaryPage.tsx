import { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, Cell, CartesianGrid, Legend,
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, ReceiptText,
  CreditCard, AlertCircle, RefreshCw, BarChart2, DollarSign,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import PageHero from '../../components/PageHero'

type FinanceSummary = {
  revenue_billed: number
  cash_collected: number
  total_expenses: number
  net_profit: number
  outstanding_receivables: number
  active_students_count?: number
}
type Invoice = { id: number; total_amount: number; due_date: string; created_at?: string; balance_due?: number }
type Payment = { id: number; amount: number; payment_date: string; payment_method?: string }
type Expense = { id: number; amount: number; expense_date: string }

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const ksh = (n: number) => 'Ksh ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })
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

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

const startOfCalendarDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const differenceInCalendarDaysLocal = (left: Date, right: Date) =>
  Math.round((startOfCalendarDay(left).getTime() - startOfCalendarDay(right).getTime()) / 86_400_000)

const extractApiError = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail.trim()) return detail
    const first = Object.values(data as Record<string, unknown>).find((v) =>
      Array.isArray(v) ? v.length > 0 : typeof v === 'string' && (v as string).trim().length > 0)
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
    if (typeof first === 'string') return first
  }
  return fallback
}

const safeMonthKey = (value?: string) => {
  const date = parseDateInput(value)
  return date ? formatMonthYear(date) : null
}

const safeDate = (value?: string) => parseDateInput(value)

const ChartTooltipStyle = { background: '#0b1120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0' }

export default function FinanceSummaryPage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async (isInitial = false) => {
    if (isInitial) setIsLoading(true)
    else setIsRefreshing(true)
    setError(null)
    try {
      const [summaryRes, invoicesRes, paymentsRes, expensesRes] = await Promise.all([
        apiClient.get<FinanceSummary>('/finance/summary/'),
        apiClient.get<Invoice[] | { results: Invoice[]; count: number }>('/finance/invoices/'),
        apiClient.get<Payment[] | { results: Payment[]; count: number }>('/finance/payments/'),
        apiClient.get<Expense[] | { results: Expense[]; count: number }>('/finance/expenses/'),
      ])
      setSummary(summaryRes.data)
      setInvoices(normalizePaginatedResponse(invoicesRes.data).items)
      setPayments(normalizePaginatedResponse(paymentsRes.data).items)
      setExpenses(normalizePaginatedResponse(expensesRes.data).items)
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) setError('Session expired. Please log in again.')
      else if (status === 403) setError('Access denied. Ensure this user has the FINANCE module and proper role.')
      else if (status === 404) setError('Finance endpoints not found. Verify tenant routing.')
      else setError(extractApiError(err, 'Unable to load finance data. Please try again.'))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => { void loadData(true) }, [])

  /* ── Charts data ── */
  const operatingCashflow = useMemo(() => {
    const bucket = new Map<string, { inflow: number; outflow: number }>()
    for (const p of payments) {
      const k = safeMonthKey(p.payment_date); if (!k) continue
      const cur = bucket.get(k) ?? { inflow: 0, outflow: 0 }
      cur.inflow += Number(p.amount); bucket.set(k, cur)
    }
    for (const e of expenses) {
      const k = safeMonthKey(e.expense_date); if (!k) continue
      const cur = bucket.get(k) ?? { inflow: 0, outflow: 0 }
      cur.outflow += Number(e.amount); bucket.set(k, cur)
    }
    return Array.from(bucket.entries()).map(([month, v]) => ({ month, inflow: v.inflow, outflow: v.outflow, net: v.inflow - v.outflow }))
  }, [expenses, payments])

  const debtorsAging = useMemo(() => {
    const buckets = [{ label: '0-30', value: 0 }, { label: '31-60', value: 0 }, { label: '61-90', value: 0 }, { label: '90+', value: 0 }]
    const today = new Date()
    invoices.forEach(inv => {
      const due = safeDate(inv.due_date); if (!due) return
      const balance = Number(inv.balance_due ?? inv.total_amount ?? 0); if (balance <= 0) return
      const days = differenceInCalendarDaysLocal(today, due)
      if (days <= 30) buckets[0].value += balance
      else if (days <= 60) buckets[1].value += balance
      else if (days <= 90) buckets[2].value += balance
      else buckets[3].value += balance
    })
    return buckets
  }, [invoices])

  const paymentsByMethod = useMemo(() => {
    const bucket = new Map<string, number>()
    payments.forEach(p => { const m = p.payment_method?.trim() || 'Unknown'; bucket.set(m, (bucket.get(m) ?? 0) + Number(p.amount)) })
    return Array.from(bucket.entries()).map(([method, total]) => ({ method, total }))
  }, [payments])

  const METHOD_COLORS: Record<string, string> = {
    'M-Pesa': '#10b981', 'Cash': '#f59e0b', 'Bank Transfer': '#0ea5e9', 'Cheque': '#a855f7', 'Unknown': '#64748b',
  }

  const netProfit = Number(summary?.net_profit ?? 0)
  const collectionRate = summary
    ? Math.round((Number(summary.cash_collected) / Math.max(Number(summary.revenue_billed), 1)) * 100)
    : 0

  const KPI_CARDS = [
    {
      label: 'Revenue Billed', value: ksh(Number(summary?.revenue_billed ?? 0)),
      icon: ReceiptText, color: '#10b981', from: '#064e3b', to: '#0f2a1d',
      sub: `${summary?.active_students_count ?? 0} students invoiced`,
    },
    {
      label: 'Cash Collected', value: ksh(Number(summary?.cash_collected ?? 0)),
      icon: Wallet, color: '#0ea5e9', from: '#0c3047', to: '#071929',
      sub: `${collectionRate}% collection rate`,
    },
    {
      label: 'Total Expenses', value: ksh(Number(summary?.total_expenses ?? 0)),
      icon: TrendingDown, color: '#f97316', from: '#431407', to: '#1c0a04',
      sub: 'Jan – Mar 2025',
    },
    {
      label: 'Outstanding', value: ksh(Number(summary?.outstanding_receivables ?? 0)),
      icon: AlertCircle, color: '#f59e0b', from: '#451a03', to: '#1f0d02',
      sub: 'Pending collections',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        badge="FINANCE"
        badgeColor="emerald"
        title="Finance Summary"
        subtitle="IPSAS-compliant overview of school finances"
        icon="💰"
      />

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #071c11 0%, #0b1f34 50%, #150a2e 100%)' }}>
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.4) 0%, transparent 55%), radial-gradient(ellipse at 80% 30%, rgba(99,102,241,0.35) 0%, transparent 50%), radial-gradient(ellipse at 55% 90%, rgba(245,158,11,0.25) 0%, transparent 45%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(16,185,129,0.18)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                IPSAS-COMPLIANT FINANCE
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Term 1 2025 Active
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Finance &amp; Accounts<br />
              <span style={{ background: 'linear-gradient(90deg, #10b981, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Summary Overview
              </span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              Real-time financial health: revenues, expenses, cashflow, and IPSAS-compliant reporting for Term 1 2025.
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <button onClick={() => void loadData(false)}
              disabled={isLoading || isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 disabled:opacity-60"
              style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Refreshing…' : 'Refresh Data'}
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: 'Net Profit', value: ksh(netProfit), positive: netProfit >= 0 },
                { label: 'Collection Rate', value: `${collectionRate}%`, positive: collectionRate >= 70 },
              ].map(chip => (
                <div key={chip.label} className="rounded-xl px-3 py-2 text-center"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-sm font-bold" style={{ color: chip.positive ? '#34d399' : '#fca5a5' }}>{chip.value}</p>
                  <p className="text-[10px] text-slate-400">{chip.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Error / Loading ── */}
      {error && (
        <div className="rounded-2xl border border-rose-500/40 p-5 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.07)' }}>
          <AlertCircle size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}
      {isLoading && (
        <div className="rounded-2xl p-6 flex items-center gap-3" style={GLASS}>
          <RefreshCw size={18} className="text-emerald-400 animate-spin" />
          <p className="text-sm text-slate-300">Loading finance data…</p>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map(k => (
          <div key={k.label}
            className="rounded-2xl p-5 relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, ${k.from}, ${k.to})`, border: `1px solid ${k.color}28` }}>
            <div className="absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${k.color}22` }}>
              <k.icon size={18} style={{ color: k.color }} />
            </div>
            {/* Glow blob */}
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-20"
              style={{ background: k.color, filter: 'blur(20px)' }} />
            <p className="text-xs uppercase tracking-widest text-slate-400 mb-2 relative z-10">{k.label}</p>
            <p className="text-xl font-bold text-white leading-tight relative z-10">{k.value}</p>
            <p className="text-[11px] mt-1 font-medium relative z-10" style={{ color: k.color }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Net Position Banner ── */}
      <div className="rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4"
        style={netProfit >= 0
          ? { background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }
          : { background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div className="flex items-center gap-3">
          {netProfit >= 0
            ? <TrendingUp size={22} className="text-emerald-400" />
            : <TrendingDown size={22} className="text-rose-400" />}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Net Financial Position</p>
            <p className="text-2xl font-display font-bold" style={{ color: netProfit >= 0 ? '#34d399' : '#fca5a5' }}>
              {ksh(netProfit)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {[
            { label: 'Total Payments', value: payments.length, icon: CreditCard, color: '#0ea5e9' },
            { label: 'Expenses Logged', value: expenses.length, icon: BarChart2, color: '#f97316' },
            { label: 'Invoices Raised', value: invoices.length, icon: DollarSign, color: '#10b981' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <s.icon size={14} style={{ color: s.color }} className="mx-auto mb-0.5" />
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts Row 1: Cashflow + Debtors ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <div className="lg:col-span-4 rounded-2xl p-6 overflow-hidden" style={GLASS}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-emerald-400" />
            <h2 className="text-base font-display font-bold text-white">Operating Cashflow</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Payments collected vs. operating spend — net movement</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={operatingCashflow} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" stroke="#475569" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis stroke="#475569" tickLine={false} axisLine={false} tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={ChartTooltipStyle}
                  formatter={(v: number) => ksh(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="inflow" name="Inflow" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="outflow" name="Outflow" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="net" name="Net" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lg:col-span-3 rounded-2xl p-6 overflow-hidden" style={GLASS}>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={14} className="text-amber-400" />
            <h2 className="text-base font-display font-bold text-white">Debtors Ageing</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Outstanding balances by days past due</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtorsAging} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" stroke="#475569" tick={{ fontSize: 10 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={ChartTooltipStyle} formatter={(v: number) => ksh(v)} />
                <Bar dataKey="value" name="Balance" radius={[6, 6, 0, 0]}>
                  {debtorsAging.map(e => (
                    <Cell key={e.label} fill={e.label === '0-30' ? '#22c55e' : e.label === '31-60' ? '#f59e0b' : e.label === '61-90' ? '#f97316' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Charts Row 2: By Method + Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <div className="lg:col-span-4 rounded-2xl p-6 overflow-hidden" style={GLASS}>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={14} className="text-violet-400" />
            <h2 className="text-base font-display font-bold text-white">Collections by Payment Method</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Revenue mix: M-Pesa, Cash, Bank Transfer, Cheque</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentsByMethod} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="method" stroke="#475569" tick={{ fontSize: 10 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={ChartTooltipStyle} formatter={(v: number) => ksh(v)} />
                <Bar dataKey="total" name="Collected" radius={[6, 6, 0, 0]}>
                  {paymentsByMethod.map(e => (
                    <Cell key={e.method} fill={METHOD_COLORS[e.method] ?? '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lg:col-span-3 rounded-2xl p-6 overflow-hidden" style={GLASS}>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={14} className="text-blue-400" />
            <h2 className="text-base font-display font-bold text-white">Monthly Trend</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Collections vs. expenses month-over-month</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={operatingCashflow} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" stroke="#475569" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis stroke="#475569" tickLine={false} axisLine={false} tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={ChartTooltipStyle} formatter={(v: number) => ksh(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="inflow" name="Collections" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="outflow" name="Expenses" stroke="#f97316" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
