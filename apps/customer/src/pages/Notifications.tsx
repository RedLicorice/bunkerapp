import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, BellOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getMyNotifications, markRead } from '@bunker/supabase'
import { useAuthStore } from '@/store/auth'
import { Layout } from '@/components/Layout'
import { registerPush } from '@/hooks/usePush'
import { cn } from '@/lib/utils'

export default function Notifications() {
  const { profile } = useAuthStore()
  const qc          = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn:  () => getMyNotifications(profile!.id),
    enabled:  !!profile,
  })

  const read = useMutation({
    mutationFn: markRead,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return (
    <Layout
      title="Notifications"
      action={
        <button
          onClick={registerPush}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-50"
        >
          <Bell size={14} /> Enable push
        </button>
      }
    >
      {unreadCount > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-zinc-400">{unreadCount} unread</p>
          <button
            onClick={() => notifications.filter((n) => !n.read_at).forEach((n) => read.mutate(n.id))}
            className="text-xs font-medium text-brand-500"
          >
            Mark all read
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.read_at && read.mutate(n.id)}
            className={cn(
              'w-full rounded-2xl p-4 text-left transition',
              n.read_at ? 'bg-zinc-900/50' : 'bg-zinc-900 ring-1 ring-brand-500/30',
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                n.read_at ? 'bg-zinc-800' : 'bg-brand-500/20',
              )}>
                {n.read_at
                  ? <BellOff size={14} className="text-zinc-500" />
                  : <Bell size={14} className="text-brand-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-semibold text-sm', n.read_at ? 'text-zinc-400' : 'text-zinc-50')}>
                  {n.title}
                </p>
                <p className="mt-0.5 text-sm text-zinc-500">{n.body}</p>
                <p className="mt-1 text-[10px] text-zinc-600">
                  {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
                </p>
              </div>
              {!n.read_at && <div className="mt-2 h-2 w-2 rounded-full bg-brand-500" />}
            </div>
          </button>
        ))}
        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-zinc-600">
            <Bell size={32} className="opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
