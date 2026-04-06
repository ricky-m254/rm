import { useRef } from 'react'
import { Printer, X } from 'lucide-react'

type ComponentItem = {
  name: string
  component_type: 'Allowance' | 'Deduction'
  amount_type: string
  amount: number
  is_taxable: boolean
}

type PayrollBreakdownRow = {
  line_type: 'ALLOWANCE' | 'ATTENDANCE_DEDUCTION' | 'STATUTORY_EMPLOYEE' | 'STATUTORY_EMPLOYER' | 'OTHER_DEDUCTION'
  code: string
  name: string
  base_amount: string
  rate: string
  amount: string
  snapshot: Record<string, unknown>
}

type PayslipData = {
  id: number
  employee_name: string
  employee_id_str: string
  department_name: string
  position_name: string
  currency: string
  pay_frequency: string
  payroll_month: number
  payroll_year: number
  payroll_payment_date: string | null
  basic_salary: string
  total_allowances: string
  attendance_deduction_total: string
  statutory_deduction_total: string
  other_deduction_total: string
  employer_statutory_total: string
  total_deductions: string
  gross_salary: string
  net_salary: string
  net_payable: string
  days_worked: string
  overtime_hours: string
  posting_bucket: string
  is_blocked: boolean
  block_reason: string
  components: ComponentItem[]
  breakdown_rows: PayrollBreakdownRow[]
}

