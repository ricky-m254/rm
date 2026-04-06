import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type TimetableChangeRequest = {
  id: number
  request_type: 'SWAP_SLOT' | 'CHANGE_TIME' | 'CHANGE_TEACHER' | 'DUTY_CHANGE'
  requested_by_name: string
  slot_display: string
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
  reviewed_by_name?: string
  review_notes?: string
  created_at: string
  reviewed_at?: string
}

export default function TimetableChangeRequestsPage() {
  const [requests, setRequests] = useState<TimetableChangeRequest[]>([])
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.get('/timetable/change-requests/', { params: { status: activeTab } })
      setRequests(res.data.results || res.data)
      setError(null)
    } catch (err) {
      setError('Failed to load change requests.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [activeTab])

  const handleApprove = async (id: number) => {
    setIsProcessing(true)
    try {
      await apiClient.post(`/timetable/change-requests/${id}/approve/`)
      fetchRequests()
    } catch (err) {
      setError('Failed to approve request.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!showRejectModal) return
    setIsProcessing(true)
    try {
      await apiClient.post(`/timetable/change-requests/${showRejectModal}/reject/`, {
        review_notes: rejectReason
      })
      setShowRejectModal(null)
      setRejectReason('')
      fetchRequests()
    } catch (err) {
      setError('Failed to reject request.')
    } finally {
      setIsProcessing(false)
    }
  }

  const getBadgeColor = (type: string) => {
    switch(type) {
      case 'SWAP_SLOT': return 'bg-blue-500/10 text-blue-400 border-blue-400/20'
      case 'CHANGE_TIME': return 'bg-amber-500/10 text-amber-400 border-amber-400/20'
      case 'CHANGE_TEACHER': return 'bg-purple-500/10 text-purple-400 border-purple-400/20'
      case 'DUTY_CHANGE': return 'bg-cyan-500/10 text-cyan-400 border-cyan-400/20'
      default: return 'bg-slate-500/10 text-slate-400 border-slate-400/20'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Change Requests"
        subtitle="Approval queue for timetable and duty changes."
        icon="📋"
      />

      <div className="flex border-b border-white/[0.07] gap-8 px-4">
        {['Pending', 'Approved', 'Rejected'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`py-3 text-sm font-semibold transition relative ${
              activeTab === tab ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        {error && (
          <div className="rounded-2xl border border-rose-800 bg-rose-950/20 p-4 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center">
            <p className="text-slate-400 animate-pulse">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-white/[0.07] rounded-2xl">
            <p className="text-slate-500 italic">No {activeTab.toLowerCase()} requests found.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {requests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getBadgeColor(request.request_type)}`}>
                      {request.request_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{formatDate(request.created_at)}</span>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-slate-200">Request from {request.requested_by_name}</h3>
                    <p className="text-sm text-emerald-400 mt-1 font-medium">{request.slot_display}</p>
                  </div>

                  <div className="bg-slate-950/50 rounded-xl p-4 border border-white/[0.05]">
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Reason</p>
                    <p className="text-sm text-slate-300 italic">"{request.reason}"</p>
                  </div>

                  {(request.status !== 'Pending') && (
                    <div className="mt-4 pt-4 border-t border-white/[0.05] text-xs text-slate-400 flex flex-wrap gap-4">
                      <span>Reviewed by: <strong>{request.reviewed_by_name}</strong></span>
                      <span>Date: <strong>{request.reviewed_at ? formatDate(request.reviewed_at) : 'N/A'}</strong></span>
                    </div>
                  )}

                  {request.review_notes && (
                    <div className="mt-2 text-xs text-rose-300 bg-rose-500/5 border border-rose-500/20 p-3 rounded-lg">
                      <strong>Review Notes:</strong> {request.review_notes}
                    </div>
                  )}
                </div>

                {request.status === 'Pending' && (
                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-40 justify-end md:justify-center">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={isProcessing}
                      className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(request.id)}
                      disabled={isProcessing}
                      className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-400 hover:bg-rose-500/20 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-slate-950 p-6">
            <h3 className="text-xl font-display font-semibold mb-2">Reject Request</h3>
            <p className="text-sm text-slate-400 mb-6">Please provide a reason for rejecting this change request.</p>
            
            <textarea
              required
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection notes..."
              className="w-full bg-[#0d1421] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />

            <div className="mt-8 flex gap-3">
              <button
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-400 transition disabled:opacity-50"
                onClick={handleReject}
                disabled={!rejectReason || isProcessing}
              >
                Confirm Rejection
              </button>
              <button
                className="flex-1 rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-[#0d1421] transition"
                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                disabled={isProcessing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
