import type { SettingDefinition, SettingValue } from '../../settings/types'

type SettingsFieldProps = {
  definition: SettingDefinition
  value: SettingValue
  onChange: (value: SettingValue) => void
  isRestricted?: boolean
}

const isNumberValue = (value: SettingValue) => typeof value === 'number'
const isStringValue = (value: SettingValue) => typeof value === 'string'

export default function SettingsField({
  definition,
  value,
  onChange,
  isRestricted = false,
}: SettingsFieldProps) {
  const description = definition.description

  if (definition.type === 'boolean') {
    const isOn = Boolean(value)
    return (
      <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-100">{definition.label}</p>
            {description ? (
              <p className="mt-1 text-xs text-slate-400">{description}</p>
            ) : null}
            {isRestricted ? (
              <span className="mt-2 inline-flex rounded-full border border-amber-400/50 px-2 py-0.5 text-[11px] text-amber-200">
                Restricted
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onChange(!isOn)}
            aria-pressed={isOn}
            className={`relative h-7 w-12 rounded-full border transition ${
              isOn
                ? 'border-emerald-400/60 bg-emerald-500/30'
                : 'border-slate-700 bg-[#0d1421]/60'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-slate-200 transition ${
                isOn ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>
    )
  }

  const inputId = `setting-${definition.key}`
  //const displayValue = isStringValue(value) || isNumberValue(value) ? value : definition.defaultValue


  const displayValue =
  isStringValue(value) || isNumberValue(value)
    ? value
    : typeof definition.defaultValue === 'boolean'
   ? ''
    : definition.defaultValue

  return (
    <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-100">
          {definition.label}
        </label>
        {isRestricted ? (
          <span className="inline-flex rounded-full border border-amber-400/50 px-2 py-0.5 text-[11px] text-amber-200">
            Restricted
          </span>
        ) : null}
      </div>
      {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
      {definition.type === 'select' ? (
        <select
          id={inputId}
          className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 focus:border-emerald-400 focus:outline-none"
          value={String(displayValue)}
          onChange={(event) => onChange(event.target.value)}
        >
          {(definition.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          type={definition.type === 'string' ? 'text' : 'number'}
          step={definition.type === 'percentage' ? '0.01' : '1'}
          className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 focus:border-emerald-400 focus:outline-none"
          value={displayValue}
          onChange={(event) => {
            if (definition.type === 'string') {
              onChange(event.target.value)
            } else {
              const numericValue = event.target.value === '' ? 0 : Number(event.target.value)
              onChange(Number.isFinite(numericValue) ? numericValue : definition.defaultValue)
            }
          }}
        />
      )}
    </div>
  )
}