type Props = {
  payslip: PayslipData
  schoolName: string
  onClose: () => void
}

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function toNumber(value: string | number) {
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function currencyLabel(currency: string) {
  return currency === 'KES' ? 'Ksh' : currency || 'KES'
}

function fmtMoney(value: string | number, currency: string) {
  return `${currencyLabel(currency)} ${toNumber(value).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function lineTypeLabel(lineType: PayrollBreakdownRow['line_type']) {
  switch (lineType) {
    case 'ALLOWANCE':
      return 'Allowance'
    case 'ATTENDANCE_DEDUCTION':
      return 'Attendance'
    case 'STATUTORY_EMPLOYEE':
      return 'Statutory'
    case 'STATUTORY_EMPLOYER':
      return 'Employer'
    case 'OTHER_DEDUCTION':
      return 'Other'
    default:
      return lineType
  }
}

function buildFallbackRows(payslip: PayslipData): PayrollBreakdownRow[] {
  return payslip.components.map((component, index): PayrollBreakdownRow => ({
    line_type: component.component_type === 'Allowance' ? 'ALLOWANCE' : 'OTHER_DEDUCTION',
    code: '',
    name: component.name,
    base_amount: component.amount_type === 'Percentage' ? payslip.basic_salary : String(component.amount),
    rate: component.amount_type === 'Percentage' ? String(component.amount) : '0',
    amount: String(component.amount),
    snapshot: {
      amount_type: component.amount_type,
      is_taxable: component.is_taxable,
      display_order: index + 1,
    },
  }))
}

function rowBasis(row: PayrollBreakdownRow, currency: string) {
  const snapshotAmountType = typeof row.snapshot.amount_type === 'string' ? row.snapshot.amount_type : null
  if (snapshotAmountType === 'Percentage' || toNumber(row.rate) > 0) {
    return `${fmtMoney(row.base_amount, currency)} x ${toNumber(row.rate).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}%`
  }
  return fmtMoney(row.base_amount, currency)
}

export default function PayslipPrintModal({ payslip, schoolName, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const breakdownRows = payslip.breakdown_rows.length > 0 ? payslip.breakdown_rows : buildFallbackRows(payslip)
  const earningsRows = breakdownRows.filter((row) => row.line_type === 'ALLOWANCE')
  const deductionRows = breakdownRows.filter((row) => row.line_type !== 'ALLOWANCE' && row.line_type !== 'STATUTORY_EMPLOYER')
  const employerRows = breakdownRows.filter((row) => row.line_type === 'STATUTORY_EMPLOYER')
  const periodLabel = `${MONTH_NAMES[payslip.payroll_month] ?? payslip.payroll_month} ${payslip.payroll_year}`
  const currency = payslip.currency || 'KES'
  const netPay = payslip.net_payable || payslip.net_salary

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const printWindow = window.open('', '_blank', 'width=900,height=720')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Payslip - ${payslip.employee_name}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; font-size: 11px; color: #111827; background: #ffffff; }
            .print-shell { width: 100%; max-width: 820px; margin: 0 auto; padding: 24px; }
            .header-row { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #047857; padding-bottom: 12px; margin-bottom: 16px; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 10px; padding: 12px; margin-bottom: 16px; }
            .meta-card { min-width: 0; }
            .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
            .meta-value { margin-top: 2px; font-size: 11px; font-weight: 600; color: #0f172a; }
            .status-note { margin-bottom: 16px; border: 1px solid #fecaca; background: #fff1f2; border-radius: 10px; padding: 10px 12px; color: #9f1239; }
            .section-label { margin: 0 0 8px; padding: 4px 10px; border-left: 4px solid #047857; background: #f0fdf4; color: #047857; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
            .section-label.deductions { border-left-color: #be123c; background: #fff1f2; color: #be123c; }
            .section-label.employer { border-left-color: #1d4ed8; background: #eff6ff; color: #1d4ed8; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th { padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
            td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
            td:last-child, th:last-child { text-align: right; }
            .total-row { background: #f8fafc; font-weight: 700; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
            .summary-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #ffffff; }
            .summary-title { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
            .summary-value { margin-top: 6px; font-size: 16px; font-weight: 700; color: #0f172a; }
            .summary-card.net { border-color: #047857; background: #f0fdf4; }
            .summary-card.net .summary-title { color: #047857; }
            .summary-card.net .summary-value { color: #047857; }
            .footer-note { margin-top: 18px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 9px; color: #94a3b8; text-align: center; }
            @media print {
              body { margin: 0; }
              @page { size: A4; margin: 14mm; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 300)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Payslip - {payslip.employee_name}</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Printer size={13} />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div ref={printRef} className="print-shell p-6 text-slate-800">
          <div className="header-row mb-4 flex items-start justify-between border-b-2 border-emerald-700 pb-3">
            <div>
              <p className="text-xl font-bold text-emerald-700">{schoolName || 'Rynaty School Management System'}</p>
              <p className="mt-0.5 text-xs text-slate-500">Powered by Rynatyspace Technologies</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">PAYSLIP</p>
              <p className="text-xs text-slate-500">Period: {periodLabel}</p>
              <p className="text-xs text-slate-500">Frequency: {payslip.pay_frequency}</p>
              {payslip.payroll_payment_date ? (
                <p className="text-xs text-slate-500">Payment Date: {payslip.payroll_payment_date}</p>
              ) : null}
            </div>
          </div>

          <div className="meta-grid mb-4 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:grid-cols-2">
            <div className="meta-card">
              <p className="meta-label text-[9px] uppercase tracking-widest text-slate-500">Employee Name</p>
              <p className="meta-value text-xs font-semibold text-slate-800">{payslip.employee_name}</p>
            </div>
            <div className="meta-card">
              <p className="meta-label text-[9px] uppercase tracking-widest text-slate-500">Employee ID</p>
              <p className="meta-value text-xs font-semibold text-slate-800">{payslip.employee_id_str || '-'}</p>
            </div>
            <div className="meta-card">
              <p className="meta-label text-[9px] uppercase tracking-widest text-slate-500">Department</p>
              <p className="meta-value text-xs font-semibold text-slate-800">{payslip.department_name || 'Unassigned'}</p>
            </div>
            <div className="meta-card">
              <p className="meta-label text-[9px] uppercase tracking-widest text-slate-500">Position</p>
              <p className="meta-value text-xs font-semibold text-slate-800">{payslip.position_name || 'Unassigned'}</p>
            </div>
            <div className="meta-card">
              <p className="meta-label text-[9px] uppercase tracking-widest text-slate-500">Days Worked</p>
              <p className="meta-value text-xs font-semibold text-slate-800">{payslip.days_worked}</p>
            </div>
            <div className="meta-card">
              <p className="meta-label text-[9px] uppercase tracking-widest text-slate-500">Overtime Hours</p>
              <p className="meta-value text-xs font-semibold text-slate-800">{payslip.overtime_hours}</p>
            </div>
            <div className="meta-card">
              <p className="meta-label text-[9px] uppercase tracking-widest text-slate-500">Posting Bucket</p>
              <p className="meta-value text-xs font-semibold text-slate-800">{payslip.posting_bucket || 'Unmapped'}</p>
            </div>
            <div className="meta-card">
              <p className="meta-label text-[9px] uppercase tracking-widest text-slate-500">Snapshot Rows</p>
              <p className="meta-value text-xs font-semibold text-slate-800">{breakdownRows.length}</p>
            </div>
          </div>

          {payslip.is_blocked ? (
            <div className="status-note mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <p className="font-semibold">Blocked payroll item</p>
              <p className="mt-1">{payslip.block_reason || 'Payroll exception requires follow-up before approval.'}</p>
            </div>
          ) : null}

          <p className="section-label mb-2 border-l-4 border-emerald-600 bg-emerald-50 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-700">
            Earnings
          </p>
          <table className="mb-4 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-emerald-50 text-[9px] uppercase tracking-wide text-slate-500">
                <th className="border-b-2 border-emerald-200 px-2 py-2 text-left">Description</th>
                <th className="border-b-2 border-emerald-200 px-2 py-2 text-left">Basis</th>
                <th className="border-b-2 border-emerald-200 px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-2 py-1.5 font-medium text-slate-700">Basic Salary</td>
                <td className="px-2 py-1.5 text-slate-500">{fmtMoney(payslip.basic_salary, currency)}</td>
                <td className="px-2 py-1.5 text-right font-medium text-slate-800">{fmtMoney(payslip.basic_salary, currency)}</td>
              </tr>
              {earningsRows.map((row, index) => (
                <tr key={`${row.code}-${row.name}-${index}`} className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-slate-700">
                    <p>{row.name}</p>
                    {row.code ? <p className="text-[10px] text-slate-400">{row.code}</p> : null}
                  </td>
                  <td className="px-2 py-1.5 text-slate-500">{rowBasis(row, currency)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-800">{fmtMoney(row.amount, currency)}</td>
                </tr>
              ))}
              {earningsRows.length === 0 ? (
                <tr className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-slate-400" colSpan={3}>No additional earnings snapshot rows</td>
                </tr>
              ) : null}
              <tr className="total-row bg-slate-50 font-semibold">
                <td className="px-2 py-2 text-slate-700" colSpan={2}>Gross Earnings</td>
                <td className="px-2 py-2 text-right text-slate-900">{fmtMoney(payslip.gross_salary, currency)}</td>
              </tr>
            </tbody>
          </table>

          <p className="section-label deductions mb-2 border-l-4 border-rose-500 bg-rose-50 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-rose-700">
            Deductions
          </p>
          <table className="mb-4 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-rose-50 text-[9px] uppercase tracking-wide text-slate-500">
                <th className="border-b-2 border-rose-200 px-2 py-2 text-left">Description</th>
                <th className="border-b-2 border-rose-200 px-2 py-2 text-left">Category</th>
                <th className="border-b-2 border-rose-200 px-2 py-2 text-left">Basis</th>
                <th className="border-b-2 border-rose-200 px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {deductionRows.map((row, index) => (
                <tr key={`${row.code}-${row.name}-${index}`} className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-slate-700">
                    <p>{row.name}</p>
                    {row.code ? <p className="text-[10px] text-slate-400">{row.code}</p> : null}
                  </td>
                  <td className="px-2 py-1.5 text-slate-500">{lineTypeLabel(row.line_type)}</td>
                  <td className="px-2 py-1.5 text-slate-500">{rowBasis(row, currency)}</td>
                  <td className="px-2 py-1.5 text-right text-rose-700">({fmtMoney(row.amount, currency)})</td>
                </tr>
              ))}
              {deductionRows.length === 0 ? (
                <tr className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-slate-400" colSpan={4}>No deductions snapshot rows</td>
                </tr>
              ) : null}
              <tr className="total-row bg-slate-50 font-semibold">
                <td className="px-2 py-2 text-slate-700" colSpan={3}>Total Deductions</td>
                <td className="px-2 py-2 text-right text-rose-700">({fmtMoney(payslip.total_deductions, currency)})</td>
              </tr>
            </tbody>
          </table>

          <p className="section-label employer mb-2 border-l-4 border-blue-600 bg-blue-50 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-blue-700">
            Employer Contributions
          </p>
          <table className="mb-4 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-blue-50 text-[9px] uppercase tracking-wide text-slate-500">
                <th className="border-b-2 border-blue-200 px-2 py-2 text-left">Description</th>
                <th className="border-b-2 border-blue-200 px-2 py-2 text-left">Basis</th>
                <th className="border-b-2 border-blue-200 px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {employerRows.map((row, index) => (
                <tr key={`${row.code}-${row.name}-${index}`} className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-slate-700">
                    <p>{row.name}</p>
                    {row.code ? <p className="text-[10px] text-slate-400">{row.code}</p> : null}
                  </td>
                  <td className="px-2 py-1.5 text-slate-500">{rowBasis(row, currency)}</td>
                  <td className="px-2 py-1.5 text-right text-blue-700">{fmtMoney(row.amount, currency)}</td>
                </tr>
              ))}
              {employerRows.length === 0 ? (
                <tr className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-slate-400" colSpan={3}>No employer contribution rows</td>
                </tr>
              ) : null}
              <tr className="total-row bg-slate-50 font-semibold">
                <td className="px-2 py-2 text-slate-700" colSpan={2}>Employer Statutory Total</td>
                <td className="px-2 py-2 text-right text-blue-700">{fmtMoney(payslip.employer_statutory_total, currency)}</td>
              </tr>
            </tbody>
          </table>

          <div className="summary-grid mb-5 grid gap-3 sm:grid-cols-3">
            <div className="summary-card rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="summary-title text-[9px] uppercase tracking-widest text-slate-500">Statutory Employee</p>
              <p className="summary-value mt-2 text-lg font-bold text-slate-900">{fmtMoney(payslip.statutory_deduction_total, currency)}</p>
            </div>
            <div className="summary-card rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="summary-title text-[9px] uppercase tracking-widest text-slate-500">Employer Statutory</p>
              <p className="summary-value mt-2 text-lg font-bold text-slate-900">{fmtMoney(payslip.employer_statutory_total, currency)}</p>
            </div>
            <div className="summary-card net rounded-lg border-2 border-emerald-600 bg-emerald-50 px-4 py-3">
              <p className="summary-title text-[9px] uppercase tracking-widest text-emerald-700">Net Pay</p>
              <p className="summary-value mt-2 text-lg font-bold text-emerald-700">{fmtMoney(netPay, currency)}</p>
            </div>
          </div>

          <p className="footer-note mt-6 border-t border-slate-200 pt-2 text-center text-[8px] text-slate-400">
            This payslip is generated from the processed payroll snapshot and remains stable after later salary edits.
            Generated by Rynaty School Management System.
          </p>
        </div>
      </div>
    </div>
  )
}
