import { supabase } from '../client'

export interface SwapRequest {
  id: string
  user_id: string
  original_booking_id: string
  requested_lesson_id: string
  requested_date: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_note: string | null
  created_at: string
}

export async function requestSwap(
  userId: string,
  originalBookingId: string,
  requestedLessonId: string,
  requestedDate: string,
): Promise<SwapRequest> {
  const { data, error } = await supabase
    .from('swap_requests')
    .insert({
      user_id:             userId,
      original_booking_id: originalBookingId,
      requested_lesson_id: requestedLessonId,
      requested_date:      requestedDate,
      status:              'pending',
    })
    .select()
    .single()
  if (error) throw error
  return data as SwapRequest
}

export async function getMySwapRequests(userId: string) {
  const { data, error } = await supabase
    .from('swap_requests')
    .select(`
      *,
      original_booking:bookings!original_booking_id(
        date,
        lesson:lessons(start_time, day_of_week, course:courses(name, color))
      ),
      requested_lesson:lessons(start_time, day_of_week, course:courses(name, color))
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPendingSwapRequests() {
  const { data, error } = await supabase
    .from('swap_requests')
    .select(`
      *,
      user:profiles!user_id(id, full_name),
      original_booking:bookings!original_booking_id(
        date,
        lesson:lessons(start_time, day_of_week, course:courses(name, color))
      ),
      requested_lesson:lessons!requested_lesson_id(
        start_time, day_of_week,
        course:courses(name, color)
      )
    `)
    .eq('status', 'pending')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function getAllSwapRequests() {
  const { data, error } = await supabase
    .from('swap_requests')
    .select(`
      *,
      user:profiles!user_id(id, full_name),
      original_booking:bookings!original_booking_id(
        date,
        lesson:lessons(start_time, day_of_week, course:courses(name, color))
      ),
      requested_lesson:lessons!requested_lesson_id(
        start_time, day_of_week,
        course:courses(name, color)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function approveSwap(swapRequestId: string, reviewerId: string): Promise<void> {
  // Fetch the swap request
  const { data: req, error: fetchErr } = await supabase
    .from('swap_requests')
    .select('*')
    .eq('id', swapRequestId)
    .single()
  if (fetchErr) throw fetchErr

  // Mark original booking as swapped
  const { error: bookingErr } = await supabase
    .from('bookings')
    .update({ status: 'swapped' })
    .eq('id', req.original_booking_id)
  if (bookingErr) throw bookingErr

  // Create new active booking for the swap slot
  const { error: newBookingErr } = await supabase
    .from('bookings')
    .upsert({
      user_id:           req.user_id,
      lesson_id:         req.requested_lesson_id,
      date:              req.requested_date,
      status:            'active',
      is_swap:           true,
      swap_reference_id: req.original_booking_id,
    })
  if (newBookingErr) throw newBookingErr

  // Update swap request status
  const { error: updateErr } = await supabase
    .from('swap_requests')
    .update({ status: 'approved', reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', swapRequestId)
  if (updateErr) throw updateErr

  // Notify user
  await supabase.from('notifications').insert({
    sender_id:    reviewerId,
    recipient_id: req.user_id,
    title:        'Swap approved ✓',
    body:         `Your lesson swap to ${req.requested_date} has been approved.`,
    type:         'manual',
  })
}

export async function rejectSwap(
  swapRequestId: string,
  reviewerId: string,
  note?: string,
): Promise<void> {
  const { data: req, error: fetchErr } = await supabase
    .from('swap_requests')
    .select('user_id')
    .eq('id', swapRequestId)
    .single()
  if (fetchErr) throw fetchErr

  const { error } = await supabase
    .from('swap_requests')
    .update({
      status:         'rejected',
      reviewed_by:    reviewerId,
      reviewed_at:    new Date().toISOString(),
      rejection_note: note ?? null,
    })
    .eq('id', swapRequestId)
  if (error) throw error

  await supabase.from('notifications').insert({
    sender_id:    reviewerId,
    recipient_id: req.user_id,
    title:        'Swap request declined',
    body:         note ? `Reason: ${note}` : 'Your swap request was not approved. Your original lesson remains booked.',
    type:         'manual',
  })
}
