import { supabase } from '../client'
import type { Notification } from '../types'

export async function getMyNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(`recipient_id.eq.${userId},recipient_id.is.null`)
    .order('sent_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data as Notification[]
}

export async function markRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
  if (error) throw error
}

export async function sendNotification(
  senderId: string,
  title: string,
  body: string,
  recipientId?: string,
) {
  const type = recipientId ? 'manual' : 'broadcast'
  const { data, error } = await supabase
    .from('notifications')
    .insert({ sender_id: senderId, recipient_id: recipientId ?? null, title, body, type })
    .select()
    .single()
  if (error) throw error

  // Trigger edge function for push delivery
  await supabase.functions.invoke('send-push', {
    body: { title, body, recipient_id: recipientId ?? null },
  })

  return data as Notification
}

export async function getAllNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, sender:profiles!sender_id(full_name), recipient:profiles!recipient_id(full_name)')
    .order('sent_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}
