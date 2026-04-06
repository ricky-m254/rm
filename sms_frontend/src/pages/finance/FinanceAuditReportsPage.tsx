import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

// ─── Types ────────────────────────────────────────────────────────────────────
type AcademicYear = { id: number; name: string; start_date: string; end_date: string }
type InvoiceRow = { invoice_number: string; student_name?: string; total_amount: number; status: string; issue_date: string; due_date: string }
type PaymentRow = { receipt_number: string; student_name?: string; amount: number; payment_date: string; payment_method: string }
type ExpenseRow = { description: string; category: string; amount: number; expense_date: string; vendor?: string; approval_status: string }
type BudgetRow = { name?: string; term_name?: string; monthly_budget: number; quarterly_budget: number; annual_budget: number }
type ArrearsRow = { invoice_number: string; student_name: string; balance_due: number; overdue_days: number; due_date: string; status: string }
type AssetRow = { name: string; category_name?: string; purchase_date: string; purchase_cost: number; current_value: number; useful_life_years?: number; depreciation_method?: string; is_active?: boolean }
type DepreciationRow = { asset_name?: string; depreciation_amount: number; accumulated_depreciation: number; period_label?: string }
type VoteHeadRow = { vote_head_name: string; total_allocated: number; transaction_count: number; percentage_of_total: number }
type ArrearsByTermRow = { term_id: number | null; term_name: string; total_outstanding: number; invoice_count: number; student_count: number }
type BankAccount = { label: string; bank: string; accountNo: string; balance: string }

// ─── Report Groups ────────────────────────────────────────────────────────────
const MANAGEMENT_REPORTS = [
  { key: 'mgmt_income', label: 'Income Statement (P&L)' },
  { key: 'mgmt_collection', label: 'Fee Collection Report' },
  { key: 'mgmt_expenses', label: 'Expense Summary' },
  { key: 'mgmt_budget', label: 'Budget vs Actual' },
  { key: 'mgmt_arrears', label: 'Arrears / Outstanding' },
  { key: 'mgmt_vote_heads', label: 'Vote Head Allocation' },
  { key: 'mgmt_class_balances', label: 'Class Fee Balances' },
]

const KENYA_AUDIT_REPORTS = [
  { key: 'ka_mgmt_responsibility', label: 'I. Statement of Management Responsibility' },
  { key: 'ka_receipts_payments', label: 'V. Statement of Receipts & Payments' },
  { key: 'ka_financial_assets', label: 'VI. Statement of Financial Assets & Liabilities' },
  { key: 'ka_cash_flow', label: 'VII. Statement of Cash Flows (IPSAS 2)' },
  { key: 'ka_budget_actual', label: 'VIII. Statement of Budgeted vs Actual (IPSAS 24)' },
  { key: 'ka_policies', label: 'IX. Significant Accounting Policies' },
  { key: 'ka_notes', label: 'X. Notes to Financial Statements' },
  { key: 'ka_ppe', label: 'XI. Property, Plant & Equipment (IPSAS 17)' },
]

const ALL_REPORTS = [...MANAGEMENT_REPORTS, ...KENYA_AUDIT_REPORTS]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtK = (n: number) =>
  'Ksh ' + Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtN = (n: number) =>
  Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function getTermFromDate(dateStr: string): 1 | 2 | 3 {
  const month = new Date(dateStr).getMonth() + 1
  if (month <= 4) return 1
  if (month <= 8) return 2
  return 3
}

function groupByTerm(items: { date: string; amount: number }[]): { t1: number; t2: number; t3: number; total: number } {
  const r = { t1: 0, t2: 0, t3: 0, total: 0 }
  for (const item of items) {
    const v = Number(item.amount || 0)
    const t = getTermFromDate(item.date)
    if (t === 1) r.t1 += v
    else if (t === 2) r.t2 += v
    else r.t3 += v
    r.total += v
  }
  return r
}

function inferExpenseAccount(category: string): 'tuition' | 'operations' | 'boarding' | 'infrastructure' | 'other' {
  const c = (category || '').toLowerCase()
  if (c.includes('infrastructure') || c.includes('construc') || c.includes('renovati') || c.includes('capital') || c.includes('cctv')) return 'infrastructure'
  if (c.includes('tuition') || c.includes('exam') || c.includes('book') || c.includes('lab') || c.includes('teaching') || c.includes('chalk') || c.includes('stationer')) return 'tuition'
  if (c.includes('boarding') || c.includes('hostel') || c.includes('cater') || c.includes('school fund') || c.includes('activity') || c.includes('uniform')) return 'boarding'
  return 'operations'
}

