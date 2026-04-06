import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import {
  XCircle, MessageSquarePlus, ExternalLink, RefreshCw,
  AlertTriangle, Loader2, RotateCcw, SlidersHorizontal,
  Package, CalendarDays, BookOpen, LayoutGrid, ArrowLeft, Zap,
  Search, ChevronRight, Clock, SquareStack, X, Check, HelpCircle,
  TrendingUp, AlertCircle, UserPlus, Wrench,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaChip {
  label: string
  value: string
  color?: 'default' | 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'rose' | 'cyan'
  mono?: boolean
}

interface DetailRow {
  label: string
  value: string
  mono?: boolean
  wide?: boolean
}

interface ApprovalItem {
  id: number
  title: string
  subtitle: string
  chips: MetaChip[]
  details: DetailRow[]
  requestedBy: string
  requestedAt: string
  ageHours: number
  moduleRoute: string
  raw: Record<string, unknown>
}

interface CategoryDef {
  key: string
  label: string
  shortLabel: string
  LucideIcon: React.ElementType
  gradient: string
  borderColor: string
  glowColor: string
  textClass: string
  badgeBg: string
  badgeText: string
  listUrl: string
  moduleRoute: string
  moduleLabel: string
  approveEndpoint: (id: number) => { method: 'post' | 'patch'; url: string }
  rejectEndpoint: (id: number) => { method: 'post' | 'patch'; url: string }
  approvePayload: (notes: string) => Record<string, string>
  rejectPayload: (notes: string) => Record<string, string>
  adapter: (raw: Record<string, unknown>[]) => ApprovalItem[]
}

interface Toast { id: number; type: 'success' | 'error'; message: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageHours(iso: string | null | undefined): number {
  if (!iso) return 0
  return (Date.now() - new Date(iso).getTime()) / 3_600_000
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const h = ageHours(iso)
  if (h < 1) return 'just now'
  if (h < 24) return `${Math.floor(h)}h ago`
  if (h < 48) return 'yesterday'
  return `${Math.floor(h / 24)}d ago`
}

function fmtKsh(v: number | string | null | undefined): string {
  const n = Number(v)
  if (isNaN(n)) return '—'
  return `Ksh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
}

function asStr(v: unknown): string {
  return v == null ? '—' : String(v)
}

function studentName(s: Record<string, unknown> | null | undefined): string {
  if (!s) return '—'
  const f = asStr(s.first_name), l = asStr(s.last_name)
  return `${f} ${l}`.trim() || asStr(s.admission_number)
}

// ─── Category Definitions ─────────────────────────────────────────────────────

const CATEGORIES: CategoryDef[] = [
  {
    key: 'writeoffs',
    label: 'Finance Write-offs',
    shortLabel: 'Write-offs',
    LucideIcon: XCircle,
    gradient: 'from-rose-500/20 via-rose-500/5 to-transparent',
    borderColor: '#f43f5e',
    glowColor: 'shadow-rose-500/20',
    textClass: 'text-rose-400',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-300',
    listUrl: '/finance/write-offs/?status=PENDING&limit=50',
    moduleRoute: '/modules/finance/writeoffs',
    moduleLabel: 'Finance › Write-offs',
    approveEndpoint: (id) => ({ method: 'post', url: `/finance/write-offs/${id}/approve/` }),
    rejectEndpoint: (id) => ({ method: 'post', url: `/finance/write-offs/${id}/reject/` }),
    approvePayload: (n) => ({ review_notes: n }),
    rejectPayload: (n) => ({ review_notes: n }),
    adapter: (rows) => rows.map((r) => {
      const inv = r.invoice as Record<string, unknown> | null ?? {}
      const student = inv.student as Record<string, unknown> | null ?? null
      return {
        id: r.id as number,
        title: `Write-off — ${asStr(inv.invoice_number || r.invoice)}`,
        subtitle: `Student: ${studentName(student)}`,
        chips: [
          { label: 'Amount', value: fmtKsh(r.amount as string), color: 'red' },
          { label: 'Invoice', value: asStr(inv.invoice_number || r.invoice), mono: true },
          { label: 'Balance', value: fmtKsh(inv.balance as string), color: 'rose' },
        ],
        details: [
          { label: 'Student', value: studentName(student) },
          { label: 'Admission No.', value: asStr((student as Record<string, unknown> | null)?.admission_number) },
          { label: 'Invoice #', value: asStr(inv.invoice_number || r.invoice), mono: true },
          { label: 'Write-off Amount', value: fmtKsh(r.amount as string) },
          { label: 'Invoice Balance', value: fmtKsh(inv.balance as string) },
          { label: 'Reason', value: asStr(r.reason), wide: true },
          { label: 'Requested By', value: asStr(r.requested_by) },
          { label: 'Submitted', value: fmtDate(r.requested_at as string) },
        ],
        requestedBy: asStr(r.requested_by),
        requestedAt: asStr(r.requested_at),
        ageHours: ageHours(r.requested_at as string),
        moduleRoute: '/modules/finance',
        raw: r,
      }
    }),
  },
  {
    key: 'reversals',
    label: 'Payment Reversals',
    shortLabel: 'Reversals',
    LucideIcon: RotateCcw,
    gradient: 'from-orange-500/20 via-orange-500/5 to-transparent',
    borderColor: '#f97316',
    glowColor: 'shadow-orange-500/20',
    textClass: 'text-orange-400',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-300',
    listUrl: '/finance/payment-reversals/?status=PENDING&limit=50',
    moduleRoute: '/modules/finance/payments',
    moduleLabel: 'Finance › Payments',
    approveEndpoint: (id) => ({ method: 'post', url: `/finance/payment-reversals/${id}/approve/` }),
    rejectEndpoint: (id) => ({ method: 'post', url: `/finance/payment-reversals/${id}/reject/` }),
    approvePayload: (n) => ({ review_notes: n }),
    rejectPayload: (n) => ({ review_notes: n }),
    adapter: (rows) => rows.map((r) => {
      const pmt = r.payment as Record<string, unknown> | null ?? {}
      const student = pmt.student as Record<string, unknown> | null ?? null
      return {
        id: r.id as number,
        title: `Reversal — Rcpt ${asStr(pmt.receipt_number || pmt.reference_number || r.payment)}`,
        subtitle: `Student: ${studentName(student)}`,
        chips: [
          { label: 'Amount', value: fmtKsh(pmt.amount_paid as string), color: 'amber' },
          { label: 'Receipt', value: asStr(pmt.receipt_number || '—'), mono: true },
        ],
        details: [
          { label: 'Student', value: studentName(student) },
          { label: 'Receipt #', value: asStr(pmt.receipt_number), mono: true },
          { label: 'Reference', value: asStr(pmt.reference_number), mono: true },
          { label: 'Amount Paid', value: fmtKsh(pmt.amount_paid as string) },
          { label: 'Reversal Reason', value: asStr(r.reason), wide: true },
          { label: 'Requested By', value: asStr(r.requested_by) },
          { label: 'Submitted', value: fmtDate(r.requested_at as string) },
        ],
        requestedBy: asStr(r.requested_by),
        requestedAt: asStr(r.requested_at),
        ageHours: ageHours(r.requested_at as string),
        moduleRoute: '/modules/finance/payments',
        raw: r,
      }
    }),
  },
  {
    key: 'adjustments',
    label: 'Invoice Adjustments',
    shortLabel: 'Adjustments',
    LucideIcon: SlidersHorizontal,
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    borderColor: '#f59e0b',
    glowColor: 'shadow-amber-500/20',
    textClass: 'text-amber-400',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    listUrl: '/finance/invoice-adjustments/?status=PENDING&limit=50',
    moduleRoute: '/modules/finance/adjustments',
    moduleLabel: 'Finance › Adjustments',
    approveEndpoint: (id) => ({ method: 'post', url: `/finance/invoice-adjustments/${id}/approve/` }),
    rejectEndpoint: (id) => ({ method: 'post', url: `/finance/invoice-adjustments/${id}/reject/` }),
    approvePayload: (n) => ({ review_notes: n }),
    rejectPayload: (n) => ({ review_notes: n }),
    adapter: (rows) => rows.map((r) => {
      const inv = r.invoice as Record<string, unknown> | null ?? {}
      const student = inv.student as Record<string, unknown> | null ?? null
      return {
        id: r.id as number,
        title: `Adjustment — ${asStr(inv.invoice_number || r.invoice)}`,
        subtitle: `${asStr(r.adjustment_type || 'CREDIT')} · ${studentName(student)}`,
        chips: [
          { label: 'Type', value: asStr(r.adjustment_type || 'CREDIT'), color: 'amber' },
          { label: 'Amount', value: fmtKsh(r.amount as string), color: 'amber' },
        ],
        details: [
          { label: 'Student', value: studentName(student) },
          { label: 'Invoice #', value: asStr(inv.invoice_number || r.invoice), mono: true },
          { label: 'Adjustment Type', value: asStr(r.adjustment_type || 'CREDIT') },
          { label: 'Amount', value: fmtKsh(r.amount as string) },
          { label: 'Reason', value: asStr(r.reason), wide: true },
          { label: 'Created At', value: fmtDate(r.created_at as string) },
        ],
        requestedBy: asStr(r.created_by || r.requested_by || 'System'),
        requestedAt: asStr(r.created_at),
        ageHours: ageHours(r.created_at as string),
        moduleRoute: '/modules/finance/adjustments',
        raw: r,
      }
    }),
  },
  {
    key: 'store_orders',
    label: 'Store Orders',
    shortLabel: 'Store Orders',
    LucideIcon: Package,
    gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
    borderColor: '#06b6d4',
    glowColor: 'shadow-cyan-500/20',
    textClass: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-300',
    listUrl: '/store/orders/?status=PENDING&limit=50',
    moduleRoute: '/modules/store/orders',
    moduleLabel: 'Store › Orders',
    approveEndpoint: (id) => ({ method: 'patch', url: `/store/orders/${id}/review/` }),
    rejectEndpoint: (id) => ({ method: 'patch', url: `/store/orders/${id}/review/` }),
    approvePayload: (n) => ({ action: 'APPROVE', notes: n }),
    rejectPayload: (n) => ({ action: 'REJECT', notes: n }),
    adapter: (rows) => rows.map((r) => {
      const items = (r.items as Record<string, unknown>[] | undefined) ?? []
      const itemList = items.map((i) => asStr((i as Record<string, unknown>).item_name || '')).filter(Boolean).join(', ') || '—'
      return {
        id: r.id as number,
        title: `${asStr(r.request_code || `Order #${r.id}`)} — ${asStr(r.title || 'Store Order')}`,
        subtitle: `${items.length} item(s) · ${asStr(r.send_to || 'BOTH')}`,
        chips: [
          { label: 'Items', value: `${items.length}`, color: 'cyan' },
          { label: 'Code', value: asStr(r.request_code || `#${r.id}`), mono: true },
        ],
        details: [
          { label: 'Order Title', value: asStr(r.title) },
          { label: 'Description', value: asStr(r.description || '—'), wide: true },
          { label: 'Items Requested', value: itemList, wide: true },
          { label: 'Sent To', value: asStr(r.send_to) },
          { label: 'Request Code', value: asStr(r.request_code), mono: true },
          { label: 'Requested By', value: asStr((r.requested_by as Record<string, unknown>)?.username || r.requested_by) },
          { label: 'Date', value: fmtDate(r.created_at as string) },
        ],
        requestedBy: asStr((r.requested_by as Record<string, unknown>)?.username || r.requested_by),
        requestedAt: asStr(r.created_at),
        ageHours: ageHours(r.created_at as string),
        moduleRoute: '/modules/store/orders',
        raw: r,
      }
    }),
  },
  {
    key: 'leave',
    label: 'HR Leave Requests',
    shortLabel: 'Leave',
    LucideIcon: CalendarDays,
    gradient: 'from-blue-500/20 via-blue-500/5 to-transparent',
    borderColor: '#3b82f6',
    glowColor: 'shadow-blue-500/20',
    textClass: 'text-blue-400',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-300',
    listUrl: '/hr/leave-requests/?status=Pending&limit=50',
    moduleRoute: '/modules/hr/leave',
    moduleLabel: 'HR › Leave',
    approveEndpoint: (id) => ({ method: 'post', url: `/hr/leave-requests/${id}/approve/` }),
    rejectEndpoint: (id) => ({ method: 'post', url: `/hr/leave-requests/${id}/reject/` }),
    approvePayload: () => ({}),
    rejectPayload: (n) => ({ reason: n }),
    adapter: (rows) => rows.map((r) => {
      const emp = r.employee as Record<string, unknown> | null ?? {}
      const leaveType = r.leave_type as Record<string, unknown> | null ?? {}
      const empName = `${asStr(emp.first_name || '')} ${asStr(emp.last_name || '')}`.trim() || asStr(r.employee)
      return {
        id: r.id as number,
        title: `${asStr(leaveType.name || r.leave_type)} Leave — ${empName}`,
        subtitle: `${asStr(r.days_requested)} day(s) from ${asStr(r.start_date)}`,
        chips: [
          { label: 'Days', value: asStr(r.days_requested), color: 'blue' },
          { label: 'From', value: asStr(r.start_date), mono: true },
          { label: 'To', value: asStr(r.end_date), mono: true },
        ],
        details: [
          { label: 'Employee', value: empName },
          { label: 'Leave Type', value: asStr(leaveType.name || r.leave_type) },
          { label: 'Start Date', value: asStr(r.start_date), mono: true },
          { label: 'End Date', value: asStr(r.end_date), mono: true },
          { label: 'Days Requested', value: asStr(r.days_requested) },
          { label: 'Reason', value: asStr(r.reason || '—'), wide: true },
          { label: 'Applied On', value: fmtDate(r.created_at as string) },
        ],
        requestedBy: empName,
        requestedAt: asStr(r.created_at),
        ageHours: ageHours(r.created_at as string),
        moduleRoute: '/modules/hr/leave',
        raw: r,
      }
    }),
  },
  {
    key: 'acquisitions',
    label: 'Library Acquisitions',
    shortLabel: 'Library',
    LucideIcon: BookOpen,
    gradient: 'from-violet-500/20 via-violet-500/5 to-transparent',
    borderColor: '#8b5cf6',
    glowColor: 'shadow-violet-500/20',
    textClass: 'text-violet-400',
    badgeBg: 'bg-violet-500/15',
    badgeText: 'text-violet-300',
    listUrl: '/library/acquisition/requests/?status=Pending&limit=50',
    moduleRoute: '/modules/library/acquisitions',
    moduleLabel: 'Library › Acquisitions',
    approveEndpoint: (id) => ({ method: 'post', url: `/library/acquisition/requests/${id}/approve/` }),
    rejectEndpoint: (id) => ({ method: 'post', url: `/library/acquisition/requests/${id}/reject/` }),
    approvePayload: (n) => ({ notes: n }),
    rejectPayload: (n) => ({ notes: n }),
    adapter: (rows) => rows.map((r) => {
      const resource = r.resource as Record<string, unknown> | null ?? {}
      return {
        id: r.id as number,
        title: `${asStr(resource.title || r.resource || `Request #${r.id}`)}`,
        subtitle: `Qty ${asStr(r.quantity_requested || 1)} · Est. ${fmtKsh(r.estimated_cost as string)}`,
        chips: [
          { label: 'Qty', value: asStr(r.quantity_requested || 1) },
          { label: 'Est. Cost', value: fmtKsh(r.estimated_cost as string), color: 'violet' },
        ],
        details: [
          { label: 'Resource Title', value: asStr(resource.title || r.resource) },
          { label: 'Author', value: asStr(resource.author || '—') },
          { label: 'ISBN / Code', value: asStr(resource.isbn || resource.code || '—'), mono: true },
          { label: 'Quantity', value: asStr(r.quantity_requested || 1) },
          { label: 'Estimated Cost', value: fmtKsh(r.estimated_cost as string) },
          { label: 'Notes', value: asStr(r.notes || '—'), wide: true },
          { label: 'Requested By', value: asStr(r.requested_by) },
          { label: 'Submitted', value: fmtDate(r.requested_at as string) },
        ],
        requestedBy: asStr(r.requested_by),
        requestedAt: asStr(r.requested_at),
        ageHours: ageHours(r.requested_at as string),
        moduleRoute: '/modules/library/acquisitions',
        raw: r,
      }
    }),
  },
  {
    key: 'timetable',
    label: 'Timetable Changes',
    shortLabel: 'Timetable',
    LucideIcon: LayoutGrid,
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    borderColor: '#10b981',
    glowColor: 'shadow-emerald-500/20',
    textClass: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    listUrl: '/timetable/change-requests/?status=Pending&limit=50',
    moduleRoute: '/modules/timetable/grid',
    moduleLabel: 'Timetable',
    approveEndpoint: (id) => ({ method: 'post', url: `/timetable/change-requests/${id}/approve/` }),
    rejectEndpoint: (id) => ({ method: 'post', url: `/timetable/change-requests/${id}/reject/` }),
    approvePayload: (n) => ({ review_notes: n }),
    rejectPayload: (n) => ({ review_notes: n }),
    adapter: (rows) => rows.map((r) => {
      const reqType = asStr(r.request_type || 'Change')
      const slot = r.slot as Record<string, unknown> | null ?? {}
      const requester = r.requested_by as Record<string, unknown> | null ?? {}
      const requesterName = asStr(requester.full_name || requester.username || r.requested_by)
      return {
        id: r.id as number,
        title: `${reqType.replace(/_/g, ' ')} — ${asStr(slot.subject || slot.school_class || `Slot #${r.slot}`)}`,
        subtitle: `Requested by ${requesterName}`,
        chips: [
          { label: 'Type', value: reqType.replace(/_/g, ' '), color: 'green' },
          { label: 'Day', value: asStr(slot.day_of_week || '—') },
        ],
        details: [
          { label: 'Request Type', value: reqType.replace(/_/g, ' ') },
          { label: 'Slot', value: asStr(slot.subject || slot.school_class || `#${r.slot}`) },
          { label: 'Day of Week', value: asStr(slot.day_of_week || '—') },
          { label: 'Proposed Time', value: `${asStr(r.proposed_start_time || '—')} – ${asStr(r.proposed_end_time || '—')}`, mono: true },
          { label: 'Reason', value: asStr(r.reason || '—'), wide: true },
          { label: 'Requested By', value: requesterName },
          { label: 'Submitted', value: fmtDate(r.created_at as string) },
        ],
        requestedBy: requesterName,
        requestedAt: asStr(r.created_at),
        ageHours: ageHours(r.created_at as string),
        moduleRoute: '/modules/timetable/grid',
        raw: r,
      }
    }),
  },
  // ─── Admissions Applications ────────────────────────────────────────────────
  {
    key: 'admissions',
    label: 'Admissions',
    shortLabel: 'Admissions',
    LucideIcon: UserPlus,
    gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
    borderColor: '#06b6d4',
    glowColor: 'shadow-cyan-500/20',
    textClass: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-300',
    listUrl: '/admissions/applications/?status=Submitted&limit=50',
    moduleRoute: '/modules/admissions',
    moduleLabel: 'Admissions',
    approveEndpoint: (id) => ({ method: 'patch', url: `/admissions/applications/${id}/` }),
    rejectEndpoint: (id) => ({ method: 'patch', url: `/admissions/applications/${id}/` }),
    approvePayload: (n) => ({ status: 'Admitted', review_notes: n }),
    rejectPayload: (n) => ({ status: 'Rejected', review_notes: n }),
    adapter: (rows) => rows.map((r) => {
      const firstName = asStr(r.student_first_name)
      const lastName = asStr(r.student_last_name)
      const fullName = `${firstName} ${lastName}`.trim()
      const appNum = asStr(r.application_number || `APP-${r.id}`)
      const desiredClass = asStr(r.desired_class || '—')
      const parentName = asStr(r.parent_name || '—')
      const parentPhone = asStr(r.parent_phone || '—')
      return {
        id: r.id as number,
        title: `${fullName} — ${desiredClass} Admission`,
        subtitle: `Application ${appNum} · Parent: ${parentName}`,
        chips: [
          { label: 'App #', value: appNum, mono: true, color: 'cyan' },
          { label: 'Class', value: desiredClass, color: 'blue' },
          { label: 'Status', value: asStr(r.status), color: 'amber' },
        ],
        details: [
          { label: 'Applicant', value: fullName },
          { label: 'Application No.', value: appNum, mono: true },
          { label: 'Gender', value: asStr(r.student_gender || '—') },
          { label: 'Date of Birth', value: asStr(r.date_of_birth || '—') },
          { label: 'Desired Class', value: desiredClass },
          { label: 'Parent / Guardian', value: parentName },
          { label: 'Parent Phone', value: parentPhone, mono: true },
          { label: 'Parent Email', value: asStr(r.parent_email || '—') },
          { label: 'Current Status', value: asStr(r.status || '—') },
          { label: 'Applied On', value: fmtDate(r.created_at as string) },
        ],
        requestedBy: parentName,
        requestedAt: asStr(r.created_at),
        ageHours: ageHours(r.created_at as string),
        moduleRoute: '/modules/admissions',
        raw: r,
      }
    }),
  },
  // ─── Maintenance Requests ───────────────────────────────────────────────────
  {
    key: 'maintenance',
    label: 'Maintenance',
    shortLabel: 'Maintenance',
    LucideIcon: Wrench,
    gradient: 'from-orange-500/20 via-orange-500/5 to-transparent',
    borderColor: '#f97316',
    glowColor: 'shadow-orange-500/20',
    textClass: 'text-orange-400',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-300',
    listUrl: '/maintenance/requests/?status=Pending&limit=50',
    moduleRoute: '/modules/maintenance',
    moduleLabel: 'Maintenance',
    approveEndpoint: (id) => ({ method: 'patch', url: `/maintenance/requests/${id}/` }),
    rejectEndpoint: (id) => ({ method: 'patch', url: `/maintenance/requests/${id}/` }),
    approvePayload: (n) => ({ status: 'Approved', notes: n }),
    rejectPayload: (n) => ({ status: 'Rejected', notes: n }),
    adapter: (rows) => rows.map((r) => {
      const category = r.category as Record<string, unknown> | null ?? {}
      const catName = asStr(category.name || '—')
      const assignedTo = r.assigned_to as Record<string, unknown> | null ?? {}
      const assigneeName = asStr(assignedTo.full_name || assignedTo.first_name || '—')
      const reporter = r.reported_by as Record<string, unknown> | null ?? {}
      const reporterName = asStr(reporter.full_name || reporter.username || r.reported_by)
      return {
        id: r.id as number,
        title: asStr(r.title || `Maintenance Request #${r.id}`),
        subtitle: `${catName} · ${asStr(r.location || '—')}`,
        chips: [
          { label: 'Priority', value: asStr(r.priority || '—'), color: r.priority === 'Urgent' ? 'red' : r.priority === 'High' ? 'amber' : 'default' },
          { label: 'Category', value: catName, color: 'amber' },
        ],
        details: [
          { label: 'Title', value: asStr(r.title), wide: true },
          { label: 'Description', value: asStr(r.description || '—'), wide: true },
          { label: 'Category', value: catName },
          { label: 'Priority', value: asStr(r.priority || '—') },
          { label: 'Location', value: asStr(r.location || '—') },
          { label: 'Cost Estimate', value: fmtKsh(r.cost_estimate as string | number | null | undefined) },
          { label: 'Assigned To', value: assigneeName },
          { label: 'Reported By', value: reporterName },
          { label: 'Due Date', value: asStr(r.due_date || 'Not set') },
          { label: 'Submitted', value: fmtDate(r.created_at as string) },
        ],
        requestedBy: reporterName,
        requestedAt: asStr(r.created_at),
        ageHours: ageHours(r.created_at as string),
        moduleRoute: '/modules/maintenance',
        raw: r,
      }
    }),
  },
]

