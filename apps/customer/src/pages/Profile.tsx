import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { User, LogOut, Save, Loader2 } from 'lucide-react'
import { supabase } from '@bunker/supabase'
import { useAuthStore } from '@/store/auth'
import { Layout } from '@/components/Layout'
import { cn } from '@/lib/utils'

export default function Profile() {
  const { profile, signOut } = useAuthStore()
  const qc                   = useQueryClient()
  const [name, setName]      = useState(profile?.full_name ?? '')
  const [phone, setPhone]    = useState(profile?.phone ?? '')
  const [saved, setSaved]    = useState(false)

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name, phone: phone || null })
        .eq('id', profile!.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <Layout title="Profile">
      {/* Avatar */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} className="h-20 w-20 rounded-full object-cover" alt="" />
            : <User size={36} className="text-zinc-500" />}
        </div>
        <div className="text-center">
          <p className="font-semibold">{profile?.full_name}</p>
          <span className="inline-block rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-semibold text-brand-400">
            {profile?.role}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder-zinc-600 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder-zinc-600 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="+1 234 567 890"
          />
        </div>

        <button
          onClick={() => update.mutate()}
          disabled={update.isPending}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition',
            saved
              ? 'bg-green-600 text-white'
              : 'bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.98]',
            'disabled:opacity-60',
          )}
        >
          {update.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save changes'}
        </button>

        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 py-3.5 text-sm font-semibold text-zinc-400 transition hover:border-red-900 hover:text-red-400"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </Layout>
  )
}
