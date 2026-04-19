import { useQuery } from '@tanstack/react-query'
import { Users, Dumbbell, CalendarCheck } from 'lucide-react'
import { supabase } from '@bunker/supabase'
import { Layout } from '@/components/Layout'

function toDateStringLocal(d: Date) { return d.toISOString().slice(0, 10) }

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: any; color: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-zinc-900 p-4">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl`} style={{ backgroundColor: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const today = toDateStringLocal(new Date())

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [members, courses, todayBookings] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('date', today).eq('status', 'active'),
      ])
      return {
        members:       members.count   ?? 0,
        courses:       courses.count   ?? 0,
        todayBookings: todayBookings.count ?? 0,
      }
    },
  })

  const { data: recentBookings = [] } = useQuery({
    queryKey: ['recent-bookings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, lesson:lessons(start_time, course:courses(name, color)), user:profiles(full_name)')
        .gte('date', today)
        .eq('status', 'active')
        .order('date')
        .limit(8)
      return data ?? []
    },
  })

  return (
    <Layout title="Dashboard">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-8">
        <StatCard label="Members"       value={stats?.members ?? '—'}       icon={Users}        color="#f97316" />
        <StatCard label="Active courses" value={stats?.courses ?? '—'}      icon={Dumbbell}     color="#3b82f6" />
        <StatCard label="Today's lessons" value={stats?.todayBookings ?? '—'} icon={CalendarCheck} color="#22c55e" />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">Upcoming bookings</h2>
      <div className="space-y-2">
        {recentBookings.map((b: any) => (
          <div key={b.id} className="flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3">
            <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.lesson?.course?.color ?? '#f97316' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{b.user?.full_name}</p>
              <p className="text-xs text-zinc-500">{b.lesson?.course?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-zinc-300">{b.date}</p>
              <p className="text-xs text-zinc-600">{b.lesson?.start_time?.slice(0, 5)}</p>
            </div>
          </div>
        ))}
        {recentBookings.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-600">No upcoming bookings</p>
        )}
      </div>
    </Layout>
  )
}

