import { useCallback, useEffect, useMemo, useState } from 'react'
import { settingsSchemas } from '.'
import type { SettingDefinition, SettingValue, SettingsSchema } from './types'

const STORAGE_PREFIX = 'settings:'

const buildDefaults = (schema: SettingsSchema) =>
  schema.settings.reduce<Record<string, SettingValue>>((acc, setting) => {
    acc[setting.key] = setting.defaultValue
    return acc
  }, {})

const normalizeValue = (value: unknown, setting: SettingDefinition): SettingValue => {
  if (value === null || value === undefined) {
    return setting.defaultValue
  }

  switch (setting.type) {
    case 'boolean': {
      if (typeof value === 'boolean') return value
      if (value === 'true') return true
      if (value === 'false') return false
      return setting.defaultValue
    }
    case 'number':
    case 'percentage': {
      const numberValue = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(numberValue) ? numberValue : setting.defaultValue
    }
    case 'select': {
      const stringValue = String(value)
      const options = setting.options ?? []
      return options.some((option) => option.value === stringValue)
        ? stringValue
        : setting.defaultValue
    }
    default:
      return typeof value === 'string' ? value : setting.defaultValue
  }
}

const readFromStorage = (moduleKey: string, schema: SettingsSchema) => {
  const storageKey = `${STORAGE_PREFIX}${moduleKey}`
  const defaults = buildDefaults(schema)

  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return defaults
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return schema.settings.reduce<Record<string, SettingValue>>((acc, setting) => {
      acc[setting.key] = normalizeValue(parsed?.[setting.key], setting)
      return acc
    }, {})
  } catch {
    return defaults
  }
}

export const useModuleSettings = (moduleKey: string) => {
  const schema = settingsSchemas[moduleKey] ?? null
  const defaults = useMemo(() => (schema ? buildDefaults(schema) : {}), [schema])
  const storageKey = `${STORAGE_PREFIX}${moduleKey}`

  const [values, setValues] = useState<Record<string, SettingValue>>(() =>
    schema ? readFromStorage(moduleKey, schema) : {},
  )

  useEffect(() => {
    if (!schema) {
      setValues({})
      return
    }
    setValues(readFromStorage(moduleKey, schema))
  }, [moduleKey, schema])

  useEffect(() => {
    if (!schema) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(values))
    } catch {
      // ignore persistence failures
    }
  }, [schema, storageKey, values])

  useEffect(() => {
    if (!schema) return
    const handler = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setValues(readFromStorage(moduleKey, schema))
      }
    }
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('storage', handler)
    }
  }, [moduleKey, schema, storageKey])

  const setValue = useCallback((key: string, value: SettingValue) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => {
    setValues(defaults)
  }, [defaults])

  return {
    schema,
    values,
    setValue,
    reset,
    storageKey,
  }
}
