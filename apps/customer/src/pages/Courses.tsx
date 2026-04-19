import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, ChevronDown, ChevronUp, Loader2, CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { addDays } from 'date-fns'
import { getCourses, getMyEnrollments, enroll, unenroll, createBooking } from '@bunker/supabase'
import type { Course, Lesson } from '@bunker/supabase'
import { useAuthStore } from '@/store/auth'
import { Layout } from '@/components/Layout'
import { cn, DAY_NAMES_FULL, formatTime, toDateString } from '@/lib/utils'

export default function Courses() {
  const { profile }  = useAuthStore()
  const qc           = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: getCourses,
  })

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', profile?.id],
    queryFn: () => getMyEnrollments(profile!.id),
    enabled: !!profile,
  })

  const enrolledIds = new Set(enrollments.map((e) => e.course_id))

  const toggleEnroll = useMutation({
    mutationFn: async (course: Course) => {
      if (enrolledIds.has(course.id)) await unenroll(profile!.id, course.id)
      else await enroll(profile!.id, course.id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }),
  })

  const book = useMutation({
    mutationFn: async (lesson: Lesson) => {
      const today = new Date()
      const todayDow = today.getDay()
      const diff = (lesson.day_of_week - todayDow + 7) % 7 || 7
      const date = toDateString(addDays(today, diff))
      await createBooking(profile!.id, lesson.id, date)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })

  return (
    <Layout title="Courses">
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}
      <div className="space-y-3">
        {courses.map((course) => {
          const enrolled = enrolledIds.has(course.id)
          const open     = expanded === course.id
          return (
            <div key={course.id} className="overflow-hidden rounded-2xl bg-zinc-900">
              {/* Header */}
              <div className="flex items-center gap-3 p-4">
                <div className="h-10 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: course.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{course.name}</p>
                  {course.description && (
                    <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{course.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-zinc-600">{course.lessons.length} lessons/week</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleEnroll.mutate(course)}
                    disabled={toggleEnroll.isPending}
                    className={cn(
                      'flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition',
                      enrolled
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
                    )}
                  >
                    {toggleEnroll.isPending ? <Loader2 size={12} className="animate-spin" /> : enrolled ? <Check size={12} /> : <Plus size={12} />}
                    {enrolled ? 'Enrolled' : 'Join'}
                  </button>
                  <button
                    onClick={() => setExpanded(open ? null : course.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400"
                  >
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Lessons */}
              {open && (
                <div className="border-t border-zinc-800 px-4 pb-4 pt-3 space-y-2">
                  {course.lessons
                    .filter((l) => l.is_active)
                    .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
                    .map((lesson) => (
                      <LessonRow key={lesson.id} lesson={lesson} enrolled={enrolled} onBook={() => book.mutate(lesson)} booking={book.isPending} />
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Layout>
  )
}

function LessonRow({ lesson, enrolled, onBook, booking }: { lesson: Lesson; enrolled: boolean; onBook: () => void; booking: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-zinc-800/50 px-3 py-2.5">
      <div>
        <span className="text-sm font-medium">{DAY_NAMES_FULL[lesson.day_of_week]}</span>
        {lesson.instructor_name && (
          <span className="ml-2 text-xs text-zinc-500">with {lesson.instructor_name}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-brand-400">{formatTime(lesson.start_time)}</p>
          <p className="text-[10px] text-zinc-600">{lesson.duration_minutes} min · {lesson.capacity} spots</p>
        </div>
        {enrolled && (
          <button
            onClick={onBook}
            disabled={booking}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-700 text-zinc-300 hover:bg-brand-500 hover:text-white disabled:opacity-40"
            title="Book next occurrence"
          >
            {booking ? <Loader2 size={13} className="animate-spin" /> : <CalendarPlus size={13} />}
          </button>
        )}
      </div>
    </div>
  )
}
