import type { ReactNode } from 'react'

type ConfirmDialogProps = {
  open?: boolean
  isOpen?: boolean
  title: string
  description?: ReactNode
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  isProcessing?: boolean
  isLoading?: boolean
  variant?: 'default' | 'danger'
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  isOpen,
  title,
  description,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isProcessing = false,
  isLoading = false,
  variant = 'default',
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const resolvedOpen = open ?? isOpen ?? false
  const resolvedDescription = description ?? message ?? ''
  const resolvedProcessing = isProcessing || isLoading
  const confirmButtonClassName = variant === 'danger'
    ? 'rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70'
    : 'rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70'

  if (!resolvedOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <h3 className="text-lg font-display font-semibold">{title}</h3>
        <div className="mt-2 text-sm text-slate-400">{resolvedDescription}</div>
        {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className={confirmButtonClassName}
            onClick={onConfirm}
            disabled={resolvedProcessing}
          >
            {resolvedProcessing ? 'Processing...' : confirmLabel}
          </button>
          <button
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
            onClick={onCancel}
            disabled={resolvedProcessing}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