// ─── Toast System ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-sm pointer-events-auto
            transition-all duration-300 min-w-[260px] max-w-[360px]
            ${t.type === 'success'
              ? 'bg-[#0d1421]/95 border-emerald-500/40 shadow-emerald-500/10'
              : 'bg-[#0d1421]/95 border-red-500/40 shadow-red-500/10'}`}
        >
          <div className={`flex-shrink-0 rounded-full p-1 ${t.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            {t.type === 'success'
              ? <Check size={12} className="text-emerald-400" />
              : <AlertCircle size={12} className="text-red-400" />
            }
          </div>
          <p className="flex-1 text-xs font-medium text-slate-200">{t.message}</p>
          <button onClick={() => onDismiss(t.id)} className="text-slate-600 hover:text-slate-400 flex-shrink-0">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Urgency badge ────────────────────────────────────────────────────────────

function UrgencyBadge({ hours }: { hours: number }) {
  if (hours >= 72) return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-red-500" />
      </span>
      {Math.floor(hours / 24)}d overdue
    </span>
  )
  if (hours >= 24) return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Clock size={9} />
      {Math.floor(hours / 24)}d old
    </span>
  )
  return (
    <span className="text-[10px] text-slate-600">{fmtRelative(new Date(Date.now() - hours * 3_600_000).toISOString())}</span>
  )
}

