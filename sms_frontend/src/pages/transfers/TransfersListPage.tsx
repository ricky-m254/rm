import TransfersDashboardPage from './TransfersDashboardPage'

/**
 * Thin wrapper — the Dashboard page renders everything.
 * We just pass a default filter via location state so the
 * sidebar links (Incoming / Outgoing / History) feel distinct.
 */
export default function TransfersListPage() {
  return <TransfersDashboardPage />
}
