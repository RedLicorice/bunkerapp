import { supabase } from '../client'
import type { Booking, BookingWithLesson, Enrollment, EnrollmentWithCourse } from '../types'

export async function getMyEnrollments(userId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, course:courses(*, lessons(*))')
    .eq('user_id', userId)
    .eq('is_active', true)
  if (error) throw error
  return data as EnrollmentWithCourse[]
}

export async function enroll(userId: string, courseId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .upsert({ user_id: userId, course_id: courseId, is_active: true })
    .select()
    .single()
  if (error) throw error
  return data as Enrollment
}

export async function unenroll(userId: string, courseId: string) {
  const { error } = await supabase
    .from('enrollments')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('course_id', courseId)
  if (error) throw error
}

export async function getMyBookings(userId: string, from: string, to: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, lesson:lessons(*, course:courses(*))')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .neq('status', 'cancelled')
    .order('date')
  if (error) throw error
  return data as BookingWithLesson[]
}

export async function createBooking(userId: string, lessonId: string, date: string, isSwap = false, swapReferenceId?: string) {
  const { data, error } = await supabase
    .from('bookings')
    .upsert({
      user_id: userId,
      lesson_id: lessonId,
      date,
      status: 'active',
      is_swap: isSwap,
      swap_reference_id: swapReferenceId ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as Booking
}

export async function cancelBooking(bookingId: string) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
  if (error) throw error
}

export async function swapBooking(originalBookingId: string, newLessonId: string, newDate: string, userId: string) {
  // Mark original as swapped
  await supabase.from('bookings').update({ status: 'swapped' }).eq('id', originalBookingId)
  // Create swap booking
  return createBooking(userId, newLessonId, newDate, true, originalBookingId)
}

export async function getAllBookings(from: string, to: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, lesson:lessons(*, course:courses(*)), user:profiles(id, full_name)')
    .gte('date', from)
    .lte('date', to)
    .order('date')
  if (error) throw error
  return data
}