// ─── Item Row (in list pane) ──────────────────────────────────────────────────

function ItemRow({
  item, category, selected, onSelect, dismissed,
}: {
  item: ApprovalItem
  category: CategoryDef
  selected: boolean
  onSelect: () => void
  dismissed: boolean
}) {
  if (dismissed) return null

  return (
    <button
      onClick={onSelect}
      className={`group w-full text-left transition-all duration-150 relative overflow-hidden
        border-l-[3px] px-3 py-3 hover:bg-white/[0.025]
        ${selected ? 'bg-white/[0.035]' : 'bg-transparent'}`}
      style={{ borderLeftColor: selected ? category.borderColor : 'transparent' }}
    >
      {/* subtle gradient on hover/selected */}
      {selected && (
        <div className={`absolute inset-0 bg-gradient-to-r ${category.gradient} pointer-events-none`} />
      )}
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold leading-tight ${selected ? 'text-white' : 'text-slate-300 group-hover:text-white'} line-clamp-1`}>
            {item.title}
          </p>
          <div className="flex-shrink-0 mt-0.5">
            <UrgencyBadge hours={item.ageHours} />
          </div>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{item.subtitle}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[10px] font-medium ${category.textClass}`}>{item.chips[0]?.value}</span>
          <span className="text-[10px] text-slate-700">·</span>
          <span className="text-[10px] text-slate-600">{item.requestedBy}</span>
        </div>
      </div>
      {selected && <ChevronRight size={12} className={`absolute right-2 top-1/2 -translate-y-1/2 ${category.textClass}`} />}
    </button>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  item, category, onAction, navigate,
}: {
  item: ApprovalItem | null
  category: CategoryDef | null
  onAction: (id: number, action: 'approve' | 'clarify' | 'reject', notes: string) => Promise<void>
  navigate: (path: string) => void
}) {
  const [mode, setMode] = useState<'idle' | 'approving' | 'clarifying' | 'rejecting' | 'submitting'>('idle')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  // Reset on item change
  useEffect(() => {
    setMode('idle'); setNotes(''); setError(null)
  }, [item?.id, item?.title])

  if (!item || !category) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="rounded-3xl bg-white/[0.025] p-8 mb-4">
          <SquareStack size={36} className="text-slate-600 mx-auto" />
        </div>
        <p className="text-sm font-semibold text-slate-400 mb-1">Select an item to review</p>
        <p className="text-xs text-slate-600 max-w-[220px]">Click any pending item from the list to see its full details and take action</p>
      </div>
    )
  }

  async function submit(action: 'approve' | 'clarify' | 'reject') {
    if (action !== 'approve' && !notes.trim()) {
      notesRef.current?.focus()
      setError('Please enter a note before submitting.')
      return
    }
    setMode('submitting')
    setError(null)
    try {
      await onAction(item!.id, action, notes)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed — please try again.')
      setMode(action === 'approve' ? 'approving' : action === 'clarify' ? 'clarifying' : 'rejecting')
    }
  }

  const submitting = mode === 'submitting'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={`flex-shrink-0 bg-gradient-to-br ${category.gradient} border-b border-white/5 px-5 pt-5 pb-4`}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 rounded-xl p-2.5 ${category.badgeBg}`}>
            <category.LucideIcon size={18} className={category.textClass} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${category.badgeBg} ${category.badgeText}`}>
              {category.shortLabel}
            </div>
            <h2 className="text-base font-bold text-white leading-snug">{item.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
          </div>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {item.chips.map(chip => (
            <div key={chip.label} className="rounded-xl glass-panel border border-white/10 px-3 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">{chip.label}</p>
              <p className={`text-xs font-bold ${chip.mono ? 'font-mono' : ''} text-slate-200`}>{chip.value}</p>
            </div>
          ))}
          <div className="rounded-xl glass-panel border border-white/10 px-3 py-1.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">Age</p>
            <UrgencyBadge hours={item.ageHours} />
          </div>
        </div>
      </div>

      {/* Scrollable detail body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">

        {/* Detail grid */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.07]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Full Details</p>
          </div>
          <dl className="grid grid-cols-2 gap-px bg-slate-800">
            {item.details.map(d => (
              <div key={d.label} className={`bg-white/[0.03] px-4 py-3 ${d.wide ? 'col-span-2' : ''}`}>
                <dt className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">{d.label}</dt>
                <dd className={`text-xs text-slate-200 leading-relaxed ${d.mono ? 'font-mono' : ''}`}>{d.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Submitter info */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-400">
            {(item.requestedBy[0] || '?').toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-300">Submitted by {item.requestedBy}</p>
            <p className="text-[11px] text-slate-600">{fmtDate(item.requestedAt)}</p>
          </div>
          <div className="ml-auto">
            <UrgencyBadge hours={item.ageHours} />
          </div>
        </div>

        {/* Module link */}
        <button
          onClick={() => navigate(item.moduleRoute)}
          className="w-full flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left hover:border-white/[0.09] hover:bg-white/[0.03] transition group"
        >
          <ExternalLink size={13} className="text-slate-500 group-hover:text-slate-300" />
          <span className="text-xs text-slate-500 group-hover:text-slate-300 transition">View in {category.moduleLabel}</span>
          <ChevronRight size={12} className="ml-auto text-slate-700 group-hover:text-slate-500" />
        </button>

        {/* Notes area — for clarify/reject modes */}
        {(mode === 'approving' || mode === 'clarifying' || mode === 'rejecting') && (
          <div className={`rounded-2xl border p-4 ${
            mode === 'approving' ? 'border-emerald-500/30 bg-emerald-500/5'
            : mode === 'clarifying' ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-red-500/30 bg-red-500/5'
          }`}>
            <p className={`text-xs font-semibold mb-2 ${
              mode === 'approving' ? 'text-emerald-400'
              : mode === 'clarifying' ? 'text-amber-400'
              : 'text-red-400'
            }`}>
              {mode === 'approving' ? '✓ Add an optional note for approval' : mode === 'clarifying' ? '↩ What clarification is needed?' : '✗ Reason for rejection'}
            </p>
            <textarea
              ref={notesRef}
              value={notes}
              onChange={e => { setNotes(e.target.value); setError(null) }}
              placeholder={mode === 'approving' ? 'Optional note (e.g. verified with finance team)…' : 'Please provide a clear explanation…'}
              rows={3}
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:border-slate-500 focus:outline-none resize-none"
              autoFocus
            />
            {error && (
              <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
                <AlertCircle size={10} /> {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="flex-shrink-0 border-t border-white/[0.07] bg-slate-950/80 backdrop-blur-sm p-4">
        {mode === 'idle' && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setMode('approving')}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 px-2 py-3 hover:bg-emerald-500/25 hover:border-emerald-400/50 transition group"
            >
              <div className="rounded-full bg-emerald-500/20 p-1.5 group-hover:bg-emerald-500/30 transition">
                <Check size={14} className="text-emerald-400" />
              </div>
              <span className="text-[11px] font-bold text-emerald-400">Approve</span>
            </button>
            <button
              onClick={() => setMode('clarifying')}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 px-2 py-3 hover:bg-amber-500/25 hover:border-amber-400/50 transition group"
            >
              <div className="rounded-full bg-amber-500/20 p-1.5 group-hover:bg-amber-500/30 transition">
                <HelpCircle size={14} className="text-amber-400" />
              </div>
              <span className="text-[11px] font-bold text-amber-400">Clarify</span>
            </button>
            <button
              onClick={() => setMode('rejecting')}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-red-500/15 border border-red-500/30 px-2 py-3 hover:bg-red-500/25 hover:border-red-400/50 transition group"
            >
              <div className="rounded-full bg-red-500/20 p-1.5 group-hover:bg-red-500/30 transition">
                <X size={14} className="text-red-400" />
              </div>
              <span className="text-[11px] font-bold text-red-400">Reject</span>
            </button>
          </div>
        )}

        {(mode === 'approving' || mode === 'clarifying' || mode === 'rejecting') && (
          <div className="flex gap-2">
            <button
              onClick={() => { setMode('idle'); setNotes(''); setError(null) }}
              disabled={submitting}
              className="rounded-xl border border-white/[0.09] px-3 py-2.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition flex-shrink-0 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={() => void submit(mode as 'approve' | 'clarify' | 'reject')}
              disabled={submitting}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition disabled:opacity-50 ${
                mode === 'approving'
                  ? 'bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-400'
                  : mode === 'clarifying'
                    ? 'bg-amber-500 border-amber-400 text-slate-950 hover:bg-amber-400'
                    : 'bg-red-500 border-red-400 text-white hover:bg-red-400'
              }`}
            >
              {submitting
                ? <Loader2 size={13} className="animate-spin" />
                : mode === 'approving'
                  ? <><Check size={13} /> Confirm Approval</>
                  : mode === 'clarifying'
                    ? <><MessageSquarePlus size={13} /> Send Clarification</>
                    : <><XCircle size={13} /> Confirm Rejection</>
              }
            </button>
          </div>
        )}

        {mode === 'submitting' && (
          <div className="flex items-center justify-center gap-2 py-2.5">
            <Loader2 size={14} className="animate-spin text-emerald-400" />
            <span className="text-xs text-slate-400">Processing…</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

let _toastId = 0

export default function ApprovalsHubPage() {
  const navigate = useNavigate()

  // Category data state
  const [data, setData] = useState<Record<string, ApprovalItem[]>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // UI state
  const [activeKey, setActiveKey] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<{ key: string; id: number } | null>(null)
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mobileDetail, setMobileDetail] = useState(false)

  function addToast(type: 'success' | 'error', message: string) {
    const id = ++_toastId
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  const loadCategory = useCallback(async (cat: CategoryDef) => {
    setLoading(prev => ({ ...prev, [cat.key]: true }))
    setErrors(prev => ({ ...prev, [cat.key]: null }))
    try {
      const res = await apiClient.get<unknown>(cat.listUrl)
      const raw = res.data as Record<string, unknown>
      const rows = Array.isArray(raw) ? raw as Record<string, unknown>[]
        : (Array.isArray(raw.results) ? raw.results as Record<string, unknown>[] : [])
      const items = cat.adapter(rows)
      setData(prev => ({ ...prev, [cat.key]: items }))
      setCounts(prev => ({ ...prev, [cat.key]: items.length }))
    } catch {
      setErrors(prev => ({ ...prev, [cat.key]: 'Could not load — check module access.' }))
      setData(prev => ({ ...prev, [cat.key]: [] }))
      setCounts(prev => ({ ...prev, [cat.key]: 0 }))
    } finally {
      setLoading(prev => ({ ...prev, [cat.key]: false }))
    }
  }, [])

  useEffect(() => {
    CATEGORIES.forEach(cat => void loadCategory(cat))
  }, [loadCategory])

  // Build "all" view across categories
  const allItems: { item: ApprovalItem; category: CategoryDef }[] = CATEGORIES.flatMap(cat =>
    (data[cat.key] ?? []).map(item => ({ item, category: cat }))
  ).sort((a, b) => b.item.ageHours - a.item.ageHours)

  const totalPending = Object.entries(counts).reduce((a, [, v]) => a + v, 0)
    - [...dismissed].filter(k => CATEGORIES.some(c => k.startsWith(c.key))).length
  const overdueCount = allItems.filter(({ item }) => item.ageHours >= 72 && !dismissed.has(`${CATEGORIES.find(c => c.key)?.key}:${item.id}`)).length

  // Derive visible items
  const activeCategory = CATEGORIES.find(c => c.key === activeKey) ?? null
  const visibleItems: { item: ApprovalItem; category: CategoryDef }[] = activeKey === 'all'
    ? allItems
    : (data[activeKey] ?? []).map(item => ({ item, category: activeCategory! }))

  const filtered = search.trim()
    ? visibleItems.filter(({ item }) =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.requestedBy.toLowerCase().includes(search.toLowerCase()) ||
        item.chips.some(c => c.value.toLowerCase().includes(search.toLowerCase()))
      )
    : visibleItems

  // Selected item resolution
  const selectedEntry = selectedId
    ? (visibleItems.find(({ item, category }) => item.id === selectedId.id && category.key === selectedId.key) ?? null)
    : null

  async function handleAction(catKey: string, itemId: number, action: 'approve' | 'clarify' | 'reject', notes: string) {
    const cat = CATEGORIES.find(c => c.key === catKey)
    if (!cat) return
    const ep = action === 'approve' ? cat.approveEndpoint(itemId) : cat.rejectEndpoint(itemId)
    const payload = action === 'approve'
      ? cat.approvePayload(notes)
      : action === 'reject'
        ? cat.rejectPayload(notes)
        : cat.rejectPayload(notes ? `[Clarification Requested] ${notes}` : '[Clarification Requested]')
    try {
      if (ep.method === 'post') await apiClient.post(ep.url, payload)
      else await apiClient.patch(ep.url, payload)

      const key = `${catKey}:${itemId}`
      setDismissed(prev => new Set([...prev, key]))
      setData(prev => ({ ...prev, [catKey]: (prev[catKey] ?? []).filter(i => i.id !== itemId) }))
      setCounts(prev => ({ ...prev, [catKey]: Math.max(0, (prev[catKey] ?? 1) - 1) }))
      setSelectedId(null)
      setMobileDetail(false)

      const actionLabel = action === 'approve' ? 'Approved' : action === 'clarify' ? 'Clarification sent' : 'Rejected'
      addToast('success', `${actionLabel} successfully.`)
    } catch (e: unknown) {
      const axiosErr = e as { response?: { data?: { detail?: string; error?: string } } }
      const serverMsg = axiosErr?.response?.data?.detail || axiosErr?.response?.data?.error
      addToast('error', serverMsg || (e instanceof Error ? e.message : 'Action failed. Try again.'))
      throw e
    }
  }

  const isLoading = Object.values(loading).some(Boolean)

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* ── Top Header ──────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 h-13 py-2.5">
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-xl border border-white/[0.07] p-1.5 text-slate-500 hover:text-slate-300 hover:border-white/[0.09] transition flex-shrink-0"
          >
            <ArrowLeft size={14} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 p-2 border border-amber-500/20">
              <Zap size={15} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">Approvals</h1>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-none">Command Center</p>
            </div>
          </div>

          {/* Stats pills */}
          <div className="ml-2 hidden sm:flex items-center gap-2">
            {totalPending > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-2.5 py-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-amber-400" />
                </span>
                <span className="text-[11px] font-bold text-amber-400">{totalPending} pending</span>
              </div>
            )}
            {overdueCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 px-2.5 py-1">
                <AlertTriangle size={10} className="text-red-400" />
                <span className="text-[11px] font-bold text-red-400">{overdueCount} overdue</span>
              </div>
            )}
          </div>

          <div className="flex-1" />

          <button
            onClick={() => CATEGORIES.forEach(cat => void loadCategory(cat))}
            disabled={isLoading}
            className="rounded-xl border border-white/[0.07] p-1.5 text-slate-500 hover:text-slate-300 hover:border-white/[0.09] transition disabled:opacity-40"
            title="Refresh all"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Category tabs — horizontal scroll */}
        <div className="flex items-center gap-0 px-1 overflow-x-auto scrollbar-none border-t border-white/[0.06]">
          {/* All tab */}
          <button
            onClick={() => { setActiveKey('all'); setSelectedId(null) }}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold border-b-2 transition whitespace-nowrap ${
              activeKey === 'all'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/[0.09]'
            }`}
          >
            <SquareStack size={11} />
            All
            {totalPending > 0 && (
              <span className={`rounded-full min-w-[16px] px-1 py-0.5 text-[9px] font-bold text-center ${
                activeKey === 'all' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>{totalPending}</span>
            )}
          </button>

          {CATEGORIES.map(cat => {
            const count = counts[cat.key] ?? 0
            const active = cat.key === activeKey
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveKey(cat.key); setSelectedId(null) }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold border-b-2 transition whitespace-nowrap ${
                  active ? `border-[${cat.borderColor}] ${cat.textClass}` : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/[0.09]'
                }`}
                style={active ? { borderBottomColor: cat.borderColor } : {}}
              >
                <cat.LucideIcon size={11} className={active ? cat.textClass : ''} />
                {cat.shortLabel}
                {count > 0 && (
                  <span className={`rounded-full min-w-[16px] px-1 py-0.5 text-[9px] font-bold text-center ${
                    active ? `${cat.badgeBg} ${cat.badgeText}` : 'bg-slate-800 text-slate-500'
                  }`}>{count}</span>
                )}
                {loading[cat.key] && <Loader2 size={9} className="animate-spin text-slate-600" />}
              </button>
            )
          })}
        </div>
      </header>

      {/* ── Main body: list + detail ────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Item List Pane */}
        <div className={`flex flex-col border-r border-white/[0.06] bg-slate-950 overflow-hidden
          ${mobileDetail ? 'hidden md:flex' : 'flex'}
          w-full md:w-[320px] lg:w-[360px] xl:w-[400px] flex-shrink-0`}>

          {/* List header: search + count */}
          <div className="flex-shrink-0 border-b border-white/[0.06] px-3 py-2.5">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search items, names, codes…"
                className="w-full rounded-xl glass-panel pl-8 pr-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:border-slate-600 focus:outline-none focus:bg-[#0d1421]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                  <X size={11} />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5 px-1">
              {filtered.length} item{filtered.length !== 1 ? 's' : ''} {search ? 'matched' : activeKey === 'all' ? 'across all categories' : `in ${activeCategory?.shortLabel}`}
            </p>
          </div>

          {/* List body */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 divide-y divide-slate-800/50">
            {/* Loading skeleton */}
            {isLoading && filtered.length === 0 && (
              <div className="p-3 space-y-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-lg px-3 py-3 animate-pulse">
                    <div className="h-3 bg-slate-800 rounded w-3/4 mb-1.5" />
                    <div className="h-2.5 bg-white/[0.035] rounded w-1/2 mb-2" />
                    <div className="flex gap-2">
                      <div className="h-4 w-14 bg-white/[0.025] rounded-full" />
                      <div className="h-4 w-10 bg-white/[0.025] rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error states per category */}
            {!isLoading && activeKey !== 'all' && errors[activeKey] && (
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <AlertTriangle size={20} className="text-red-400" />
                <p className="text-xs text-slate-500">{errors[activeKey]}</p>
                <button
                  onClick={() => activeCategory && void loadCategory(activeCategory)}
                  className="text-[11px] text-slate-500 hover:text-slate-300 underline"
                >Retry</button>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && filtered.length === 0 && !errors[activeKey] && (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <div className="rounded-2xl glass-panel p-5">
                  <TrendingUp size={22} className="text-emerald-500 mx-auto" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-400">
                    {search ? 'No results found' : 'All clear!'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {search ? 'Try a different search term' : 'No pending items to review'}
                  </p>
                </div>
              </div>
            )}

            {/* Actual items */}
            {filtered.map(({ item, category: cat }) => (
              <ItemRow
                key={`${cat.key}:${item.id}`}
                item={item}
                category={cat}
                selected={selectedId?.id === item.id && selectedId?.key === cat.key}
                dismissed={dismissed.has(`${cat.key}:${item.id}`)}
                onSelect={() => {
                  setSelectedId({ key: cat.key, id: item.id })
                  setMobileDetail(true)
                }}
              />
            ))}
          </div>
        </div>

        {/* Detail Pane */}
        <div className={`flex-1 overflow-hidden bg-slate-950/50
          ${mobileDetail ? 'flex flex-col' : 'hidden md:flex flex-col'}`}>

          {/* Mobile back button */}
          {mobileDetail && (
            <div className="flex-shrink-0 border-b border-white/[0.06] px-3 py-2 md:hidden">
              <button
                onClick={() => setMobileDetail(false)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
              >
                <ArrowLeft size={12} /> Back to list
              </button>
            </div>
          )}

          <DetailPanel
            item={selectedEntry?.item ?? null}
            category={selectedEntry?.category ?? null}
            onAction={async (id, action, notes) => {
              if (selectedEntry) {
                await handleAction(selectedEntry.category.key, id, action, notes)
              }
            }}
            navigate={navigate}
          />
        </div>
      </div>
    </div>
  )
}
