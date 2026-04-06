import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage, mapApiFieldErrors } from '../../utils/forms'
import BackButton from '../../components/BackButton'
import { useCurrentAcademicContext } from '../../hooks/useCurrentAcademicContext'
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

type AcademicYear = {
  id: number
  name: string
}

type Term = {
  id: number
  name: string
  academic_year_id: number
}

export default function FinanceFeeStructureFormPage() {
  const { context: academicContext } = useCurrentAcademicContext()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [years, setYears] = useState<AcademicYear[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState({
    name: '',
    amount: '',
    category: '',
    academic_year: '',
    term: '',
    grade_level: '',
    is_active: true,
  })
  const isFormDisabled = isSubmitting || isLoading
  const filteredTerms = formState.academic_year
    ? terms.filter((term) => String(term.academic_year_id) === formState.academic_year)
    : terms

  useEffect(() => {
    if (academicContext && !isEdit) {
      setFormState((prev) => ({
        ...prev,
        academic_year: academicContext.academic_year?.id.toString() || '',
        term: academicContext.term?.id.toString() || '',
      }))
    }
  }, [academicContext, isEdit])

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        const [yearRes, termRes] = await Promise.all([
          apiClient.get<AcademicYear[] | { results: AcademicYear[]; count: number }>(
            '/academics/ref/academic-years/',
          ),
          apiClient.get<Term[] | { results: Term[]; count: number }>('/academics/ref/terms/'),
        ])
        if (isMounted) {
          setYears(normalizePaginatedResponse(yearRes.data).items)
          setTerms(normalizePaginatedResponse(termRes.data).items)
        }
        if (isEdit && id) {
          const feeRes = await apiClient.get<FeeStructure>(`/finance/fees/${id}/`)
          if (isMounted) {
            setFormState({
              name: feeRes.data.name,
              amount: String(feeRes.data.amount),
              category: feeRes.data.category ?? '',
              academic_year: String(feeRes.data.academic_year),
              term: String(feeRes.data.term),
              grade_level:
                feeRes.data.grade_level !== undefined && feeRes.data.grade_level !== null
                  ? String(feeRes.data.grade_level)
                  : '',
              is_active: feeRes.data.is_active,
            })
          }
        }
      } catch (err) {
        if (isMounted) {
          setFormError(extractApiErrorMessage(err, 'Unable to load fee structure data.'))
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
  }, [id, isEdit])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const nextErrors: Record<string, string> = {}
    if (!formState.name.trim()) nextErrors.name = 'Enter a fee name.'
    const amountValue = Number(formState.amount)
    if (!formState.amount || Number.isNaN(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Enter a valid amount.'
    }
    if (!formState.academic_year) nextErrors.academic_year = 'Select an academic year.'
    if (!formState.term) nextErrors.term = 'Select a term.'
    const selectedTerm = terms.find((term) => String(term.id) === formState.term)
    if (
      formState.term &&
      formState.academic_year &&
      selectedTerm &&
      String(selectedTerm.academic_year_id) !== formState.academic_year
    ) {
      nextErrors.term = 'Selected term does not belong to selected academic year.'
    }
    if (formState.grade_level) {
      const grade = Number(formState.grade_level)
      if (Number.isNaN(grade) || grade <= 0) {
        nextErrors.grade_level = 'Grade/Class level must be a positive number.'
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setFormError('Please correct the highlighted fields.')
      return
    }

    const payload = {
      name: formState.name.trim(),
      amount: Number(formState.amount),
      category: formState.category.trim() || undefined,
      academic_year: Number(formState.academic_year),
      term: Number(formState.term),
      grade_level: formState.grade_level ? Number(formState.grade_level) : undefined,
      is_active: formState.is_active,
    }

    setIsSubmitting(true)
    try {
      if (isEdit && id) {
        await apiClient.patch(`/finance/fees/${id}/`, payload)
      } else {
        await apiClient.post('/finance/fees/', payload)
      }
      navigate('/modules/finance/fee-structures', {
        state: { flash: isEdit ? 'Fee structure updated.' : 'Fee structure created.' },
      })
    } catch (err) {
      const nextErrors = mapApiFieldErrors(err, [
        'name',
        'amount',
        'category',
        'academic_year',
        'term',
        'grade_level',
      ])
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors)
        setFormError(extractApiErrorMessage(err, 'Please correct the highlighted fields.'))
        return
      }
      setFormError(extractApiErrorMessage(err, 'Unable to save fee structure.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <BackButton to="/modules/finance/fee-structures" label="Back to Fee Structures" />
      </div>
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title={isEdit ? 'Edit Fee Structure' : 'Create Fee Structure'}
        subtitle={isEdit ? 'Update an existing fee structure.' : 'Define a new fee structure.'}
        icon="💰"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading fee structure...</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6 lg:col-span-7">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            Name
            <input
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.name}
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, name: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, name: '' }))
              }}
              placeholder="Term 1 Tuition"
              disabled={isFormDisabled}
            />
            {fieldErrors.name ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.name}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.amount}
              aria-invalid={Boolean(fieldErrors.amount)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, amount: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, amount: '' }))
              }}
              placeholder="1500.00"
              disabled={isFormDisabled}
            />
            {fieldErrors.amount ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.amount}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Category
            <select
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={formState.category}
              aria-invalid={Boolean(fieldErrors.category)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, category: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, category: '' }))
              }}
              disabled={isFormDisabled}
            >
              <option value="">Select category</option>
              <option value="Tuition">Tuition</option>
              <option value="Transport">Transport</option>
              <option value="Meals">Meals</option>
              <option value="Activities">Activities</option>
              <option value="Exam Fees">Exam Fees</option>
              <option value="Technology">Technology</option>
              <option value="Other">Other</option>
            </select>
            {fieldErrors.category ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.category}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Academic Year
            <select
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={formState.academic_year}
              aria-invalid={Boolean(fieldErrors.academic_year)}
              onChange={(event) => {
                setFormState((prev) => ({
                  ...prev,
                  academic_year: event.target.value,
                  term: '',
                }))
                setFieldErrors((prev) => ({ ...prev, academic_year: '' }))
              }}
              disabled={isFormDisabled}
            >
              <option value="">Select academic year</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
            {fieldErrors.academic_year ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.academic_year}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Term
            <select
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={formState.term}
              aria-invalid={Boolean(fieldErrors.term)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, term: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, term: '' }))
              }}
              disabled={isFormDisabled}
            >
              <option value="">Select term</option>
              {filteredTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
            {fieldErrors.term ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.term}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Grade / Class Level (optional)
            <input
              type="number"
              min="1"
              step="1"
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.grade_level}
              aria-invalid={Boolean(fieldErrors.grade_level)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, grade_level: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, grade_level: '' }))
              }}
              placeholder="Grade ID"
              disabled={isFormDisabled}
            />
            {fieldErrors.grade_level ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.grade_level}</p>
            ) : null}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formState.is_active}
              onChange={(event) => setFormState((prev) => ({ ...prev, is_active: event.target.checked }))}
              disabled={isFormDisabled}
            />
            Active
          </label>
          {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update fee' : 'Create fee'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              type="button"
              onClick={() => navigate('/modules/finance/fee-structures')}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