function lastY(doc: jsPDF, fallback: number): number {
  return (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? fallback
}

// ─── PDF Styling Helpers ───────────────────────────────────────────────────────
function darkHeader(doc: jsPDF, title: string, subtitle: string, pageW: number) {
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setTextColor(52, 211, 153)
  doc.setFontSize(8); doc.setFont('helvetica', 'bold')
  doc.text('RYNATY SCHOOL MANAGEMENT SYSTEM', 14, 10)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.text(title, 14, 20)
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
  doc.text(subtitle, 14, 27)
}

function auditHeader(doc: jsPDF, schoolName: string, subtitle: string, pageW: number) {
  doc.setFillColor(10, 36, 99)
  doc.rect(0, 0, pageW, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12); doc.setFont('helvetica', 'bold')
  doc.text(schoolName.toUpperCase(), pageW / 2, 11, { align: 'center' })
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
  doc.text(subtitle, pageW / 2, 19, { align: 'center' })
  doc.setFillColor(218, 165, 32)
  doc.rect(0, 25, pageW, 1, 'F')
}

function darkBar(doc: jsPDF, label: string, y: number, pageW: number): number {
  doc.setFillColor(15, 23, 42)
  doc.rect(14, y, pageW - 28, 7, 'F')
  doc.setTextColor(52, 211, 153)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
  doc.text(label.toUpperCase(), 17, y + 5)
  return y + 10
}

function lightBar(doc: jsPDF, label: string, y: number, pageW: number): number {
  doc.setFillColor(10, 36, 99)
  doc.rect(14, y, pageW - 28, 6, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
  doc.text(label, 17, y + 4.3)
  return y + 8
}

function checkPage(doc: jsPDF, y: number, needed: number, title: string, schoolName: string, periodLabel: string, pageW: number): number {
  if (y + needed > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage()
    auditHeader(doc, schoolName, title + ' (continued)  |  ' + periodLabel, pageW)
    return 33
  }
  return y
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FinanceAuditReportsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set(ALL_REPORTS.map((r) => r.key)))
  const [isGenerating, setIsGenerating] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)

  const [schoolName, setSchoolName] = useState('Demo School')
  const [schoolCounty, setSchoolCounty] = useState('')
  const [schoolRegNo, setSchoolRegNo] = useState('')
  const [principalName, setPrincipalName] = useState('')
  const [bomChair, setBomChair] = useState('')
  const [openingCash, setOpeningCash] = useState('0')
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    { label: 'Tuition Account', bank: 'KCB', accountNo: '', balance: '' },
    { label: 'Operations Account', bank: 'Equity', accountNo: '', balance: '' },
    { label: 'School Fund Account', bank: 'Co-operative', accountNo: '', balance: '' },
    { label: 'Infrastructure Account', bank: 'Equity', accountNo: '', balance: '' },
  ])

  useEffect(() => {
    apiClient.get<{ results?: AcademicYear[] } | AcademicYear[]>('/academics/years/').then((r) => {
      const items = Array.isArray(r.data) ? r.data : (r.data as { results?: AcademicYear[] }).results ?? []
      setAcademicYears(items)
      if (items.length) {
        const yr = items[0]
        setSelectedYear(String(yr.id))
        setDateFrom(yr.start_date?.slice(0, 10) ?? '')
        setDateTo(yr.end_date?.slice(0, 10) ?? '')
      }
    }).catch(() => {})
  }, [])

  function toggle(key: string) {
    setSelectedReports((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  function toggleGroup(keys: string[]) {
    const allOn = keys.every((k) => selectedReports.has(k))
    setSelectedReports((prev) => { const n = new Set(prev); keys.forEach((k) => allOn ? n.delete(k) : n.add(k)); return n })
  }

  function extract<T>(res: PromiseSettledResult<{ data: { results?: T[] } | T[] }>): T[] {
    if (res.status !== 'fulfilled') return []
    const d = res.value.data
    return Array.isArray(d) ? d : ((d as { results?: T[] }).results ?? [])
  }

  async function fetchData() {
    const p: Record<string, string> = {}
    if (selectedYear) p.academic_year = selectedYear
    if (dateFrom) p.date_from = dateFrom
    if (dateTo) p.date_to = dateTo

    const [invoices, payments, expenses, budgets, arrears, assets, depreciations, voteHeads, arrearsByTerm] = await Promise.allSettled([
      apiClient.get<{ results?: InvoiceRow[] } | InvoiceRow[]>('/finance/invoices/', { params: { ...p, page_size: 5000 } }),
      apiClient.get<{ results?: PaymentRow[] } | PaymentRow[]>('/finance/payments/', { params: { ...p, page_size: 5000 } }),
      apiClient.get<{ results?: ExpenseRow[] } | ExpenseRow[]>('/finance/expenses/', { params: { page_size: 5000, ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) } }),
      apiClient.get<{ results?: BudgetRow[] } | BudgetRow[]>('/finance/budgets/', { params: { academic_year: selectedYear } }),
      apiClient.get<{ results?: ArrearsRow[] } | ArrearsRow[]>('/finance/reports/arrears/', { params: { page_size: 5000 } }),
      apiClient.get<{ results?: AssetRow[] } | AssetRow[]>('/assets/', { params: { page_size: 5000 } }),
      apiClient.get<{ results?: DepreciationRow[] } | DepreciationRow[]>('/assets/depreciation/', { params: { page_size: 5000 } }),
      apiClient.get<{ rows?: VoteHeadRow[]; grand_total?: number }>('/finance/reports/vote-head-allocation/', { params: { date_from: dateFrom, date_to: dateTo } }),
      apiClient.get<{ rows?: ArrearsByTermRow[] }>('/finance/reports/arrears-by-term/'),
    ])

    const vhData = voteHeads.status === 'fulfilled' ? (voteHeads.value.data as { rows?: VoteHeadRow[] }).rows ?? [] : []
    const abtData = arrearsByTerm.status === 'fulfilled' ? (arrearsByTerm.value.data as { rows?: ArrearsByTermRow[] }).rows ?? [] : []

    return {
      invoices: extract<InvoiceRow>(invoices as PromiseSettledResult<{ data: { results?: InvoiceRow[] } | InvoiceRow[] }>),
      payments: extract<PaymentRow>(payments as PromiseSettledResult<{ data: { results?: PaymentRow[] } | PaymentRow[] }>),
      expenses: extract<ExpenseRow>(expenses as PromiseSettledResult<{ data: { results?: ExpenseRow[] } | ExpenseRow[] }>),
      budgets: extract<BudgetRow>(budgets as PromiseSettledResult<{ data: { results?: BudgetRow[] } | BudgetRow[] }>),
      arrears: extract<ArrearsRow>(arrears as PromiseSettledResult<{ data: { results?: ArrearsRow[] } | ArrearsRow[] }>),
      assets: extract<AssetRow>(assets as PromiseSettledResult<{ data: { results?: AssetRow[] } | AssetRow[] }>),
      depreciations: extract<DepreciationRow>(depreciations as PromiseSettledResult<{ data: { results?: DepreciationRow[] } | DepreciationRow[] }>),
      voteHeads: vhData,
      arrearsByTerm: abtData,
    }
  }

  async function handleGenerate() {
    if (selectedReports.size === 0) { setError('Select at least one report.'); return }
    setIsGenerating(true); setError(null); setStatusMsg('Fetching data from database…')
    try {
      const data = await fetchData()
      setStatusMsg('Compiling IPSAS-compliant PDF…')

      const yearObj = academicYears.find((y) => String(y.id) === selectedYear)
      const yearLabel = yearObj?.name ?? 'All Periods'
      const periodLabel = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : yearLabel
      const generatedAt = new Date().toLocaleString('en-KE')
      const reportDate = dateTo || new Date().toISOString().slice(0, 10)

      // ── Aggregate figures ──────────────────────────────────────────────────
      const totalBilled   = data.invoices.reduce((s, r) => s + Number(r.total_amount || 0), 0)
      const totalCollected = data.payments.reduce((s, r) => s + Number(r.amount || 0), 0)
      const totalExpenses  = data.expenses.reduce((s, r) => s + Number(r.amount || 0), 0)
      const totalArrears   = data.arrears.reduce((s, r) => s + Number(r.balance_due || 0), 0)
      const totalPPECost   = data.assets.reduce((s, a) => s + Number(a.purchase_cost || 0), 0)
      const totalPPECarrying = data.assets.reduce((s, a) => s + Number(a.current_value || 0), 0)
      const totalAccumDep  = data.depreciations.reduce((s, d) => s + Number(d.accumulated_depreciation || 0), 0)
      const totalAnnualBudget = data.budgets.reduce((s, b) => s + Number(b.annual_budget || 0), 0)
      const netSurplus     = totalCollected - totalExpenses
      const openCash       = Number(openingCash || 0)
      const closingCash    = openCash + (totalCollected - totalExpenses)

      // ── Bank account totals ────────────────────────────────────────────────
      const bankTotal = bankAccounts.reduce((s, b) => s + Number(b.balance || 0), 0)
      const cashInHand = closingCash - bankTotal > 0 ? closingCash - bankTotal : 0

      // ── Term-based payment splits ──────────────────────────────────────────
      const payByTerm = groupByTerm(data.payments.map((p) => ({ date: p.payment_date, amount: Number(p.amount || 0) })))

      // ── Expense splits by account ──────────────────────────────────────────
      const expTuition: { date: string; amount: number }[] = []
      const expOps: { date: string; amount: number }[] = []
      const expBoarding: { date: string; amount: number }[] = []
      const expInfra: { date: string; amount: number }[] = []
      for (const e of data.expenses) {
        const acct = inferExpenseAccount(e.category)
        const item = { date: e.expense_date, amount: Number(e.amount || 0) }
        if (acct === 'tuition') expTuition.push(item)
        else if (acct === 'boarding') expBoarding.push(item)
        else if (acct === 'infrastructure') expInfra.push(item)
        else expOps.push(item)
      }
      const tuitionTerm = groupByTerm(expTuition)
      const opsTerm     = groupByTerm(expOps)
      const boardingTerm = groupByTerm(expBoarding)
      const infraTerm   = groupByTerm(expInfra)

      // ── Vote head map ──────────────────────────────────────────────────────
      const vhMap: Record<string, number> = {}
      for (const vh of data.voteHeads) {
        vhMap[vh.vote_head_name] = Number(vh.total_allocated || 0)
      }

      // ── Expense by category ────────────────────────────────────────────────
      const expByCat: Record<string, number> = {}
      for (const e of data.expenses) {
        expByCat[e.category || 'Uncategorized'] = (expByCat[e.category || 'Uncategorized'] ?? 0) + Number(e.amount || 0)
      }

      // ── Arrears aging ──────────────────────────────────────────────────────
      const agingBuckets = { lt1: 0, y12: 0, y23: 0, gt3: 0 }
      const today = new Date()
      for (const a of data.arrears) {
        const due = new Date(a.due_date)
        const days = Math.max(0, (today.getTime() - due.getTime()) / 86400000)
        const years = days / 365
        if (years < 1) agingBuckets.lt1 += Number(a.balance_due || 0)
        else if (years < 2) agingBuckets.y12 += Number(a.balance_due || 0)
        else if (years < 3) agingBuckets.y23 += Number(a.balance_due || 0)
        else agingBuckets.gt3 += Number(a.balance_due || 0)
      }

      // ── PDF ────────────────────────────────────────────────────────────────
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pH = doc.internal.pageSize.getHeight()
      const pageFooter = (pageNum?: number) => {
        const n = pageNum ?? doc.getCurrentPageInfo().pageNumber
        doc.setFontSize(6.5); doc.setTextColor(120, 130, 150)
        doc.text(`Page ${n}  |  ${schoolName}  |  IPSAS Annual Financial Statements  |  ${periodLabel}  |  CONFIDENTIAL`, 14, pH - 5)
        doc.text(`Generated: ${generatedAt}`, pageW - 14, pH - 5, { align: 'right' })
      }

      let isFirst = true
      function newAuditPage(title: string) {
        if (!isFirst) { pageFooter(); doc.addPage() }
        isFirst = false
        auditHeader(doc, schoolName, title + '  |  ' + periodLabel, pageW)
      }
      function newDarkPage(title: string) {
        if (!isFirst) { pageFooter(); doc.addPage() }
        isFirst = false
        darkHeader(doc, title, `Period: ${periodLabel}  |  Generated: ${generatedAt}`, pageW)
      }

      // ──────────────────────────────────────────────────────────────────────
      // COVER PAGE
      // ──────────────────────────────────────────────────────────────────────
      doc.setFillColor(10, 36, 99)
      doc.rect(0, 0, pageW, pH, 'F')
      doc.setFillColor(218, 165, 32)
      doc.rect(0, 0, pageW, 5, 'F')
      doc.rect(0, pH - 5, pageW, 5, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text('REPUBLIC OF KENYA', pageW / 2, 30, { align: 'center' })
      doc.setFontSize(9); doc.setFont('helvetica', 'normal')
      if (schoolCounty) doc.text(schoolCounty.toUpperCase() + ' COUNTY', pageW / 2, 38, { align: 'center' })
      doc.setFillColor(218, 165, 32)
      doc.rect(40, 42, pageW - 80, 0.7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20); doc.setFont('helvetica', 'bold')
      doc.text(schoolName.toUpperCase(), pageW / 2, 56, { align: 'center' })
      if (schoolRegNo) {
        doc.setFontSize(9); doc.setFont('helvetica', 'normal')
        doc.text(`REG. NO: ${schoolRegNo}`, pageW / 2, 64, { align: 'center' })
      }
      doc.setFillColor(218, 165, 32)
      doc.rect(40, 68, pageW - 80, 0.7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14); doc.setFont('helvetica', 'bold')
      doc.text('ANNUAL FINANCIAL STATEMENTS', pageW / 2, 82, { align: 'center' })
      doc.setFontSize(11)
      doc.text(`FOR THE PERIOD ENDED ${reportDate.toUpperCase()}`, pageW / 2, 91, { align: 'center' })
      doc.setFillColor(52, 211, 153); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      doc.text('IPSAS Standards Applied:', 30, 110)
      doc.setTextColor(200, 220, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
      const stds = [
        'IPSAS 1 — Presentation of Financial Statements',
        'IPSAS 2 — Statement of Cash Flows',
        'IPSAS 17 — Property, Plant and Equipment',
        'IPSAS 23 — Revenue from Non-Exchange Transactions',
        'IPSAS 24 — Presentation of Budget Information in Financial Statements',
      ]
      stds.forEach((s, i) => doc.text(`• ${s}`, 34, 118 + i * 7))

      doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
      doc.text('TABLE OF CONTENTS', 30, 162)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
      const toc = [
        'I.   Statement of School Management Responsibility',
        'II.  Key School Information and Management',
        'V.   Statement of Receipts and Payments',
        'VI.  Statement of Financial Assets and Financial Liabilities',
        'VII. Statement of Cash Flows',
        'VIII.Statement of Budgeted versus Actual Amounts',
        'IX.  Significant Accounting Policies',
        'X.   Notes to the Financial Statements',
        'XI.  Property, Plant and Equipment Schedule (IPSAS 17)',
      ]
      toc.forEach((t, i) => doc.text(t, 34, 170 + i * 6.5))

      doc.setTextColor(180, 190, 210); doc.setFontSize(7)
      doc.text('CONFIDENTIAL — FOR AUDIT USE ONLY', pageW / 2, pH - 12, { align: 'center' })
      doc.text('Prepared by the Finance Office in accordance with IPSAS on an accrual basis of accounting.', pageW / 2, pH - 7, { align: 'center' })
      isFirst = false

      // ──────────────────────────────────────────────────────────────────────
      // KENYA AUDIT: Statement of Management Responsibility
      // ──────────────────────────────────────────────────────────────────────
      if (selectedReports.has('ka_mgmt_responsibility')) {
        newAuditPage('STATEMENT OF SCHOOL MANAGEMENT RESPONSIBILITY')
        let y = 33
        doc.setFillColor(245, 247, 250)
        doc.rect(14, y, pageW - 28, pH - y - 15, 'F')
        doc.setFillColor(10, 36, 99); doc.rect(14, y, 2, pH - y - 15, 'F')
        y += 8
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(10, 36, 99)
        doc.text('STATEMENT OF SCHOOL MANAGEMENT RESPONSIBILITY FOR FINANCIAL REPORTING', pageW / 2, y, { align: 'center' })
        y += 7
        doc.setFillColor(218, 165, 32); doc.rect(30, y, pageW - 60, 0.5, 'F')
        y += 8
        const pH2 = doc.internal.pageSize.getHeight()
        const respText = [
          `The management of ${schoolName} is responsible for the preparation and presentation of these annual financial statements which have been prepared in accordance with International Public Sector Accounting Standards (IPSAS) as stipulated in the Public Finance Management Act, 2012 and the Education Act.`,
          '',
          'In preparing these financial statements, management is required to:',
          '  a) Select suitable accounting policies and apply them consistently;',
          '  b) Make judgements and estimates that are reasonable and prudent;',
          '  c) State whether applicable accounting standards have been followed, subject to any material departures disclosed and explained in the financial statements; and',
          '  d) Prepare the financial statements on the going concern basis unless it is inappropriate to presume that the school will continue in operation.',
          '',
          'Management is responsible for keeping proper accounting records which disclose with reasonable accuracy at any time the financial position of the school. Management is also responsible for safeguarding the assets of the school and hence for taking reasonable steps for the prevention and detection of fraud and other irregularities.',
          '',
          'Management confirms that they have complied with the above requirements in preparing the accompanying financial statements.',
          '',
          'These financial statements were approved by the Board of Management on ...............................................',
          '',
          'Prepared by: Finance Office',
        ]
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 41, 59)
        for (const line of respText) {
          const lines = doc.splitTextToSize(line, pageW - 50)
          if (y + lines.length * 5 > pH2 - 50) break
          doc.text(lines, 25, y)
          y += lines.length * 5 + (line === '' ? 0 : 2)
        }
        y += 15
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(10, 36, 99)
        const sigY = Math.min(y, pH2 - 60)
        doc.text('PRINCIPAL / HEAD TEACHER', 25, sigY)
        doc.text('CHAIRPERSON, BOARD OF MANAGEMENT', pageW / 2 + 5, sigY)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 41, 59)
        doc.text(principalName || '..................................................', 25, sigY + 8)
        doc.text(bomChair || '..................................................', pageW / 2 + 5, sigY + 8)
        doc.text('Signature: .......................................', 25, sigY + 16)
        doc.text('Signature: .......................................', pageW / 2 + 5, sigY + 16)
        doc.text('Date: ............................................', 25, sigY + 24)
        doc.text('Date: ............................................', pageW / 2 + 5, sigY + 24)
        doc.text('Official Stamp:', 25, sigY + 32)
      }

      // ──────────────────────────────────────────────────────────────────────
      // MANAGEMENT REPORTS (dark theme)
      // ──────────────────────────────────────────────────────────────────────
      if (selectedReports.has('mgmt_income')) {
        newDarkPage('Income Statement (Statement of Financial Performance)')
        let y = 36
        y = darkBar(doc, 'Financial Summary for Period', y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Item', 'Amount (Ksh)']],
          body: [
            ['REVENUE', ''],
            ['Fees Billed (Non-Exchange Revenue)', fmtN(totalBilled)],
            ['Cash Received from Parents / Guardians', fmtN(totalCollected)],
            ['Outstanding / Uncollected', fmtN(totalBilled - totalCollected)],
            ['', ''],
            ['EXPENDITURE', ''],
            ['Total Operating Expenses', fmtN(totalExpenses)],
            ['', ''],
            ['SURPLUS / (DEFICIT) FOR THE PERIOD', fmtN(netSurplus)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [52, 211, 153], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [20, 30, 48] },
          columnStyles: { 1: { halign: 'right' } },
        })
      }

      if (selectedReports.has('mgmt_collection')) {
        newDarkPage('Fee Collection Report')
        let y = 36
        const byMethod: Record<string, number> = {}
        data.payments.forEach((p) => { byMethod[p.payment_method || 'Unknown'] = (byMethod[p.payment_method || 'Unknown'] ?? 0) + Number(p.amount || 0) })
        y = darkBar(doc, `Payments: ${data.payments.length}  |  Total Collected: ${fmtK(totalCollected)}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Payment Method', 'Amount (Ksh)', '% of Total']],
          body: Object.entries(byMethod).map(([m, a]) => [m, fmtN(a), totalCollected ? `${((a / totalCollected) * 100).toFixed(1)}%` : '0%']),
          theme: 'grid',
          headStyles: { fillColor: [52, 211, 153], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, alternateRowStyles: { fillColor: [20, 30, 48] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        })
        const y2 = lastY(doc, y + 30) + 8
        autoTable(doc, {
          startY: y2, margin: { left: 14, right: 14 },
          head: [['Receipt #', 'Student', 'Date', 'Method', 'Amount (Ksh)']],
          body: data.payments.slice(0, 150).map((r) => [r.receipt_number, r.student_name ?? '--', r.payment_date?.slice(0, 10) ?? '--', r.payment_method, fmtN(Number(r.amount))]),
          theme: 'striped',
          headStyles: { fillColor: [52, 211, 153], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 }, columnStyles: { 4: { halign: 'right' } },
        })
      }

      if (selectedReports.has('mgmt_expenses')) {
        newDarkPage('Expense Summary Report')
        let y = 36
        y = darkBar(doc, `Items: ${data.expenses.length}  |  Total: ${fmtK(totalExpenses)}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Category', 'Total (Ksh)', '% of Total', 'Account']],
          body: Object.entries(expByCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => [cat, fmtN(amt), totalExpenses ? `${((amt / totalExpenses) * 100).toFixed(1)}%` : '0%', inferExpenseAccount(cat).toUpperCase()]),
          theme: 'grid',
          headStyles: { fillColor: [52, 211, 153], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, alternateRowStyles: { fillColor: [20, 30, 48] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        })
      }

      if (selectedReports.has('mgmt_budget')) {
        newDarkPage('Budget vs Actual Report')
        let y = 36
        y = darkBar(doc, `Annual Budget: ${fmtK(totalAnnualBudget)}  |  Actual: ${fmtK(totalExpenses)}  |  Variance: ${fmtK(totalAnnualBudget - totalExpenses)}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Metric', 'Amount (Ksh)']],
          body: [
            ['Total Annual Budget (all terms)', fmtN(totalAnnualBudget)],
            ['Total Actual Expenses', fmtN(totalExpenses)],
            ['Variance (Budget − Actual)', fmtN(totalAnnualBudget - totalExpenses)],
            ['Utilisation Rate', totalAnnualBudget > 0 ? `${((totalExpenses / totalAnnualBudget) * 100).toFixed(1)}%` : 'N/A'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [52, 211, 153], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, columnStyles: { 1: { halign: 'right' } },
        })
        const y2 = lastY(doc, y + 30) + 8
        autoTable(doc, {
          startY: y2, margin: { left: 14, right: 14 },
          head: [['Budget Name', 'Term', 'Monthly (Ksh)', 'Quarterly (Ksh)', 'Annual (Ksh)']],
          body: data.budgets.length ? data.budgets.map((b) => [b.name ?? 'General', b.term_name ?? '--', fmtN(Number(b.monthly_budget)), fmtN(Number(b.quarterly_budget)), fmtN(Number(b.annual_budget))]) : [['No budget records.', '', '', '', '']],
          theme: 'striped',
          headStyles: { fillColor: [52, 211, 153], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        })
      }

      if (selectedReports.has('mgmt_arrears')) {
        newDarkPage('Arrears & Outstanding Receivables')
        let y = 36
        y = darkBar(doc, `Total Outstanding: ${fmtK(totalArrears)}  |  Students with Arrears: ${new Set(data.arrears.map((a) => a.student_name)).size}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Invoice #', 'Student', 'Due Date', 'Days Overdue', 'Balance (Ksh)', 'Status']],
          body: data.arrears.slice(0, 150).map((r) => [r.invoice_number, r.student_name, r.due_date?.slice(0, 10) ?? '--', String(r.overdue_days ?? '--'), fmtN(Number(r.balance_due)), r.status]),
          theme: 'striped',
          headStyles: { fillColor: [52, 211, 153], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 }, columnStyles: { 4: { halign: 'right' } },
        })
      }

      if (selectedReports.has('mgmt_vote_heads')) {
        newDarkPage('Vote Head Allocation Report')
        let y = 36
        y = darkBar(doc, `Vote Heads: ${data.voteHeads.length}  |  Grand Total Allocated: ${fmtK(data.voteHeads.reduce((s, v) => s + v.total_allocated, 0))}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Vote Head', 'Total Allocated (Ksh)', 'Transactions', '% of Total']],
          body: data.voteHeads.length ? data.voteHeads.map((v) => [v.vote_head_name, fmtN(v.total_allocated), String(v.transaction_count), `${(v.percentage_of_total ?? 0).toFixed(1)}%`]) : [['No vote head allocations found.', '', '', '']],
          theme: 'grid',
          headStyles: { fillColor: [52, 211, 153], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, alternateRowStyles: { fillColor: [20, 30, 48] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'right' } },
        })
      }

      if (selectedReports.has('mgmt_class_balances')) {
        newDarkPage('Class Fee Balances')
        let y = 36
        y = darkBar(doc, 'Outstanding Balances by Class / Stream', y, pageW)
        const classByTerm: Record<string, number> = {}
        for (const a of data.arrearsByTerm) {
          classByTerm[a.term_name] = (classByTerm[a.term_name] ?? 0) + a.total_outstanding
        }
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Term', 'Invoices', 'Students', 'Outstanding (Ksh)']],
          body: data.arrearsByTerm.length ? data.arrearsByTerm.map((r) => [r.term_name, String(r.invoice_count), String(r.student_count), fmtN(r.total_outstanding)]) : [['No term arrears data.', '', '', '']],
          theme: 'grid',
          headStyles: { fillColor: [52, 211, 153], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 3: { halign: 'right' } },
        })
      }

      // ──────────────────────────────────────────────────────────────────────
      // V. STATEMENT OF RECEIPTS AND PAYMENTS
      // ──────────────────────────────────────────────────────────────────────
      if (selectedReports.has('ka_receipts_payments')) {
        newAuditPage('STATEMENT OF RECEIPTS AND PAYMENTS')
        let y = 33
        y = lightBar(doc, 'STATEMENT OF RECEIPTS AND PAYMENTS FOR THE PERIOD ENDED ' + reportDate.toUpperCase(), y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['', 'Note', 'TERM 1 (Ksh)', 'TERM 2 (Ksh)', 'TERM 3 (Ksh)', 'TOTAL (Ksh)', 'PRIOR YEAR (Ksh)']],
          body: [
            [{ content: 'RECEIPTS FOR OPERATING INCOME', colSpan: 7, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [10, 36, 99] } }],
            ['Government grants for tuition', '1', '—', '—', '—', '—', '—'],
            ['Government grants for operations', '2', '—', '—', '—', '—', '—'],
            ['School fund — Parents contributions/fees', '3', fmtN(payByTerm.t1), fmtN(payByTerm.t2), fmtN(payByTerm.t3), fmtN(payByTerm.total), '—'],
            ['School fund — Other receipts', '4', '—', '—', '—', '—', '—'],
            ['Government grant — Infrastructure', '7', '—', '—', '—', '—', '—'],
            [{ content: `TOTAL RECEIPTS`, colSpan: 2, styles: { fontStyle: 'bold' } }, fmtN(payByTerm.t1), fmtN(payByTerm.t2), fmtN(payByTerm.t3), fmtN(totalCollected), '—'],
            ['', '', '', '', '', '', ''],
            [{ content: 'PAYMENTS', colSpan: 7, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [10, 36, 99] } }],
            ['Cash outflow for Tuition', '6', fmtN(tuitionTerm.t1), fmtN(tuitionTerm.t2), fmtN(tuitionTerm.t3), fmtN(tuitionTerm.total), '—'],
            ['Cash outflow for Operations', '5', fmtN(opsTerm.t1), fmtN(opsTerm.t2), fmtN(opsTerm.t3), fmtN(opsTerm.total), '—'],
            ['Cash outflow — Boarding / School Fund', '8', fmtN(boardingTerm.t1), fmtN(boardingTerm.t2), fmtN(boardingTerm.t3), fmtN(boardingTerm.total), '—'],
            ['Cash outflow — Infrastructure', '9', fmtN(infraTerm.t1), fmtN(infraTerm.t2), fmtN(infraTerm.t3), fmtN(infraTerm.total), '—'],
            [{ content: `TOTAL PAYMENTS`, colSpan: 2, styles: { fontStyle: 'bold' } }, fmtN(tuitionTerm.t1 + opsTerm.t1 + boardingTerm.t1 + infraTerm.t1), fmtN(tuitionTerm.t2 + opsTerm.t2 + boardingTerm.t2 + infraTerm.t2), fmtN(tuitionTerm.t3 + opsTerm.t3 + boardingTerm.t3 + infraTerm.t3), fmtN(totalExpenses), '—'],
            ['', '', '', '', '', '', ''],
            [{ content: 'NET CASH FLOW FROM OPERATING ACTIVITIES', colSpan: 2, styles: { fontStyle: 'bold' } }, '', '', '', fmtN(totalCollected - totalExpenses), '—'],
            ['', '', '', '', '', '', ''],
            [{ content: 'CASHFLOW FROM INVESTING ACTIVITIES', colSpan: 7, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [10, 36, 99] } }],
            ['Proceeds from Sale of Assets', '', '—', '—', '—', '—', '—'],
            ['Acquisition of Assets', '', `(${fmtN(totalPPECost)})`, '—', '—', `(${fmtN(totalPPECost)})`, '—'],
            ['Proceeds from Investments', '', '—', '—', '—', '—', '—'],
            ['Purchase of Investments', '', '—', '—', '—', '—', '—'],
            [{ content: 'NET CASH FLOWS FROM INVESTING ACTIVITIES', colSpan: 2, styles: { fontStyle: 'bold' } }, '', '', '', `(${fmtN(totalPPECost)})`, '—'],
            ['', '', '', '', '', '', ''],
            [{ content: 'CASHFLOW FROM BORROWING ACTIVITIES', colSpan: 7, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [10, 36, 99] } }],
            ['Proceeds from borrowings / loans', '', '—', '—', '—', '—', '—'],
            ['Repayment of principal borrowings', '', '—', '—', '—', '—', '—'],
            [{ content: 'NET CASH FLOW FROM FINANCING ACTIVITIES', colSpan: 2, styles: { fontStyle: 'bold' } }, '', '', '', '—', '—'],
            ['', '', '', '', '', '', ''],
            [{ content: 'NET INCREASE / (DECREASE) IN CASH AND CASH EQUIVALENTS', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, '', '', '', fmtN(totalCollected - totalExpenses - totalPPECost), '—'],
            [{ content: 'Cash and Cash Equivalents at BEGINNING of the year', colSpan: 2, styles: { fontStyle: 'bold' } }, '', '', '', fmtN(openCash), '—'],
            [{ content: 'Cash and Cash Equivalents at END of the year    [Note 10]', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, '', '', '', fmtN(closingCash), '—'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'center', cellWidth: 10 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' }, 6: { halign: 'right' } },
        })
      }

      // ──────────────────────────────────────────────────────────────────────
      // VI. STATEMENT OF FINANCIAL ASSETS AND LIABILITIES
      // ──────────────────────────────────────────────────────────────────────
      if (selectedReports.has('ka_financial_assets')) {
        newAuditPage('STATEMENT OF FINANCIAL ASSETS AND FINANCIAL LIABILITIES')
        let y = 33
        y = lightBar(doc, 'STATEMENT OF FINANCIAL ASSETS AND FINANCIAL LIABILITIES AS AT ' + reportDate.toUpperCase(), y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['', 'Note', 'CURRENT YEAR (Ksh)', 'PRIOR YEAR (Ksh)']],
          body: [
            [{ content: 'FINANCIAL ASSETS', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [10, 36, 99] } }],
            [{ content: 'Cash and Cash Equivalents:', colSpan: 4, styles: { fontStyle: 'bold' } }],
            ['    Bank Balances', '10', fmtN(bankTotal || closingCash), '—'],
            ['    Cash Balances', '11', fmtN(cashInHand), '—'],
            ['    Short-term Investments', '', '—', '—'],
            [{ content: 'TOTAL CASH AND CASH EQUIVALENTS', colSpan: 2, styles: { fontStyle: 'bold' } }, fmtN(closingCash), '—'],
            ['Accounts Receivables (Fee Arrears)', '12', fmtN(totalArrears), '—'],
            [{ content: 'TOTAL FINANCIAL ASSETS', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(closingCash + totalArrears), '—'],
            ['', '', '', ''],
            [{ content: 'FINANCIAL LIABILITIES', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [10, 36, 99] } }],
            ['Accounts Payables (Trade Creditors)', '13', '—', '—'],
            [{ content: 'TOTAL FINANCIAL LIABILITIES', colSpan: 2, styles: { fontStyle: 'bold' } }, '—', '—'],
            ['', '', '', ''],
            [{ content: 'NET FINANCIAL ASSETS', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(closingCash + totalArrears), '—'],
            ['', '', '', ''],
            [{ content: 'REPRESENTED BY:', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [10, 36, 99] } }],
            ['Accumulated Fund brought forward', '', fmtN(openCash), '—'],
            ['Surplus / (Deficit) for the year', '', fmtN(netSurplus), '—'],
            ['Accounts Receivable (net)', '', fmtN(totalArrears), '—'],
            [{ content: 'NET FINANCIAL POSITION', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(closingCash + totalArrears), '—'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'center', cellWidth: 12 }, 2: { halign: 'right', fontStyle: 'bold' }, 3: { halign: 'right' } },
        })
      }

      // ──────────────────────────────────────────────────────────────────────
      // VII. STATEMENT OF CASH FLOWS (IPSAS 2)
      // ──────────────────────────────────────────────────────────────────────
      if (selectedReports.has('ka_cash_flow')) {
        newAuditPage('STATEMENT OF CASH FLOWS — IPSAS 2')
        let y = 33
        y = lightBar(doc, 'STATEMENT OF CASH FLOWS FOR THE PERIOD ENDED ' + reportDate.toUpperCase(), y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Cash Flow Item', 'Note', 'CURRENT YEAR (Ksh)', 'PRIOR YEAR (Ksh)']],
          body: [
            [{ content: 'CASH FLOWS FROM OPERATING ACTIVITIES', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [10, 36, 99] } }],
            ['Cash received from fee payers (students / parents)', '', fmtN(totalCollected), '—'],
            ['Government capitation received', '', '—', '—'],
            ['Cash paid to suppliers and service providers', '', `(${fmtN(totalExpenses)})`, '—'],
            ['Cash paid to employees (emoluments)', '', '—', '—'],
            [{ content: 'NET CASH FROM OPERATING ACTIVITIES', colSpan: 2, styles: { fontStyle: 'bold' } }, fmtN(totalCollected - totalExpenses), '—'],
            ['', '', '', ''],
            [{ content: 'CASH FLOWS FROM INVESTING ACTIVITIES', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [10, 36, 99] } }],
            ['Proceeds from disposal of assets', '', '—', '—'],
            ['Acquisition of Property, Plant & Equipment', '', totalPPECost > 0 ? `(${fmtN(totalPPECost)})` : '—', '—'],
            ['Proceeds from short-term investments', '', '—', '—'],
            ['Purchase of short-term investments', '', '—', '—'],
            [{ content: 'NET CASH FROM INVESTING ACTIVITIES', colSpan: 2, styles: { fontStyle: 'bold' } }, totalPPECost > 0 ? `(${fmtN(totalPPECost)})` : '—', '—'],
            ['', '', '', ''],
            [{ content: 'CASH FLOWS FROM FINANCING ACTIVITIES', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [10, 36, 99] } }],
            ['Proceeds from borrowings / loans', '', '—', '—'],
            ['Repayment of borrowings', '', '—', '—'],
            [{ content: 'NET CASH FROM FINANCING ACTIVITIES', colSpan: 2, styles: { fontStyle: 'bold' } }, '—', '—'],
            ['', '', '', ''],
            [{ content: 'NET INCREASE / (DECREASE) IN CASH AND CASH EQUIVALENTS', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(totalCollected - totalExpenses - totalPPECost), '—'],
            [{ content: 'Cash and Cash Equivalents — BEGINNING of year', colSpan: 2, styles: {} }, fmtN(openCash), '—'],
            [{ content: 'Cash and Cash Equivalents — END of year  [Note 10]', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(closingCash), '—'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'center', cellWidth: 12 }, 2: { halign: 'right', fontStyle: 'bold' }, 3: { halign: 'right' } },
        })
      }

      // ──────────────────────────────────────────────────────────────────────
      // VIII. STATEMENT OF BUDGETED VS ACTUAL (IPSAS 24)
      // ──────────────────────────────────────────────────────────────────────
      if (selectedReports.has('ka_budget_actual')) {
        newAuditPage('STATEMENT OF BUDGETED VERSUS ACTUAL AMOUNTS — IPSAS 24')
        let y = 33
        y = lightBar(doc, 'IPSAS 24 — COMPARISON OF BUDGET AND ACTUAL AMOUNTS FOR PERIOD ENDED ' + reportDate.toUpperCase(), y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Account', 'Approved Budget (Ksh)', 'Revised Budget (Ksh)', 'Actual (Ksh)', 'Variance (Ksh)', 'Var %']],
          body: [
            [{ content: 'RECEIPTS', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [10, 36, 99] } }],
            ['Tuition (Government Grant)', '—', '—', '—', '—', '—'],
            ['Operations (Government Grant)', '—', '—', '—', '—', '—'],
            ['School Fund (Parents Fees)', fmtN(totalAnnualBudget), fmtN(totalAnnualBudget), fmtN(totalCollected), fmtN(totalCollected - totalAnnualBudget), totalAnnualBudget > 0 ? `${(((totalCollected - totalAnnualBudget) / totalAnnualBudget) * 100).toFixed(1)}%` : 'N/A'],
            ['Infrastructure', '—', '—', '—', '—', '—'],
            [{ content: 'TOTAL RECEIPTS', colSpan: 2, styles: { fontStyle: 'bold' } }, fmtN(totalAnnualBudget), fmtN(totalCollected), fmtN(totalCollected - totalAnnualBudget), totalAnnualBudget > 0 ? `${(((totalCollected - totalAnnualBudget) / totalAnnualBudget) * 100).toFixed(1)}%` : 'N/A'],
            ['', '', '', '', '', ''],
            [{ content: 'PAYMENTS', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [220, 230, 245], textColor: [10, 36, 99] } }],
            ['Tuition Expenditure', fmtN(totalAnnualBudget * 0.3), fmtN(totalAnnualBudget * 0.3), fmtN(tuitionTerm.total), fmtN(totalAnnualBudget * 0.3 - tuitionTerm.total), '—'],
            ['Operations Expenditure', fmtN(totalAnnualBudget * 0.4), fmtN(totalAnnualBudget * 0.4), fmtN(opsTerm.total), fmtN(totalAnnualBudget * 0.4 - opsTerm.total), '—'],
            ['Boarding / School Fund', fmtN(totalAnnualBudget * 0.2), fmtN(totalAnnualBudget * 0.2), fmtN(boardingTerm.total), fmtN(totalAnnualBudget * 0.2 - boardingTerm.total), '—'],
            ['Infrastructure', fmtN(totalAnnualBudget * 0.1), fmtN(totalAnnualBudget * 0.1), fmtN(infraTerm.total), fmtN(totalAnnualBudget * 0.1 - infraTerm.total), '—'],
            [{ content: 'TOTAL PAYMENTS', colSpan: 2, styles: { fontStyle: 'bold' } }, fmtN(totalAnnualBudget), fmtN(totalExpenses), fmtN(totalAnnualBudget - totalExpenses), totalAnnualBudget > 0 ? `${(((totalAnnualBudget - totalExpenses) / totalAnnualBudget) * 100).toFixed(1)}%` : 'N/A'],
            ['', '', '', '', '', ''],
            [{ content: 'NET SURPLUS / (DEFICIT)', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, '', fmtN(netSurplus), '', ''],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
        })
      }

      // ──────────────────────────────────────────────────────────────────────
      // IX. SIGNIFICANT ACCOUNTING POLICIES
      // ──────────────────────────────────────────────────────────────────────
      if (selectedReports.has('ka_policies')) {
        newAuditPage('SIGNIFICANT ACCOUNTING POLICIES')
        let y = 33
        y = lightBar(doc, 'IX. SIGNIFICANT ACCOUNTING POLICIES', y, pageW)
        const policies = [
          { title: '1. Basis of Preparation', body: 'These financial statements have been prepared in accordance with International Public Sector Accounting Standards (IPSAS) on an accrual basis of accounting as adopted by the National Treasury. They are presented in Kenya Shillings (Ksh) and all amounts are rounded to two decimal places. The accounting policies set out below have been applied consistently to all periods presented.' },
          { title: '2. Revenue Recognition (IPSAS 23)', body: 'School fees are classified as non-exchange revenue and are recognised when received or when the related receivable can be reliably measured and it is probable that the economic benefit will flow to the school. Government capitation grants are recognised when the conditions attached to the grant are met and the funds are available. Fee income billed but not yet collected is recognised as an accounts receivable at its nominal amount.' },
          { title: '3. Expenses', body: 'Expenditure is recognised on an accrual basis. Expenses are recorded when the goods or services have been received, regardless of when payment is made. Personnel emoluments are charged to the statement of receipts and payments in the period in which the service is rendered.' },
          { title: '4. Property, Plant & Equipment (IPSAS 17)', body: 'Items of property, plant and equipment are stated at historical cost less accumulated depreciation and accumulated impairment losses. Depreciation is calculated using the straight-line method over the estimated useful life of each asset class: Buildings — 50 years; Furniture & Equipment — 10 years; Computers — 5 years; Vehicles — 8 years; Machinery — 15 years. Gains or losses on disposal are included in the income statement.' },
          { title: '5. Cash and Cash Equivalents', body: 'Cash and cash equivalents comprise cash on hand, demand deposits, and short-term highly liquid investments that are readily convertible to known amounts of cash and which are subject to insignificant risk of changes in value. Bank overdrafts are presented as a component of cash and cash equivalents in the cash flow statement.' },
          { title: '6. Accounts Receivable', body: 'Accounts receivable are recognised at their nominal amount. An impairment is recognised when there is objective evidence that the receivable will not be collected in full. The carrying amount is reduced through an allowance account, and the loss is recognised in the statement of financial performance.' },
          { title: '7. Accounts Payable', body: 'Accounts payable are recognised at their nominal amount when the obligation arises. Prepaid fees received from parents are recognised as a liability until the related service is rendered.' },
          { title: '8. Budget Information (IPSAS 24)', body: 'Annual budgets are approved by the Board of Management at the start of each financial year. Budgets are prepared on the same accounting basis as the financial statements. The comparison of budgeted and actual amounts in Statement VIII identifies material differences and explains significant variances.' },
          { title: '9. Going Concern', body: 'The financial statements have been prepared on the going concern basis. Management is not aware of any material uncertainties that may cast significant doubt on the ability of the school to continue as a going concern.' },
          { title: '10. Comparative Figures', body: 'Where necessary, comparative figures are restated to conform to the current year presentation. Prior year figures should be obtained from the previous year\'s audited financial statements.' },
        ]
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
        for (const p of policies) {
          y = checkPage(doc, y, 18, 'IX. Significant Accounting Policies', schoolName, periodLabel, pageW)
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(10, 36, 99)
          doc.text(p.title, 17, y)
          y += 5
          const lines = doc.splitTextToSize(p.body, pageW - 34)
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(30, 41, 59)
          doc.text(lines, 17, y)
          y += lines.length * 4.5 + 5
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // X. NOTES TO FINANCIAL STATEMENTS
      // ──────────────────────────────────────────────────────────────────────
      if (selectedReports.has('ka_notes')) {
        newAuditPage('NOTES TO THE FINANCIAL STATEMENTS')
        let y = 33

        // NOTE 3: Parents Contributions by Term
        y = lightBar(doc, 'NOTE 3: PARENTS CONTRIBUTION / SCHOOL FEES', y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['CATEGORY', 'TERM 1 (Ksh)', 'TERM 2 (Ksh)', 'TERM 3 (Ksh)', 'TOTALS (Ksh)']],
          body: [
            ['Repairs, Maintenance & Improvements (RMI)', '—', '—', '—', '—'],
            ['Local Transport & Travelling (LT&T)', '—', '—', '—', '—'],
            ['Administration / Contingencies (ADM)', '—', '—', '—', '—'],
            ['Electricity, Water & Conservancy (EW&C)', '—', '—', '—', '—'],
            ['Personnel Emoluments (P.EMOLUMENT)', '—', '—', '—', '—'],
            ['Activity', '—', '—', '—', '—'],
            [{ content: 'SUB-TOTAL (Term Fees)', colSpan: 1, styles: { fontStyle: 'bold' } }, fmtN(payByTerm.t1), fmtN(payByTerm.t2), fmtN(payByTerm.t3), fmtN(payByTerm.total)],
            ['Sundry Debtors Recovery', '—', '—', '—', '—'],
            ['Pre-payments', '—', '—', '—', '—'],
            [{ content: 'TOTALS', colSpan: 1, styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(payByTerm.t1), fmtN(payByTerm.t2), fmtN(payByTerm.t3), fmtN(payByTerm.total)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
        })

        y = lastY(doc, y + 40) + 8
        y = checkPage(doc, y, 40, 'X. Notes to Financial Statements', schoolName, periodLabel, pageW)

        // NOTE 5: Operations Expenditure
        y = lightBar(doc, 'NOTE 5: EXPENDITURE FOR OPERATIONS', y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['EXPENSE CATEGORY', 'TERM 1 (Ksh)', 'TERM 2 (Ksh)', 'TERM 3 (Ksh)', 'TOTALS (Ksh)']],
          body: [
            ['Personnel Emoluments', '—', '—', '—', '—'],
            ['Repairs, Maintenance & Improvements', '—', '—', '—', '—'],
            ['Local Transport / Travelling', '—', '—', '—', '—'],
            ['Electricity, Water & Conservancy', '—', '—', '—', '—'],
            ['Medical', '—', '—', '—', '—'],
            ['Administration Costs', '—', '—', '—', '—'],
            ['Activity Expenses', '—', '—', '—', '—'],
            ['Bank Charges', '—', '—', '—', '—'],
            ...Object.entries(expByCat).filter(([c]) => inferExpenseAccount(c) === 'operations').slice(0, 8).map(([c, amt]) => [c, '—', '—', '—', fmtN(amt)]),
            [{ content: 'TOTALS', styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(opsTerm.t1), fmtN(opsTerm.t2), fmtN(opsTerm.t3), fmtN(opsTerm.total)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
        })

        y = lastY(doc, y + 40) + 8
        y = checkPage(doc, y, 40, 'X. Notes to Financial Statements', schoolName, periodLabel, pageW)

        // NOTE 6: Tuition Expenditure
        y = lightBar(doc, 'NOTE 6: EXPENDITURE FOR TUITION', y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['EXPENSE CATEGORY', 'TERM 1 (Ksh)', 'TERM 2 (Ksh)', 'TERM 3 (Ksh)', 'TOTALS (Ksh)']],
          body: [
            ['Exercise Books / Stationery', '—', '—', '—', '—'],
            ['Laboratory Equipment', '—', '—', '—', '—'],
            ['Exams & Assessments', '—', '—', '—', '—'],
            ['Teaching / Learning Materials', '—', '—', '—', '—'],
            ['Chalks / Markers', '—', '—', '—', '—'],
            ['Reference / Teaching Guides', '—', '—', '—', '—'],
            ['Bank Charges', '—', '—', '—', '—'],
            ...Object.entries(expByCat).filter(([c]) => inferExpenseAccount(c) === 'tuition').slice(0, 5).map(([c, amt]) => [c, '—', '—', '—', fmtN(amt)]),
            ['Sundry Creditors', '—', '—', '—', '—'],
            [{ content: 'TOTALS', styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(tuitionTerm.t1), fmtN(tuitionTerm.t2), fmtN(tuitionTerm.t3), fmtN(tuitionTerm.total)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
        })

        y = lastY(doc, y + 40) + 8
        y = checkPage(doc, y, 40, 'X. Notes to Financial Statements', schoolName, periodLabel, pageW)

        // NOTE 9: Infrastructure
        y = lightBar(doc, 'NOTE 9: INFRASTRUCTURE EXPENDITURE', y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['EXPENSE CATEGORY', 'TERM 1 (Ksh)', 'TERM 2 (Ksh)', 'TERM 3 (Ksh)', 'TOTALS (Ksh)']],
          body: [
            ['Material Cost', '—', '—', '—', '—'],
            ['Labour Cost', '—', '—', '—', '—'],
            ['Bank Charges', '—', '—', '—', '—'],
            ['CCTV Installation', '—', '—', '—', '—'],
            ['Personnel Emoluments', '—', '—', '—', '—'],
            ...Object.entries(expByCat).filter(([c]) => inferExpenseAccount(c) === 'infrastructure').slice(0, 5).map(([c, amt]) => [c, '—', '—', '—', fmtN(amt)]),
            [{ content: 'TOTALS', styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(infraTerm.t1), fmtN(infraTerm.t2), fmtN(infraTerm.t3), fmtN(infraTerm.total)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
        })

        y = lastY(doc, y + 40) + 8
        y = checkPage(doc, y, 40, 'X. Notes to Financial Statements', schoolName, periodLabel, pageW)

        // NOTE 10: Bank Accounts
        y = lightBar(doc, 'NOTE 10: BANK BALANCES AS AT ' + reportDate.toUpperCase(), y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['ACCOUNT', 'BANK', 'ACCOUNT NUMBER', 'BALANCE (Ksh)']],
          body: [
            ...bankAccounts.map((b) => [b.label, b.bank, b.accountNo || '—', b.balance ? fmtN(Number(b.balance)) : '—']),
            [{ content: 'TOTAL BANK BALANCES', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(bankTotal)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        })

        y = lastY(doc, y + 30) + 8
        y = checkPage(doc, y, 30, 'X. Notes to Financial Statements', schoolName, periodLabel, pageW)

        // NOTE 11: Cash in Hand
        y = lightBar(doc, 'NOTE 11: CASH IN HAND AS AT ' + reportDate.toUpperCase(), y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['ACCOUNT', 'AMOUNT (Ksh)']],
          body: [
            ['Operations Account — Petty Cash', '—'],
            ['School Fund Account — Petty Cash', '—'],
            [{ content: 'TOTAL CASH IN HAND', styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(cashInHand)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        })

        y = lastY(doc, y + 25) + 8
        y = checkPage(doc, y, 50, 'X. Notes to Financial Statements', schoolName, periodLabel, pageW)

        // NOTE 12: Accounts Receivable + Aging
        y = lightBar(doc, 'NOTE 12: ACCOUNTS RECEIVABLE (FEE ARREARS) AS AT ' + reportDate.toUpperCase(), y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['RECEIVABLE TYPE', 'AMOUNT (Ksh)']],
          body: [
            ['Fees Arrears (Outstanding Invoices)', fmtN(totalArrears)],
            ['Other Non-Fee Receivables', '—'],
            ['Salary Advance', '—'],
            ['Imprest Outstanding', '—'],
            [{ content: 'TOTAL ACCOUNTS RECEIVABLE', styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(totalArrears)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        })
        const y12a = lastY(doc, y + 30) + 6
        autoTable(doc, {
          startY: y12a, margin: { left: 14, right: 14 },
          head: [['NOTE 12b — AGEING ANALYSIS OF ACCOUNTS RECEIVABLE', 'AMOUNT (Ksh)', '% OF TOTAL']],
          body: [
            ['Fees arrears — less than 1 year', fmtN(agingBuckets.lt1), totalArrears > 0 ? `${((agingBuckets.lt1 / totalArrears) * 100).toFixed(1)}%` : '0%'],
            ['Fees arrears — between 1 and 2 years', fmtN(agingBuckets.y12), totalArrears > 0 ? `${((agingBuckets.y12 / totalArrears) * 100).toFixed(1)}%` : '0%'],
            ['Fees arrears — between 2 and 3 years', fmtN(agingBuckets.y23), totalArrears > 0 ? `${((agingBuckets.y23 / totalArrears) * 100).toFixed(1)}%` : '0%'],
            ['Fees arrears — over 3 years', fmtN(agingBuckets.gt3), totalArrears > 0 ? `${((agingBuckets.gt3 / totalArrears) * 100).toFixed(1)}%` : '0%'],
            [{ content: 'TOTAL FEES ARREARS', styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, fmtN(totalArrears), '100%'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 },
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'right' } },
        })

        y = lastY(doc, y12a + 40) + 8
        y = checkPage(doc, y, 40, 'X. Notes to Financial Statements', schoolName, periodLabel, pageW)

        // NOTE 13: Accounts Payable
        y = lightBar(doc, 'NOTE 13: ACCOUNTS PAYABLE AS AT ' + reportDate.toUpperCase(), y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['PAYABLE TYPE', 'CURRENT YEAR (Ksh)', 'PRIOR YEAR (Ksh)']],
          body: [
            ['Trade Creditors (Suppliers)', '—', '—'],
            ['Prepaid Fees (Received in Advance)', '—', '—'],
            ['Retention Money', '—', '—'],
            [{ content: 'TOTAL ACCOUNTS PAYABLE', styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, '—', '—'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'right' } },
        })
        const y13a = lastY(doc, y + 30) + 6
        autoTable(doc, {
          startY: y13a, margin: { left: 14, right: 14 },
          head: [['NOTE 13b — AGEING ANALYSIS OF ACCOUNTS PAYABLE', 'AMOUNT (Ksh)']],
          body: [
            ['Trade creditors — current year', '—'],
            ['Trade creditors — previous year', '—'],
            ['Trade creditors — prior periods', '—'],
            [{ content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [10, 36, 99], textColor: [255, 255, 255] } }, '—'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 },
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        })
      }

      // ──────────────────────────────────────────────────────────────────────
      // XI. IPSAS 17 — PPE SCHEDULE
      // ──────────────────────────────────────────────────────────────────────
      if (selectedReports.has('ka_ppe')) {
        newAuditPage('IPSAS 17 — PROPERTY, PLANT & EQUIPMENT SCHEDULE')
        let y = 33
        y = lightBar(doc, 'IPSAS 17 — PROPERTY, PLANT AND EQUIPMENT SCHEDULE AS AT ' + reportDate.toUpperCase(), y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Asset Name', 'Category', 'Purchase Date', 'Cost (Ksh)', 'Net Book Value (Ksh)', 'Method', 'Life (Yrs)']],
          body: data.assets.length ? data.assets.slice(0, 200).map((a) => [
            a.name, a.category_name ?? '--', a.purchase_date?.slice(0, 10) ?? '--',
            fmtN(Number(a.purchase_cost)), fmtN(Number(a.current_value)),
            a.depreciation_method ?? 'SL', String(a.useful_life_years ?? '--'),
          ]) : [['No assets recorded.', '', '', '', '', '', '']],
          theme: 'striped',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
        })
        const yppe = lastY(doc, y + 60) + 8
        autoTable(doc, {
          startY: yppe, margin: { left: 14, right: 14 },
          head: [['IPSAS 17 Summary', 'Amount (Ksh)']],
          body: [
            ['Gross Cost (Historical Cost)', fmtN(totalPPECost)],
            ['Less: Accumulated Depreciation', `(${fmtN(totalAccumDep)})`],
            ['Net Book Value (Carrying Amount)', fmtN(totalPPECarrying)],
            ['Impairment Losses Recognised', '—'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 36, 99], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        })
      }

      // ── Page numbers ──────────────────────────────────────────────────────
      pageFooter()
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        if (i > 1) {
          doc.setFontSize(6.5); doc.setTextColor(120, 130, 150)
          doc.text(`Page ${i} of ${totalPages}  |  ${schoolName}  |  IPSAS Annual Financial Statements  |  ${periodLabel}  |  CONFIDENTIAL`, 14, pH - 5)
          doc.text(`Generated: ${generatedAt}`, pageW - 14, pH - 5, { align: 'right' })
        }
      }

      const filename = `IPSAS_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${yearLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      doc.save(filename)
      setPreview({ totalBilled, totalCollected, totalExpenses, netSurplus, totalArrears, totalPPECost, totalPPECarrying, totalAccumDep, totalAnnualBudget, closingCash, invoiceCount: data.invoices.length, paymentCount: data.payments.length, expenseCount: data.expenses.length, assetCount: data.assets.length, yearLabel })
      setStatusMsg(`✓ Downloaded: ${filename}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF generation failed.')
      setStatusMsg(null)
    } finally {
      setIsGenerating(false)
    }
  }

  const yearObj = academicYears.find((y) => String(y.id) === selectedYear)
  const mgmtKeys = MANAGEMENT_REPORTS.map((r) => r.key)
  const kenyaKeys = KENYA_AUDIT_REPORTS.map((r) => r.key)

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero badge="FINANCE" badgeColor="emerald" title="Financial Reports" subtitle="IPSAS-compliant annual financial statements — Kenya school format" icon="📋" />

      <header className="col-span-12 rounded-2xl glass-panel p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">IPSAS Annual Financial Statements</h1>
        <p className="mt-2 text-sm text-slate-400">Generates a full Kenya school IPSAS-compliant annual financial report PDF matching the Ministry of Education audit format.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['IPSAS 1', 'IPSAS 2', 'IPSAS 17', 'IPSAS 23', 'IPSAS 24'].map((s) => (
            <span key={s} className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-300">{s}</span>
          ))}
          <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-0.5 text-xs font-medium text-blue-300">Kenya MoE Format</span>
        </div>
      </header>

      <section className="col-span-12 lg:col-span-4 space-y-4">
        {/* School Information */}
        <div className="rounded-2xl glass-panel p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400">School Information</h2>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-slate-400 mb-1 block">School Name</span>
              <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="e.g. Magundu Girls High School" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">County</span>
                <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none" value={schoolCounty} onChange={(e) => setSchoolCounty(e.target.value)} placeholder="e.g. Nyeri" />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Reg. Number</span>
                <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none" value={schoolRegNo} onChange={(e) => setSchoolRegNo(e.target.value)} placeholder="e.g. KE/123456" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Principal Name</span>
                <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none" value={principalName} onChange={(e) => setPrincipalName(e.target.value)} placeholder="Full name" />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">BOM Chair</span>
                <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none" value={bomChair} onChange={(e) => setBomChair(e.target.value)} placeholder="Full name" />
              </label>
            </div>
            <label className="block">
              <span className="text-xs text-slate-400 mb-1 block">Opening Cash Balance (Ksh)</span>
              <input type="number" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} placeholder="0.00" />
            </label>
          </div>
        </div>

        {/* Bank Accounts */}
        <div className="rounded-2xl glass-panel p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Bank Accounts (Note 10)</h2>
          {bankAccounts.map((acct, i) => (
            <div key={i} className="rounded-xl border border-white/[0.07] bg-slate-950/40 p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-300">{acct.label}</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full rounded-lg border border-white/[0.07] bg-slate-900 px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-400" placeholder="Bank name" value={acct.bank} onChange={(e) => setBankAccounts((prev) => prev.map((b, j) => j === i ? { ...b, bank: e.target.value } : b))} />
                <input className="w-full rounded-lg border border-white/[0.07] bg-slate-900 px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-400" placeholder="Account No." value={acct.accountNo} onChange={(e) => setBankAccounts((prev) => prev.map((b, j) => j === i ? { ...b, accountNo: e.target.value } : b))} />
              </div>
              <input type="number" className="w-full rounded-lg border border-white/[0.07] bg-slate-900 px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-400" placeholder="Balance (Ksh)" value={acct.balance} onChange={(e) => setBankAccounts((prev) => prev.map((b, j) => j === i ? { ...b, balance: e.target.value } : b))} />
            </div>
          ))}
        </div>

        {/* Report Period */}
        <div className="rounded-2xl glass-panel p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Report Period</h2>
          <label className="block">
            <span className="text-xs text-slate-400 mb-1 block">Academic / Financial Year</span>
            <select className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none" value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); const yr = academicYears.find((y) => String(y.id) === e.target.value); if (yr) { setDateFrom(yr.start_date?.slice(0, 10) ?? ''); setDateTo(yr.end_date?.slice(0, 10) ?? '') } }}>
              <option value="">All Years</option>
              {academicYears.map((y) => <option key={y.id} value={String(y.id)}>{y.name}</option>)}
            </select>
          </label>
          {yearObj && <p className="text-xs text-slate-500">{yearObj.start_date?.slice(0, 10)} — {yearObj.end_date?.slice(0, 10)}</p>}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-400 mb-1 block">Date From</span>
              <input type="date" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400 mb-1 block">Date To</span>
              <input type="date" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
          </div>
        </div>

        {/* Report Selection */}
        <div className="rounded-2xl glass-panel p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Report Selection</h2>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Management Reports</span>
              <button onClick={() => toggleGroup(mgmtKeys)} className="text-xs text-emerald-400 hover:text-emerald-300">
                {mgmtKeys.every((k) => selectedReports.has(k)) ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="space-y-2">
              {MANAGEMENT_REPORTS.map((r) => (
                <label key={r.key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={selectedReports.has(r.key)} onChange={() => toggle(r.key)} className="h-4 w-4 accent-emerald-500" />
                  <span className={`text-sm ${selectedReports.has(r.key) ? 'text-white' : 'text-slate-500'}`}>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Kenya IPSAS Audit Package</span>
              <button onClick={() => toggleGroup(kenyaKeys)} className="text-xs text-blue-400 hover:text-blue-300">
                {kenyaKeys.every((k) => selectedReports.has(k)) ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="space-y-2">
              {KENYA_AUDIT_REPORTS.map((r) => (
                <label key={r.key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={selectedReports.has(r.key)} onChange={() => toggle(r.key)} className="h-4 w-4 accent-blue-500" />
                  <span className={`text-sm ${selectedReports.has(r.key) ? 'text-blue-200' : 'text-slate-500'}`}>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
          {statusMsg && !error && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{statusMsg}</div>}

          <button onClick={handleGenerate} disabled={isGenerating || selectedReports.size === 0} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition">
            {isGenerating ? 'Generating IPSAS PDF…' : '📥 Download Kenya IPSAS Audit PDF'}
          </button>
        </div>
      </section>

      <section className="col-span-12 lg:col-span-8 space-y-4">
        {/* Preview metrics */}
        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-base font-semibold mb-4">Report Preview</h2>
          {!preview ? (
            <div className="rounded-xl border border-white/[0.07] bg-slate-950/40 p-8 text-center">
              <p className="text-sm text-slate-400">Fill in school info, select reports, and click <span className="text-blue-400 font-semibold">Download Kenya IPSAS Audit PDF</span>.</p>
              <p className="mt-2 text-xs text-slate-500">Generates a cover page, management responsibility statement, all financial statements, accounting policies, and comprehensive notes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: 'Financial Year', value: String(preview.yearLabel) },
                { label: 'Fees Billed', value: fmtK(Number(preview.totalBilled)) },
                { label: 'Cash Received', value: fmtK(Number(preview.totalCollected)) },
                { label: 'Total Expenses', value: fmtK(Number(preview.totalExpenses)) },
                { label: 'Net Surplus', value: fmtK(Number(preview.netSurplus)) },
                { label: 'Closing Cash', value: fmtK(Number(preview.closingCash)) },
                { label: 'Fee Arrears', value: fmtK(Number(preview.totalArrears)) },
                { label: 'PPE Net Book Value', value: fmtK(Number(preview.totalPPECarrying)) },
                { label: 'Annual Budget', value: fmtK(Number(preview.totalAnnualBudget)) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                  <p className="mt-1 text-base font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kenya Audit Package coverage */}
        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-base font-semibold mb-1">Kenya IPSAS Audit Report Structure</h2>
          <p className="text-xs text-slate-400 mb-4">Matches the Ministry of Education / TSC annual financial audit format</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { roman: 'I', title: 'Statement of Management Responsibility', key: 'ka_mgmt_responsibility', note: 'Principal + BOM Chair signatures' },
              { roman: 'V', title: 'Statement of Receipts & Payments', key: 'ka_receipts_payments', note: 'Term 1 / 2 / 3 breakdowns, cash-basis' },
              { roman: 'VI', title: 'Statement of Financial Assets & Liabilities', key: 'ka_financial_assets', note: 'Bank + Cash + Receivables + Payables' },
              { roman: 'VII', title: 'Statement of Cash Flows', key: 'ka_cash_flow', note: 'IPSAS 2 — Operating / Investing / Financing' },
              { roman: 'VIII', title: 'Statement of Budgeted vs Actual', key: 'ka_budget_actual', note: 'IPSAS 24 — Budget variance analysis' },
              { roman: 'IX', title: 'Significant Accounting Policies', key: 'ka_policies', note: '10 disclosure notes on basis of preparation' },
              { roman: 'X', title: 'Notes to Financial Statements', key: 'ka_notes', note: 'Notes 3–13: parents fees, bank accounts, aging' },
              { roman: 'XI', title: 'PPE Schedule', key: 'ka_ppe', note: 'IPSAS 17 — Asset register + depreciation' },
            ].map((item) => (
              <div key={item.key} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition ${selectedReports.has(item.key) ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/[0.07] bg-slate-950/40 opacity-40'}`}>
                <span className={`mt-0.5 shrink-0 rounded-full h-5 w-5 flex items-center justify-center text-[9px] font-bold ${selectedReports.has(item.key) ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{item.roman}</span>
                <div>
                  <p className={`font-semibold text-xs ${selectedReports.has(item.key) ? 'text-blue-200' : 'text-slate-400'}`}>{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guidance notes */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide mb-2">Auditor Guidance</p>
          <ul className="text-sm text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Enter <strong>bank account balances</strong> and <strong>opening cash</strong> in the School Information panel before generating.</li>
            <li>Expenses are auto-classified into Tuition / Operations / Boarding / Infrastructure based on category name — review the classification in the expense module.</li>
            <li>Payments are split into <strong>Term 1 (Jan–Apr) / Term 2 (May–Aug) / Term 3 (Sep–Dec)</strong> based on payment date.</li>
            <li><strong>Government grants</strong> (capitation) must be entered manually — obtain from TSC/MoE records.</li>
            <li><strong>Accounts Payable</strong> data must be entered manually from supplier invoices and payroll accruals.</li>
            <li>The <strong>Management Responsibility Statement</strong> requires physical signatures by the Principal and BOM Chair.</li>
            <li>IPSAS 24 budget vs actual uses the annual budget spread across accounts — update vote heads for precise allocation.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
