import { useQuery } from '@tanstack/react-query'
import { User, Search } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@bunker/supabase'
import { Layout } from '@/components/Layout'

export default function Members() {
  const [search, setSearch] = useState('')

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*, enrollments(course:courses(name, color))')
        .eq('role', 'customer')
        .order('full_name')
      return data ?? []
    },
  })

  const filtered = members.filter((m: any) =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search),
  )

  return (
    <Layout title="Members">
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members…"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-9 pr-4 text-sm text-zinc-50 placeholder-zinc-600 focus:border-brand-500 focus:outline-none"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((m: any) => (
          <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-3.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800">
              {m.avatar_url
                ? <img src={m.avatar_url} className="h-10 w-10 rounded-full object-cover" alt="" />
                : <User size={18} className="text-zinc-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{m.full_name}</p>
              {m.phone && <p className="text-xs text-zinc-500">{m.phone}</p>}
              <div className="mt-1 flex flex-wrap gap-1">
                {m.enrollments?.map((e: any, i: number) => (
                  <span key={i} className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: `${e.course?.color ?? '#f97316'}20`, color: e.course?.color ?? '#f97316' }}>
                    {e.course?.name}
                  </span>
                ))}
              </div>
            </div>
            <span className="text-[10px] font-semibold text-zinc-600">
              {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
            </span>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-600">No members found</p>
        )}
      </div>
    </Layout>
  )
}
