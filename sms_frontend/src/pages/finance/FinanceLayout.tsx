import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import ModuleToolbar from '../../components/ModuleToolbar'

const navSections = [
  {
    title: 'Finance',
    items: [
      { label: 'Dashboard', to: '/modules/finance' },
      { label: 'Invoices', to: '/modules/finance/invoices' },
      { label: 'Payments', to: '/modules/finance/payments' },
      { label: 'Expenses', to: '/modules/finance/expenses' },
      { label: 'Fee Structures', to: '/modules/finance/fee-structures' },
      { label: 'Fee Assignments', to: '/modules/finance/fee-assignments' },
      { label: 'Adjustments', to: '/modules/finance/adjustments' },
      { label: 'Dispensary Records', to: '/modules/finance/dispensary' },
      { label: 'Accounts', to: '/modules/finance/accounts' },
      { label: 'Reconciliation', to: '/modules/finance/reconciliation' },
      { label: 'Reports', to: '/modules/finance/reports' },
      { label: 'Scholarships', to: '/modules/finance/scholarships' },
      { label: 'Refunds', to: '/modules/finance/refunds' },
      { label: 'Optional Charges', to: '/modules/finance/optional-charges' },
      { label: 'Vote Heads', to: '/modules/finance/vote-heads' },
      { label: 'Cashbook', to: '/modules/finance/cashbook' },
      { label: 'Arrears', to: '/modules/finance/arrears' },
      { label: 'Store Requests', to: '/modules/finance/store-requests' },
      { label: 'Financial Reports', to: '/modules/finance/audit-reports' },
      { label: 'Settings', to: '/settings/finance' },
    ],
  },
  {
    title: 'Ledgers',
    items: [
      { label: 'Student Ledger', to: '/modules/finance/ledger' },
      { label: 'General Ledger', to: '/modules/finance/general-ledger' },
      { label: 'Expense Ledger', to: '/modules/finance/expense-ledger' },
      { label: 'Budget Ledger', to: '/modules/finance/budget-ledger' },
    ],
  },
]

export default function FinanceLayout() {
  const tenantId = useAuthStore((state) => state.tenantId)
  const username = useAuthStore((state) => state.username)
  const location = useLocation()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [navQuery, setNavQuery] = useState('')

  const filteredSections = useMemo(() => {
    const term = navQuery.trim().toLowerCase()
    if (!term) return navSections
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(term)),
      }))
      .filter((section) => section.items.length > 0)
  }, [navQuery])

  useEffect(() => {
    setIsNavOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-12 gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        <aside className="col-span-12 rounded-2xl glass-panel p-5 md:col-span-3 lg:col-span-2">
          <ModuleToolbar currentModule="FINANCE" />
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
          <h2 className="mt-2 text-lg font-display font-semibold">Module</h2>
          <button
            className="mt-4 w-full rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 md:hidden"
            onClick={() => setIsNavOpen((prev) => !prev)}
          >
            {isNavOpen ? 'Hide menu' : 'Show menu'}
          </button>
          <input
            className="mt-4 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            placeholder="Find section"
            value={navQuery}
            onChange={(event) => setNavQuery(event.target.value)}
          />
          <div className={`mt-5 space-y-4 text-sm ${isNavOpen ? 'block' : 'hidden'} md:block`}>
            {filteredSections.map((section) => (
              <div key={section.title}>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">{section.title}</p>
                <div className="mt-2 space-y-2">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/modules/finance'}
                      onClick={() => setIsNavOpen(false)}
                      className={({ isActive }) =>
                        `block rounded-xl px-4 py-2 transition ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-200'
                            : 'text-slate-300 hover:bg-white/[0.035]'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
            {filteredSections.length === 0 ? (
              <p className="rounded-xl border border-white/[0.07] px-4 py-2 text-xs text-slate-400">
                No matching sections.
              </p>
            ) : null}
          </div>
          <div className="mt-6 rounded-xl border border-white/[0.07] bg-slate-950/60 p-4 text-xs text-slate-300">
            <p>
              <strong>Tenant:</strong> {tenantId ?? 'public'}
            </p>
            <p className="mt-2">
              <strong>User:</strong> {username ?? 'user'}
            </p>
          </div>
        </aside>

        <div className="col-span-12 md:col-span-9 lg:col-span-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
