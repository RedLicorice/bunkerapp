import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X, ArrowLeftRight, Clock } from 'lucide-react'
import { format, addWeeks, subWeeks } from 'date-fns'
import { getMyBookings, cancelBooking, getMySwapRequests } from '@bunker/supabase'
import type { BookingWithLesson } from '@bunker/supabase'
import { useAuthStore } from '@/store/auth'
import { Layout } from '@/components/Layout'
import { cn, DAY_NAMES, getWeekDates, toDateString, formatTime } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

export default function Schedule() {
  const [weekRef, setWeekRef] = useState(new Date())
  const { profile }           = useAuthStore()
  const qc                    = useQueryClient()
  const navigate              = useNavigate()
  const weekDates             = getWeekDates(weekRef)
  const from                  = toDateString(weekDates[0])
  const to                    = toDateString(weekDates[6])

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', profile?.id, from, to],
    queryFn: () => getMyBookings(profile!.id, from, to),
    enabled: !!profile,
  })

  const cancel = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })

  // Track which bookings have a pending swap request
  const { data: swapRequests = [] } = useQuery({
    queryKey: ['my-swap-requests', profile?.id],
    queryFn: () => getMySwapRequests(profile!.id),
    enabled: !!profile,
  })
  const pendingBookingIds = new Set(
    swapRequests
      .filter((r: any) => r.status === 'pending')
      .map((r: any) => r.original_booking_id),
  )

  const byDate = weekDates.map((date) => ({
    date,
    bookings: bookings.filter((b) => b.date === toDateString(date)),
  }))

  const isCurrentWeek = toDateString(getWeekDates()[0]) === from

  return (
    <Layout title="My Schedule">
      {/* Week navigator */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setWeekRef(subWeeks(weekRef, 1))} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-semibold">
          {isCurrentWeek ? 'This week' : `${format(weekDates[0], 'MMM d')} – ${format(weekDates[6], 'MMM d')}`}
        </span>
        <button onClick={() => setWeekRef(addWeeks(weekRef, 1))} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day pills */}
      <div className="mb-6 grid grid-cols-7 gap-1">
        {weekDates.map((date, i) => {
          const isToday = toDateString(date) === toDateString(new Date())
          const hasBooking = bookings.some((b) => b.date === toDateString(date))
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-zinc-500">{DAY_NAMES[date.getDay()]}</span>
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                isToday ? 'bg-brand-500 text-white' : 'text-zinc-400',
              )}>
                {date.getDate()}
              </div>
              {hasBooking && <div className="h-1 w-1 rounded-full bg-brand-500" />}
            </div>
          )
        })}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      {/* Lesson cards */}
      <div className="space-y-3">
        {byDate.map(({ date, bookings: dayBookings }) => (
          dayBookings.length > 0 && (
            <div key={toDateString(date)}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {format(date, 'EEEE, MMM d')}
              </p>
              {dayBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  swapPending={pendingBookingIds.has(booking.id)}
                  onCancel={() => cancel.mutate(booking.id)}
                  onSwap={() => navigate(`/swap/${booking.id}`)}
                />
              ))}
            </div>
          )
        ))}
        {!isLoading && bookings.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-zinc-600">
            <p className="text-sm">No lessons booked this week</p>
            <button onClick={() => navigate('/courses')} className="text-sm font-medium text-brand-500">Browse courses →</button>
          </div>
        )}
      </div>
    </Layout>
  )
}

function BookingCard({ booking, swapPending, onCancel, onSwap }: {
  booking: BookingWithLesson
  swapPending: boolean
  onCancel: () => void
  onSwap: () => void
}) {
  const { lesson } = booking
  return (
    <div
      className="mb-2 flex items-center gap-3 rounded-2xl bg-zinc-900 p-4"
      style={{ borderLeft: `3px solid ${lesson.course.color}` }}
    >
      <div className="flex-1">
        <p className="font-semibold">{lesson.course.name}</p>
        <p className="mt-0.5 text-sm text-zinc-400">
          {formatTime(lesson.start_time)} · {lesson.duration_minutes} min
          {lesson.location && ` · ${lesson.location}`}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {booking.is_swap && (
            <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">SWAP</span>
          )}
          {swapPending && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-400">
              <Clock size={9} /> SWAP PENDING
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSwap}
          disabled={swapPending}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50 disabled:opacity-40"
          title={swapPending ? 'Swap request pending' : 'Request swap'}
        >
          <ArrowLeftRight size={15} />
        </button>
        <button
          onClick={onCancel}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-red-900/60 hover:text-red-400"
          title="Cancel"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
