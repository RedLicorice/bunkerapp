import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Clock, ChevronRight, Loader2 } from 'lucide-react'
import { getPendingSwapRequests, getAllSwapRequests, approveSwap, rejectSwap } from '@bunker/supabase'
import { useAuthStore } from '@/store/auth'
import { Layout } from '@/components/Layout'
import { cn, DAY_NAMES_FULL, formatTime } from '@/lib/utils'

type TabKey = 'pending' | 'all'

export default function SwapRequests() {
  const { profile } = useAuthStore()
  const qc          = useQueryClient()
  const [tab, setTab]           = useState<TabKey>('pending')
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
  const [rejectNote, setRejectNote]   = useState('')

  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ['swap-requests-pending'],
    queryFn:  getPendingSwapRequests,
    refetchInterval: 30_000,
  })

  const { data: all = [], isLoading: loadingAll } = useQuery({
    queryKey: ['swap-requests-all'],
    queryFn:  getAllSwapRequests,
    enabled:  tab === 'all',
  })

  const approve = useMutation({
    mutationFn: (id: string) => approveSwap(id, profile!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['swap-requests-pending'] })
      qc.invalidateQueries({ queryKey: ['swap-requests-all'] })
    },
  })

  const reject = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      rejectSwap(id, profile!.id, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['swap-requests-pending'] })
      qc.invalidateQueries({ queryKey: ['swap-requests-all'] })
      setRejectModal(null)
      setRejectNote('')
    },
  })

  const isLoading  = tab === 'pending' ? loadingPending : loadingAll
  const rows       = tab === 'pending' ? pending : all

  return (
    <Layout
      title="Swap Requests"
      action={
        pending.length > 0
          ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold">{pending.length}</span>
          : undefined
      }
    >
      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-zinc-900 p-1">
        {(['pending', 'all'] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium capitalize transition',
              tab === t ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500',
            )}
          >
            {t === 'pending' && pending.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white">
                {pending.length}
              </span>
            )}
            {t === 'pending' ? 'Pending' : 'All requests'}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      <div className="space-y-3">
        {rows.map((req: any) => (
          <SwapRequestCard
            key={req.id}
            req={req}
            onApprove={tab === 'pending' ? () => approve.mutate(req.id) : undefined}
            onReject={tab === 'pending' ? () => setRejectModal({ id: req.id }) : undefined}
            approving={approve.isPending && approve.variables === req.id}
          />
        ))}
        {!isLoading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-zinc-600">
            <Clock size={32} className="opacity-30" />
            <p className="text-sm">{tab === 'pending' ? 'No pending swap requests' : 'No swap requests yet'}</p>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setRejectModal(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-zinc-900 p-5 shadow-2xl">
            <h2 className="mb-3 text-base font-bold">Reject swap</h2>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Reason (optional)</label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              placeholder="e.g. Class is full on that date"
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-50 placeholder-zinc-600 focus:border-brand-500 focus:outline-none"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400"
              >
                Cancel
              </button>
              <button
                onClick={() => reject.mutate({ id: rejectModal.id, note: rejectNote })}
                disabled={reject.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {reject.isPending && <Loader2 size={14} className="animate-spin" />}
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function SwapRequestCard({ req, onApprove, onReject, approving }: {
  req: any
  onApprove?: () => void
  onReject?: () => void
  approving: boolean
}) {
  const original        = req.original_booking
  const requestedLesson = req.requested_lesson
  const statusColors: Record<string, string> = {
    pending:  'text-yellow-400 bg-yellow-500/20',
    approved: 'text-green-400 bg-green-500/20',
    rejected: 'text-red-400   bg-red-500/20',
  }

  return (
    <div className="rounded-2xl bg-zinc-900 p-4">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{req.user?.full_name}</p>
          <p className="text-xs text-zinc-500">{req.original_booking?.lesson?.course?.name}</p>
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', statusColors[req.status])}>
          {req.status}
        </span>
      </div>

      {/* Swap detail */}
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-zinc-800/60 px-3 py-2.5">
        <div className="flex-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">From</p>
          <p className="text-sm font-medium">{DAY_NAMES_FULL[original?.lesson?.day_of_week ?? 0]}</p>
          <p className="text-xs text-zinc-400">{original?.date} · {formatTime(original?.lesson?.start_time ?? '00:00')}</p>
        </div>
        <ChevronRight size={16} className="flex-shrink-0 text-zinc-600" />
        <div className="flex-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">To</p>
          <p className="text-sm font-medium">{DAY_NAMES_FULL[requestedLesson?.day_of_week ?? 0]}</p>
          <p className="text-xs text-zinc-400">{req.requested_date} · {formatTime(requestedLesson?.start_time ?? '00:00')}</p>
        </div>
      </div>

      {req.rejection_note && (
        <p className="mb-3 rounded-lg bg-red-950/40 px-3 py-2 text-xs text-red-400">
          Reason: {req.rejection_note}
        </p>
      )}

      {/* Actions — only shown for pending */}
      {onApprove && onReject && (
        <div className="flex gap-2">
          <button
            onClick={onReject}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-400 hover:border-red-800 hover:text-red-400"
          >
            <X size={14} /> Reject
          </button>
          <button
            onClick={onApprove}
            disabled={approving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {approving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Approve
          </button>
        </div>
      )}
    </div>
  )
}
