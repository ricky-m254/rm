import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { extractApiErrorMessage, mapApiFieldErrors } from '../../utils/forms'
import BackButton from '../../components/BackButton'
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

export default function FinanceExpenseFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [isLoading, setIsLoading] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState({
    category: '',
    amount: '',
    expense_date: '',
    description: '',
    vendor: '',
    payment_method: '',
    invoice_number: '',
    approval_status: '',
  })
  const isFormDisabled = isSubmitting || isLoading
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    let isMounted = true
    const loadExpense = async () => {
      if (!isEdit || !id) {
        setIsLoading(false)
        return
      }
      try {
        const response = await apiClient.get<Expense>(`/finance/expenses/${id}/`)
        if (isMounted) {
          setFormState({
            category: response.data.category,
            amount: String(response.data.amount),
            expense_date: response.data.expense_date,
            description: response.data.description ?? '',
            vendor: response.data.vendor ?? '',
            payment_method: response.data.payment_method ?? '',
            invoice_number: response.data.invoice_number ?? '',
            approval_status: response.data.approval_status ?? '',
          })
        }
      } catch (err) {
        if (isMounted) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          setFormError(detail ?? 'Unable to load expense.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadExpense()
    return () => {
      isMounted = false
    }
  }, [id, isEdit])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const nextErrors: Record<string, string> = {}
    if (!formState.category.trim()) nextErrors.category = 'Enter a category.'
    const amountValue = Number(formState.amount)
    if (!formState.amount || Number.isNaN(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Enter a valid amount.'
    }
    if (!formState.expense_date) nextErrors.expense_date = 'Choose an expense date.'
    if (formState.expense_date && formState.expense_date > today) {
      nextErrors.expense_date = 'Expense date cannot be in the future.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setFormError('Please correct the highlighted fields.')
      return
    }

    const payload = {
      category: formState.category.trim(),
      amount: Number(formState.amount),
      expense_date: formState.expense_date,
      description: formState.description.trim(),
      vendor: formState.vendor.trim() || undefined,
      payment_method: formState.payment_method.trim() || undefined,
      invoice_number: formState.invoice_number.trim() || undefined,
      approval_status: formState.approval_status.trim() || undefined,
    }

    setIsSubmitting(true)
    try {
      if (isEdit && id) {
        await apiClient.patch(`/finance/expenses/${id}/`, payload)
      } else {
        await apiClient.post('/finance/expenses/', payload)
      }
      navigate('/modules/finance/expenses', {
        state: { flash: isEdit ? 'Expense updated.' : 'Expense created.' },
      })
    } catch (err) {
      const nextErrors = mapApiFieldErrors(err, [
        'category',
        'amount',
        'expense_date',
        'vendor',
        'payment_method',
        'invoice_number',
        'approval_status',
      ])
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors)
        setFormError(extractApiErrorMessage(err, 'Please correct the highlighted fields.'))
        return
      }
      setFormError(extractApiErrorMessage(err, 'Unable to save expense.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <BackButton to="/modules/finance/expenses" label="Back to Expenses" />
      </div>
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title={isEdit ? 'Edit Expense' : 'Create Expense'}
        subtitle={isEdit ? 'Update an existing expense.' : 'Record a new expense.'}
        icon="💰"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading expense...</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6 lg:col-span-7">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            Category
            <input
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.category}
              aria-invalid={Boolean(fieldErrors.category)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, category: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, category: '' }))
              }}
              placeholder="Utilities"
              disabled={isFormDisabled}
            />
            {fieldErrors.category ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.category}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Amount
            <input
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.amount}
              aria-invalid={Boolean(fieldErrors.amount)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, amount: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, amount: '' }))
              }}
              placeholder="200.00"
              disabled={isFormDisabled}
            />
            {fieldErrors.amount ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.amount}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Expense Date
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.expense_date}
              aria-invalid={Boolean(fieldErrors.expense_date)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, expense_date: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, expense_date: '' }))
              }}
              disabled={isFormDisabled}
            />
            {fieldErrors.expense_date ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.expense_date}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Vendor / Payee
            <input
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.vendor}
              aria-invalid={Boolean(fieldErrors.vendor)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, vendor: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, vendor: '' }))
              }}
              placeholder="Vendor name"
              disabled={isFormDisabled}
            />
            {fieldErrors.vendor ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.vendor}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Payment Method
            <select
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={formState.payment_method}
              aria-invalid={Boolean(fieldErrors.payment_method)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, payment_method: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, payment_method: '' }))
              }}
              disabled={isFormDisabled}
            >
              <option value="">Select method</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Other">Other</option>
            </select>
            {fieldErrors.payment_method ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.payment_method}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Invoice / Receipt Number
            <input
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.invoice_number}
              aria-invalid={Boolean(fieldErrors.invoice_number)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, invoice_number: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, invoice_number: '' }))
              }}
              placeholder="INV-0001"
              disabled={isFormDisabled}
            />
            {fieldErrors.invoice_number ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.invoice_number}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Approval Status
            <select
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={formState.approval_status}
              aria-invalid={Boolean(fieldErrors.approval_status)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, approval_status: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, approval_status: '' }))
              }}
              disabled={isFormDisabled}
            >
              <option value="">Select status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            {fieldErrors.approval_status ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.approval_status}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Description
            <textarea
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.description}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              disabled={isFormDisabled}
            />
          </label>
          {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update expense' : 'Create expense'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              type="button"
              onClick={() => navigate('/modules/finance/expenses')}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
