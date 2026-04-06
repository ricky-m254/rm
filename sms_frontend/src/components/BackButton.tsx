import { useNavigate } from 'react-router-dom'

interface Props {
  to?: string
  label?: string
  onClick?: () => void
}

export default function BackButton({ to, label = 'Back', onClick }: Props) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => {
        if (onClick) {
          onClick()
        } else if (to) {
          navigate(to)
        } else {
          navigate(-1)
        }
      }}
      className="mb-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition"
    >
      ← {label}
    </button>
  )
}
