import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { getCourses, upsertCourse, deleteCourse, upsertLesson, deleteLesson } from '@bunker/supabase'
import type { Course, Lesson } from '@bunker/supabase'
import { useAuthStore } from '@/store/auth'
import { Layout } from '@/components/Layout'
import { cn, DAY_NAMES_FULL, formatTime } from '@/lib/utils'

const COLORS = ['#f97316','#3b82f6','#22c55e','#a855f7','#ec4899','#eab308','#14b8a6']

export default function Courses() {
  const { profile }  = useAuthStore()
  const qc           = useQueryClient()
  const [expanded, setExpanded]           = useState<string | null>(null)
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null)
  const [editingLesson, setEditingLesson] = useState<{ lesson: Partial<Lesson>; courseId: string } | null>(null)

  const { data: courses = [], isLoading } = useQuery({ queryKey: ['courses'], queryFn: getCourses })

  const saveCourse = useMutation({
    mutationFn: (c: Partial<Course>) => upsertCourse({ ...c, owner_id: profile!.id } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); setEditingCourse(null) },
  })
  const removeCourse = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
  const saveLesson = useMutation({
    mutationFn: (l: Partial<Lesson> & { course_id: string }) => upsertLesson(l),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); setEditingLesson(null) },
  })
  const removeLesson = useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })

  return (
    <Layout
      title="Courses"
      action={
        <button
          onClick={() => setEditingCourse({ name: '', color: '#f97316', is_active: true })}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={16} /> New course
        </button>
      }
    >
      {isLoading && <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>}

      <div className="space-y-3">
        {courses.map((course) => {
          const open = expanded === course.id
          return (
            <div key={course.id} className="rounded-2xl bg-zinc-900 overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="h-10 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: course.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{course.name}</p>
                  {course.description && <p className="text-xs text-zinc-500 truncate">{course.description}</p>}
                  <p className="text-xs text-zinc-600">{course.lessons.filter(l => l.is_active).length} active lessons</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setEditingCourse(course)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-50">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => removeCourse.mutate(course.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-red-900/60 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => setExpanded(open ? null : course.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {open && (
                <div className="border-t border-zinc-800 p-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Lessons</p>
                    <button
                      onClick={() => setEditingLesson({
                        lesson: { day_of_week: 1, start_time: '09:00', duration_minutes: 60, capacity: 20 },
                        courseId: course.id,
                      })}
                      className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-50"
                    >
                      <Plus size={12} /> Add lesson
                    </button>
                  </div>
                  {course.lessons.filter(l => l.is_active).sort((a,b) => a.day_of_week - b.day_of_week).map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-xl bg-zinc-800/50 px-3 py-2.5">
                      <div>
                        <span className="text-sm font-medium">{DAY_NAMES_FULL[l.day_of_week]}</span>
                        {l.instructor_name && <span className="ml-2 text-xs text-zinc-500">{l.instructor_name}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-brand-400">{formatTime(l.start_time)}</span>
                        <button onClick={() => setEditingLesson({ lesson: l, courseId: course.id })} className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400 hover:text-zinc-50">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => removeLesson.mutate(l.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400 hover:bg-red-900/60 hover:text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Course modal */}
      {editingCourse !== null && (
        <CourseModal
          course={editingCourse}
          onSave={(c) => saveCourse.mutate(c)}
          onClose={() => setEditingCourse(null)}
          saving={saveCourse.isPending}
        />
      )}

      {/* Lesson modal */}
      {editingLesson !== null && (
        <LessonModal
          lesson={editingLesson.lesson}
          courseId={editingLesson.courseId}
          onSave={(l) => saveLesson.mutate({ ...l, course_id: editingLesson.courseId })}
          onClose={() => setEditingLesson(null)}
          saving={saveLesson.isPending}
        />
      )}
    </Layout>
  )
}

function CourseModal({ course, onSave, onClose, saving }: {
  course: Partial<Course>; onSave: (c: Partial<Course>) => void; onClose: () => void; saving: boolean
}) {
  const [form, setForm] = useState({ name: course.name ?? '', description: course.description ?? '', color: course.color ?? '#f97316' })
  return (
    <Modal title={course.id ? 'Edit course' : 'New course'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={input} />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={input} />
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                className={cn('h-8 w-8 rounded-full border-2 transition', form.color === c ? 'border-white scale-110' : 'border-transparent')}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </Field>
        <ModalActions onClose={onClose} onSave={() => onSave({ ...course, ...form })} saving={saving} />
      </div>
    </Modal>
  )
}

function LessonModal({ lesson, courseId: _courseId, onSave, onClose, saving }: {
  lesson: Partial<Lesson>; courseId: string; onSave: (l: Partial<Lesson>) => void; onClose: () => void; saving: boolean
}) {
  const [form, setForm] = useState({
    day_of_week:      lesson.day_of_week ?? 1,
    start_time:       lesson.start_time?.slice(0,5) ?? '09:00',
    duration_minutes: lesson.duration_minutes ?? 60,
    capacity:         lesson.capacity ?? 20,
    instructor_name:  lesson.instructor_name ?? '',
    location:         lesson.location ?? '',
  })
  return (
    <Modal title={lesson.id ? 'Edit lesson' : 'New lesson'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Day">
          <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: +e.target.value }))} className={input}>
            {DAY_NAMES_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className={input} />
          </Field>
          <Field label="Duration (min)">
            <input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: +e.target.value }))} className={input} />
          </Field>
        </div>
        <Field label="Capacity">
          <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))} className={input} />
        </Field>
        <Field label="Instructor">
          <input value={form.instructor_name} onChange={e => setForm(f => ({ ...f, instructor_name: e.target.value }))} className={input} placeholder="Optional" />
        </Field>
        <Field label="Location">
          <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={input} placeholder="Optional" />
        </Field>
        <ModalActions onClose={onClose} onSave={() => onSave({ ...lesson, ...form })} saving={saving} />
      </div>
    </Modal>
  )
}

// Shared primitives
const input = 'w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-50 focus:border-brand-500 focus:outline-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>{children}</div>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-zinc-900 p-5 shadow-2xl">
        <h2 className="mb-4 text-base font-bold">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function ModalActions({ onClose, onSave, saving }: { onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="flex gap-3 pt-1">
      <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-50">Cancel</button>
      <button onClick={onSave} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
        {saving && <Loader2 size={14} className="animate-spin" />} Save
      </button>
    </div>
  )
}
