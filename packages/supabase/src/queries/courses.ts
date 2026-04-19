import { supabase } from '../client'
import type { Course, Lesson } from '../types'

export async function getCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*, lessons(*)')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data as (Course & { lessons: Lesson[] })[]
}

export async function getCourse(id: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*, lessons(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Course & { lessons: Lesson[] }
}

export async function upsertCourse(course: Partial<Course> & { owner_id: string; name: string }) {
  const { data, error } = await supabase.from('courses').upsert(course).select().single()
  if (error) throw error
  return data as Course
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from('courses').update({ is_active: false }).eq('id', id)
  if (error) throw error
}

export async function upsertLesson(lesson: Partial<Lesson> & { course_id: string }) {
  const { data, error } = await supabase.from('lessons').upsert(lesson).select().single()
  if (error) throw error
  return data as Lesson
}

export async function deleteLesson(id: string) {
  const { error } = await supabase.from('lessons').update({ is_active: false }).eq('id', id)
  if (error) throw error
}
