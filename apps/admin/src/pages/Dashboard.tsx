import { useQuery } from '@tanstack/react-query'
import { Users, Dumbbell, CalendarCheck, ArrowLeftRight, XCircle } from 'lucide-react'
import { supabase } from '@bunker/supabase'
import { Layout } from '@/components/Layout'

function toDateStringLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getUpcomingDates(n: number) {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return { date: toDateStringLocal(d), dow: d.getDay(), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayLabels[d.getDay()] }
  })
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-zinc-900 p-4">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  )
}

const UPCOMING_DAYS = 4

export default function Dashboard() {
  const upcomingDates = getUpcomingDates(UPCOMING_DAYS)
  const today = upcomingDates[0].date
  const todayDow = upcomingDates[0].dow

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [members, courses, todayLessons] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('day_of_week', todayDow),
      ])
      return {
        members: members.count ?? 0,
        courses: courses.count ?? 0,
        todayLessons: todayLessons.count ?? 0,
      }
    },
  })

  const { data: upcomingLessons = [] } = useQuery({
    queryKey: ['upcoming-lessons'],
    queryFn: async () => {
      const dows = [...new Set(upcomingDates.map(d => d.dow))]
      const dates = upcomingDates.map(d => d.date)

      const [lessonsRes, bookingsRes] = await Promise.all([
        supabase
          .from('lessons')
          .select('id, day_of_week, start_time, capacity, instructor_name, course:courses(name, color)')
          .eq('is_active', true)
          .in('day_of_week', dows)
          .order('start_time'),
        supabase
          .from('bookings')
          .select('lesson_id, date')
          .in('date', dates)
          .eq('status', 'active'),
      ])

      const lessons = lessonsRes.data ?? []
      const bookings = bookingsRes.data ?? []

      const countMap: Record<string, number> = {}
      for (const b of bookings) {
        const key = `${b.lesson_id}:${b.date}`
        countMap[key] = (countMap[key] ?? 0) + 1
      }

      const result: any[] = []
      for (const di of upcomingDates) {
        for (const l of lessons) {
          if ((l as any).day_of_week === di.dow) {
            result.push({ ...l, date: di.date, dateLabel: di.label, bookingCount: countMap[`${l.id}:${di.date}`] ?? 0 })
          }
        }
      }
      return result
    },
  })

  const { data: pendingSwaps = [] } = useQuery({
    queryKey: ['pending-swaps-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('swap_requests')
        .select(`
          id, requested_date,
          user:profiles(full_name),
          original_booking:bookings(date, lesson:lessons(start_time, course:courses(name, color))),
          requested_lesson:lessons(start_time, course:courses(name, color))
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(6)
      return data ?? []
    },
  })

  const { data: recentCancellations = [] } = useQuery({
    queryKey: ['recent-cancellations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, date, lesson:lessons(start_time, course:courses(name, color)), user:profiles(full_name)')
        .eq('status', 'cancelled')
        .gte('date', today)
        .order('date')
        .limit(5)
      return data ?? []
    },
  })

  return (
    <Layout title="Dashboard">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-8">
        <StatCard label="Members"        value={stats?.members      ?? '—'} icon={Users}        color="#f97316" />
        <StatCard label="Active courses" value={stats?.courses      ?? '—'} icon={Dumbbell}     color="#3b82f6" />
        <StatCard label="Today's lessons" value={stats?.todayLessons ?? '—'} icon={CalendarCheck} color="#22c55e" />
      </div>

      {/* Upcoming Lessons */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">Upcoming lessons</h2>
      <div className="space-y-2 mb-8">
        {upcomingLessons.map((l: any) => (
          <div key={`${l.id}:${l.date}`} className="flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3">
            <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: l.course?.color ?? '#f97316' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{l.course?.name}</p>
              <p className="text-xs text-zinc-500">{l.instructor_name ?? 'No instructor'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-zinc-300">{l.dateLabel}</p>
              <p className="text-xs text-zinc-600">{l.start_time?.slice(0, 5)}</p>
            </div>
            <div className="text-right min-w-[40px]">
              <p className="text-sm font-bold" style={{ color: l.bookingCount >= l.capacity ? '#ef4444' : '#22c55e' }}>
                {l.bookingCount}/{l.capacity}
              </p>
              <p className="text-xs text-zinc-600">booked</p>
            </div>
          </div>
        ))}
        {upcomingLessons.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-600">No lessons in next {UPCOMING_DAYS} days</p>
        )}
      </div>

      {/* Pending Swap Requests */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
        <ArrowLeftRight size={14} />
        Pending swaps
        {pendingSwaps.length > 0 && (
          <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white leading-none">{pendingSwaps.length}</span>
        )}
      </h2>
      <div className="space-y-2 mb-8">
        {pendingSwaps.map((s: any) => (
          <div key={s.id} className="rounded-xl bg-zinc-900 px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium">{s.user?.full_name}</p>
              <p className="text-xs text-zinc-500">{s.requested_date}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.original_booking?.lesson?.course?.color ?? '#71717a' }} />
                {s.original_booking?.lesson?.course?.name} {s.original_booking?.lesson?.start_time?.slice(0, 5)}
              </span>
              <ArrowLeftRight size={10} className="text-zinc-600" />
              <span className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.requested_lesson?.course?.color ?? '#71717a' }} />
                {s.requested_lesson?.course?.name} {s.requested_lesson?.start_time?.slice(0, 5)}
              </span>
            </div>
          </div>
        ))}
        {pendingSwaps.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-600">No pending swap requests</p>
        )}
      </div>

      {/* Recent Cancellations */}
      {recentCancellations.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <XCircle size={14} />
            Cancelled (upcoming)
          </h2>
          <div className="space-y-2">
            {recentCancellations.map((b: any) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3 opacity-70">
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.lesson?.course?.color ?? '#71717a' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.user?.full_name}</p>
                  <p className="text-xs text-zinc-500">{b.lesson?.course?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-zinc-400">{b.date}</p>
                  <p className="text-xs text-zinc-600">{b.lesson?.start_time?.slice(0, 5)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}
