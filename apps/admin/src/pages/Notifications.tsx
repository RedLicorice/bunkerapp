import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Megaphone, User, Loader2 } from 'lucide-react'
import { supabase, getAllNotifications, sendNotification } from '@bunker/supabase'
import { useAuthStore } from '@/store/auth'
import { Layout } from '@/components/Layout'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export default function Notifications() {
  const { profile } = useAuthStore()
  const qc          = useQueryClient()
  const [title, setTitle]           = useState('')
  const [body, setBody]             = useState('')
  const [recipientId, setRecipient] = useState<string>('broadcast')
  const [tab, setTab]               = useState<'send' | 'history'>('send')

  const { data: members = [] } = useQuery({
    queryKey: ['members-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'customer').order('full_name')
      return data ?? []
    },
  })

  const { data: history = [] } = useQuery({
    queryKey: ['notifications-history'],
    queryFn: getAllNotifications,
    enabled: tab === 'history',
  })

  const send = useMutation({
    mutationFn: () => sendNotification(
      profile!.id,
      title,
      body,
      recipientId === 'broadcast' ? undefined : recipientId,
    ),
    onSuccess: () => {
      setTitle(''); setBody('')
      qc.invalidateQueries({ queryKey: ['notifications-history'] })
    },
  })

  return (
    <Layout title="Notifications">
      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-zinc-900 p-1">
        {(['send', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 rounded-lg py-2 text-sm font-medium capitalize transition',
              tab === t ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500')}>
            {t === 'send' ? 'Send message' : 'History'}
          </button>
        ))}
      </div>

      {tab === 'send' ? (
        <div className="space-y-4">
          {/* Audience */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Recipient</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRecipient('broadcast')}
                className={cn('flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition',
                  recipientId === 'broadcast' ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-zinc-800 text-zinc-500')}
              >
                <Megaphone size={14} /> All members
              </button>
              {members.map((m: any) => (
                <button key={m.id}
                  onClick={() => setRecipient(m.id)}
                  className={cn('flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition',
                    recipientId === m.id ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-zinc-800 text-zinc-500')}
                >
                  <User size={14} /> {m.full_name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder-zinc-600 focus:border-brand-500 focus:outline-none"
              placeholder="e.g. Schedule change" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder-zinc-600 focus:border-brand-500 focus:outline-none resize-none"
              placeholder="Write your message…" />
          </div>

          {send.isError && <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-400">Failed to send</p>}
          {send.isSuccess && <p className="rounded-lg bg-green-950/50 px-3 py-2 text-sm text-green-400">Message sent!</p>}

          <button
            onClick={() => send.mutate()}
            disabled={!title || !body || send.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {send.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {recipientId === 'broadcast' ? 'Broadcast to all' : 'Send to member'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((n: any) => (
            <div key={n.id} className="rounded-2xl bg-zinc-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {n.recipient_id
                      ? <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400"><User size={10} /> {n.recipient?.full_name}</span>
                      : <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400"><Megaphone size={10} /> Broadcast</span>}
                  </div>
                  <p className="font-semibold text-sm">{n.title}</p>
                  <p className="text-sm text-zinc-400 mt-0.5">{n.body}</p>
                </div>
                <p className="text-[10px] text-zinc-600 whitespace-nowrap">
                  {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          {history.length === 0 && <p className="py-10 text-center text-sm text-zinc-600">No messages sent yet</p>}
        </div>
      )}
    </Layout>
  )
}
