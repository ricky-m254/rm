import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { Shield, ChevronDown, ChevronRight, Check, AlertCircle, Users, Lock, Info } from 'lucide-react'
import PageHero from '../../components/PageHero'
import {
  getRoleDescription,
  getRoleMeta,
  getRoleShortLabel,
  getRoleSortOrder,
  isAdminFamilyRole,
  ROLE_REFERENCE_ORDER,
} from '../../lib/roleCatalog'

type ModuleInfo = { key: string; name: string }
type RoleData = { id: number; name: string; description: string; user_count: number; assigned_module_keys: string[]; editable: boolean }
type ApiPayload = { roles: RoleData[]; all_modules: ModuleInfo[] }

interface SubmodulePerm { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; can_approve: boolean }
type PermMatrix = Record<string, Record<string, Record<string, SubmodulePerm>>>

const SUBMODULE_DEFS: Record<string, { label: string; submodules: { key: string; label: string }[] }> = {
  STUDENTS: { label: 'Student Management', submodules: [
    { key: 'student_records', label: 'Student Records' }, { key: 'admissions', label: 'Admissions' },
    { key: 'attendance', label: 'Attendance' }, { key: 'documents', label: 'Documents' }, { key: 'reports', label: 'Reports' },
  ]},
  ACADEMICS: { label: 'Academics', submodules: [
    { key: 'subjects', label: 'Subjects & Classes' }, { key: 'assignments', label: 'Assignments' },
    { key: 'grades', label: 'Grades' }, { key: 'curriculum', label: 'Curriculum' },
  ]},
  EXAMINATIONS: { label: 'Examinations', submodules: [
    { key: 'exam_setup', label: 'Exam Setup' }, { key: 'marks_entry', label: 'Marks Entry' },
    { key: 'results', label: 'Results' }, { key: 'report_cards', label: 'Report Cards' },
  ]},
  FINANCE: { label: 'Finance', submodules: [
    { key: 'fee_setup', label: 'Fee Setup' }, { key: 'invoices', label: 'Invoices' },
    { key: 'payments', label: 'Payments' }, { key: 'refunds', label: 'Refunds' }, { key: 'reports', label: 'Financial Reports' },
  ]},
  HR: { label: 'Human Resources', submodules: [
    { key: 'staff_records', label: 'Staff Records' }, { key: 'payroll', label: 'Payroll' },
    { key: 'leave', label: 'Leave Management' }, { key: 'recruitment', label: 'Recruitment' },
    { key: 'career_events', label: 'Career Events' }, { key: 'discipline', label: 'Discipline' },
    { key: 'exits', label: 'Exits & Archive' },
  ]},
  LIBRARY: { label: 'Library', submodules: [
    { key: 'books', label: 'Books Catalog' }, { key: 'borrowing', label: 'Borrowing' },
    { key: 'returns', label: 'Returns' }, { key: 'fines', label: 'Fines' },
  ]},
  COMMUNICATION: { label: 'Communication', submodules: [
    { key: 'email', label: 'Email Campaigns' }, { key: 'sms', label: 'SMS' },
    { key: 'whatsapp', label: 'WhatsApp' }, { key: 'templates', label: 'Templates' }, { key: 'announcements', label: 'Announcements' },
  ]},
  TRANSPORT: { label: 'Transport', submodules: [
    { key: 'routes', label: 'Routes & Stops' }, { key: 'vehicles', label: 'Vehicles' },
    { key: 'allocation', label: 'Student Allocation' }, { key: 'fees', label: 'Transport Fees' },
  ]},
  HOSTEL: { label: 'Hostel', submodules: [
    { key: 'rooms', label: 'Rooms' }, { key: 'allocation', label: 'Allocation' }, { key: 'fees', label: 'Hostel Fees' },
  ]},
}

