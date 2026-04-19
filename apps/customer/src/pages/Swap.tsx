import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Clock, ChevronLeft, Loader2, CheckCircle } from 'lucide-react'
import { supabase, requestSwap } from '@bunker/supabase'
import type { BookingWithLesson, Lesson } from '@bunker/supabase'
import { useAuthStore } from '@/store/auth'
import { cn, DAY_NAMES_FULL, formatTime, toDateString } from '@/lib/utils'
import { addDays } from 'date-fns'

export default function Swap() {
  const { bookingId }   = useParams<{ bookingId: string }>()
  const { profile }     = useAuthStore()
  const navigate        = useNavigate()
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [selectedDate, setSelectedDate]     = useState<string>('')
  const [submitted, setSubmitted]           = useState(false)

  const { data: booking, isLoading: loadingBooking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, lesson:lessons(*, course:courses(*))')
        .eq('id', bookingId)
        .single()
      if (error) throw error
      return data as BookingWithLesson
    },
    enabled: !!bookingId,
  })

  const { data: lessons = [] } = useQuery({
    queryKey: ['course-lessons', booking?.lesson.course_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', booking!.lesson.course_id)
        .eq('is_active', true)
        .neq('id', booking!.lesson_id)
      if (error) throw error
      return data as Lesson[]
    },
    enabled: !!booking,
  })

  const availableDates = selectedLesson
    ? (() => {
        const dates: string[] = []
        let d = addDays(new Date(), 1)
        d.setHours(0, 0, 0, 0)
        while (d.getDay() !== selectedLesson.day_of_week) d = addDays(d, 1)
        for (let i = 0; i < 4; i++) { dates.push(toDateString(d)); d = addDays(d, 7) }
        return dates
      })()
    : []

  const submit = useMutation({
    mutationFn: () => requestSwap(
      profile!.id,
      bookingId!,
      selectedLesson!.id,
      selectedDate,
    ),
    onSuccess: () => setSubmitted(true),
  })

  if (loadingBooking) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  )

  if (submitted) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
        <Clock size={28} className="text-amber-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold">Request sent</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Your swap is pending owner approval.<br />
          You'll get a notification once reviewed.
        </p>
      </div>
      <button
        onClick={() => navigate('/schedule')}
        className="mt-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
      >
        Back to schedule
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 px-4 pb-8 pt-4">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-50">
        <ChevronLeft size={18} /> Back
      </button>

      <h1 className="mb-1 text-xl font-bold">Request lesson swap</h1>
      {booking && (
        <p className="mb-1 text-sm text-zinc-400">
          Original: <span className="font-medium text-zinc-200">
            {DAY_NAMES_FULL[booking.lesson.day_of_week]} {formatTime(booking.lesson.start_time)}
          </span>
        </p>
      )}
      <p className="mb-6 text-xs text-amber-400/80 flex items-center gap-1">
        <Clock size={12} /> Subject to owner approval
      </p>

      {/* Pick alternate lesson */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Choose alternate slot</p>
      <div className="mb-6 space-y-2">
        {lessons.map((l) => (
          <button
            key={l.id}
            onClick={() => { setSelectedLesson(l); setSelectedDate('') }}
            className={cn(
              'flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition',
              selectedLesson?.id === l.id
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700',
            )}
          >
            <span className="font-medium">{DAY_NAMES_FULL[l.day_of_week]}</span>
            <span className="text-sm font-semibold text-brand-400">{formatTime(l.start_time)}</span>
          </button>
        ))}
        {lessons.length === 0 && (
          <p className="py-4 text-center text-sm text-zinc-600">No other slots in this course</p>
        )}
      </div>

      {/* Pick date */}
      {selectedLesson && (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Pick date</p>
          <div className="mb-8 grid grid-cols-2 gap-2">
            {availableDates.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  'rounded-xl border p-3 text-sm font-medium transition',
                  selectedDate === d
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700',
                )}
              >
                {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => submit.mutate()}
        disabled={!selectedLesson || !selectedDate || submit.isPending}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-semibold text-white transition',
          'hover:bg-brand-600 active:scale-[0.98] disabled:opacity-40',
        )}
      >
        {submit.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
        Submit swap request
      </button>

      {submit.isError && (
        <p className="mt-3 rounded-lg bg-red-950/50 px-3 py-2 text-center text-sm text-red-400">
          Failed to submit. Try again.
        </p>
      )}
    </div>
  )
}