const PERM_COLS: { key: keyof SubmodulePerm; label: string; color: string }[] = [
  { key: 'can_view', label: 'View', color: 'text-sky-400' },
  { key: 'can_create', label: 'Create', color: 'text-emerald-400' },
  { key: 'can_edit', label: 'Edit', color: 'text-amber-400' },
  { key: 'can_delete', label: 'Delete', color: 'text-rose-400' },
  { key: 'can_approve', label: 'Approve', color: 'text-violet-400' },
]

const defaultPerm = (): SubmodulePerm => ({ can_view: true, can_create: false, can_edit: false, can_delete: false, can_approve: false })

function buildDefaultMatrix(): PermMatrix {
  const matrix: PermMatrix = {}
  for (const roleKey of ROLE_REFERENCE_ORDER) {
    matrix[roleKey] = {}
    for (const [modKey, modDef] of Object.entries(SUBMODULE_DEFS)) {
      matrix[roleKey][modKey] = {}
      const isAdmin = isAdminFamilyRole(roleKey)
      for (const sub of modDef.submodules) {
        matrix[roleKey][modKey][sub.key] = {
          can_view: true,
          can_create: isAdmin,
          can_edit: isAdmin,
          can_delete: isAdmin,
          can_approve: isAdmin,
        }
      }
    }
  }
  return matrix
}

export default function SettingsRolesPage() {
  const [payload, setPayload] = useState<ApiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'modules' | 'submodules'>('modules')
  const [selectedRole, setSelectedRole] = useState<string>('PRINCIPAL')
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['FINANCE', 'STUDENTS', 'EXAMINATIONS']))
  const [permMatrix, setPermMatrix] = useState<PermMatrix>(buildDefaultMatrix)
  const [editing, setEditing] = useState<string | null>(null)
  const [draftKeys, setDraftKeys] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      apiClient.get<ApiPayload>('/users/role-modules/'),
      apiClient.get<{ permissions: Array<{ role: string; module_key: string; submodule_key: string } & SubmodulePerm> }>('/users/submodule-permissions/'),
    ]).then(([roleRes, permRes]) => {
      setPayload(roleRes.data)
      const matrix = buildDefaultMatrix()
      for (const p of permRes.data.permissions) {
        if (!matrix[p.role]) matrix[p.role] = {}
        if (!matrix[p.role][p.module_key]) matrix[p.role][p.module_key] = {}
        matrix[p.role][p.module_key][p.submodule_key] = { can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete, can_approve: p.can_approve }
      }
      setPermMatrix(matrix)
    }).catch(() => setError('Failed to load role data.')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const sortedRoles = [...(payload?.roles ?? [])].sort((a, b) => {
    const orderDiff = getRoleSortOrder(a.name) - getRoleSortOrder(b.name)
    if (orderDiff !== 0) return orderDiff
    return getRoleShortLabel(a.name).localeCompare(getRoleShortLabel(b.name))
  })

  useEffect(() => {
    if (!sortedRoles.length) return
    if (!sortedRoles.some(role => role.name === selectedRole)) {
      setSelectedRole(sortedRoles[0].name)
    }
  }, [selectedRole, sortedRoles])

  const toggleModule = (modKey: string) => setExpandedModules(s => {
    const n = new Set(s); n.has(modKey) ? n.delete(modKey) : n.add(modKey); return n
  })

  const togglePerm = (roleKey: string, modKey: string, subKey: string, permKey: keyof SubmodulePerm) => {
    setPermMatrix(m => ({
      ...m,
      [roleKey]: {
        ...m[roleKey],
        [modKey]: {
          ...m[roleKey]?.[modKey],
          [subKey]: { ...(m[roleKey]?.[modKey]?.[subKey] ?? defaultPerm()), [permKey]: !(m[roleKey]?.[modKey]?.[subKey]?.[permKey] ?? false) }
        }
      }
    }))
  }

  const startEdit = (role: RoleData) => {
    setEditing(role.name); setDraftKeys(new Set(role.assigned_module_keys)); setSaveError(null); setSaveSuccess(null)
  }

  const saveModules = async (roleName: string) => {
    setSaving(true); setSaveError(null); setSaveSuccess(null)
    try {
      await apiClient.post('/users/role-modules/', { role_name: roleName, module_keys: Array.from(draftKeys) })
      setSaveSuccess(`Module access updated for ${getRoleShortLabel(roleName)}.`)
      setEditing(null)
      load()
    } catch { setSaveError('Failed to save module access.') }
    finally { setSaving(false) }
  }

  const saveSubmodulePerms = async () => {
    setSaving(true); setSaveError(null); setSaveSuccess(null)
    const perms: Array<{ role: string; module_key: string; submodule_key: string } & SubmodulePerm> = []
    for (const [roleKey, mods] of Object.entries(permMatrix)) {
      for (const [modKey, subs] of Object.entries(mods)) {
        for (const [subKey, perm] of Object.entries(subs)) {
          perms.push({ role: roleKey, module_key: modKey, submodule_key: subKey, ...perm })
        }
      }
    }
    try {
      await apiClient.post('/users/submodule-permissions/', { permissions: perms })
      setSaveSuccess('Submodule permissions saved across all roles.')
    } catch { setSaveError('Failed to save permissions.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="py-20 text-center text-slate-500 animate-pulse">Loading roles…</div>
  if (error) return <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>

  const isAdminRole = (name: string) => isAdminFamilyRole(name)
  const rolePerms = permMatrix[selectedRole] ?? {}

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHero
        badge="SETTINGS"
        badgeColor="slate"
        title="Roles & Permissions"
        subtitle="User roles and granular access control"
        icon="⚙️"
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-slate-400">Control what each role can access and perform across all modules and submodules. Changes apply immediately to all users with that role.</p>
      </div>

      {saveError && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{saveError}</div>}
      {saveSuccess && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{saveSuccess}</div>}

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl glass-panel p-1 w-fit">
        {([['modules', 'Module Access'], ['submodules', 'Submodule Permissions']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* MODULE ACCESS TAB */}
      {activeTab === 'modules' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedRoles.map(role => {
            const meta = getRoleMeta(role.name)
            const isLocked = isAdminFamilyRole(role.name) || !role.editable
            const isEditingThis = editing === role.name
            return (
              <div key={role.name} className="rounded-2xl glass-panel p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${meta.outlineBadgeClass}`}>{meta.shortLabel}</span>
                      {isLocked && <Lock className="h-3.5 w-3.5 text-slate-600" />}
                    </div>
                    <p className="text-xs text-slate-500">{getRoleDescription(role.name) || role.description}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 text-slate-500">
                    <Users className="h-3.5 w-3.5" /><span className="text-xs">{role.user_count} users</span>
                  </div>
                </div>

                {isLocked ? (
                  <div className="flex items-start gap-2 rounded-xl bg-white/[0.025] px-3 py-2.5">
                    <Info className="h-3.5 w-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-500">Admin-family roles keep unrestricted access to all modules and are not restricted from this surface.</p>
                  </div>
                ) : isEditingThis ? (
                  <div className="space-y-3">
                    <div className="max-h-52 overflow-y-auto space-y-0.5 rounded-xl border border-white/[0.09] bg-slate-950/60 p-3">
                      {(payload?.all_modules ?? []).filter(m => m.key !== 'CORE').map(m => (
                        <label key={m.key} className="flex items-center gap-2 cursor-pointer py-1">
                          <input type="checkbox" checked={draftKeys.has(m.key)}
                            onChange={() => setDraftKeys(p => { const n = new Set(p); n.has(m.key) ? n.delete(m.key) : n.add(m.key); return n })}
                            className="w-3.5 h-3.5 rounded border-slate-600 bg-[#0d1421] checked:bg-emerald-500 checked:border-emerald-500 transition" />
                          <span className="text-xs text-slate-300">{m.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => void saveModules(role.name)} disabled={saving}
                        className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 py-2 text-xs font-bold text-slate-950 transition">
                        {saving ? 'Saving…' : 'Save Module Access'}
                      </button>
                      <button onClick={() => setEditing(null)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-xs text-slate-400 hover:text-white transition">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                      {role.assigned_module_keys.slice(0, 8).map(k => (
                        <span key={k} className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{k}</span>
                      ))}
                      {role.assigned_module_keys.length > 8 && <span className="text-[10px] text-slate-500">+{role.assigned_module_keys.length - 8} more</span>}
                    </div>
                    <button onClick={() => startEdit(role)} className="text-xs text-emerald-400 hover:text-emerald-300 transition font-medium">
                      Edit module access →
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* SUBMODULE PERMISSIONS TAB */}
      {activeTab === 'submodules' && (
        <div className="space-y-4">
          {/* Role selector */}
          <div className="rounded-2xl glass-panel p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Configure Permissions For Role</p>
            <div className="flex flex-wrap gap-2">
              {sortedRoles.map(role => {
                const meta = getRoleMeta(role.name)
                return (
                  <button key={role.name} onClick={() => setSelectedRole(role.name)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold border transition ${selectedRole === role.name ? `${meta.outlineBadgeClass} ring-1 ring-white/10` : 'border-white/[0.09] text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}>
                    {meta.shortLabel}
                  </button>
                )
              })}
            </div>
          </div>

          {isAdminRole(selectedRole) ? (
            <div className="rounded-2xl glass-panel px-5 py-12 text-center space-y-2">
              <Shield className="h-10 w-10 text-slate-700 mx-auto" />
              <p className="text-sm text-slate-300 font-semibold">Full Access — No Restrictions</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">{getRoleShortLabel(selectedRole)} has unrestricted access to all submodules. Permissions are not restricted for admin-family roles.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl glass-panel">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">Module / Submodule</th>
                      {PERM_COLS.map(c => (
                        <th key={c.key} className="text-center px-3 py-3 w-20">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${c.color}`}>{c.label}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(SUBMODULE_DEFS).map(([modKey, modDef]) => {
                      const isExpanded = expandedModules.has(modKey)
                      return [
                        <tr key={`${modKey}-header`} className="border-b border-white/[0.05] bg-slate-800/20 cursor-pointer hover:bg-white/[0.025] transition" onClick={() => toggleModule(modKey)}>
                          <td className="px-4 py-2.5" colSpan={6}>
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                              {modDef.label}
                              <span className="text-[10px] text-slate-600 font-normal">({modDef.submodules.length} submodules)</span>
                            </div>
                          </td>
                        </tr>,
                        ...(!isExpanded ? [] : modDef.submodules.map(sub => {
                          const perm = rolePerms[modKey]?.[sub.key] ?? defaultPerm()
                          return (
                            <tr key={`${modKey}.${sub.key}`} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition">
                              <td className="pl-12 pr-4 py-2.5 text-xs text-slate-400">{sub.label}</td>
                              {PERM_COLS.map(col => {
                                const active = perm[col.key]
                                return (
                                  <td key={col.key} className="text-center px-3 py-2.5">
                                    <button onClick={() => togglePerm(selectedRole, modKey, sub.key, col.key)}
                                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition ${active ? `${col.color.replace('text-', 'border-')} bg-slate-800` : 'border-white/[0.09] hover:border-slate-500'}`}
                                      title={`${active ? 'Revoke' : 'Grant'} ${col.label} permission`}>
                                      {active && <Check className={`h-3 w-3 ${col.color}`} />}
                                    </button>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        }))
                      ]
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend + Save */}
              <div className="flex items-center justify-between rounded-xl glass-panel p-4">
                <div className="flex items-center gap-4">
                  {PERM_COLS.map(c => (
                    <div key={c.key} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-sm border-2 ${c.color.replace('text-', 'border-')}`} />
                      <span className="text-[10px] text-slate-500">{c.label}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => void saveSubmodulePerms()} disabled={saving}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-6 py-2.5 text-sm font-bold text-slate-950 transition">
                  {saving ? 'Saving…' : 'Save All Permissions'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
