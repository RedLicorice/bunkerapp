import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_MAILTO      = Deno.env.get('VAPID_MAILTO') ?? 'mailto:admin@gym.com'

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: object,
) {
  // Dynamic import so Deno resolves the npm module at runtime
  const webpush = (await import('npm:web-push')).default
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  return webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
    JSON.stringify(payload),
  )
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now    = new Date()
  const target = new Date(now.getTime() + 15 * 60 * 1000)

  const targetTime = target.toTimeString().slice(0, 8)  // HH:MM:SS
  const targetDay  = target.getDay()
  const targetDate = target.toISOString().slice(0, 10)

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      user_id,
      lesson:lessons!inner(
        start_time,
        day_of_week,
        course:courses(name)
      ),
      profile:profiles!inner(id),
      push_subscriptions(endpoint, p256dh, auth_key)
    `)
    .eq('date', targetDate)
    .eq('status', 'active')
    .eq('lessons.day_of_week', targetDay)
    .eq('lessons.start_time', targetTime)

  if (error) {
    console.error('Query error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let sent = 0
  for (const booking of bookings ?? []) {
    const lesson = booking.lesson as any
    const subs   = (booking as any).push_subscriptions ?? []
    for (const sub of subs) {
      try {
        await sendWebPush(sub, {
          title: `${lesson.course.name} in 15 min!`,
          body:  `Lesson starts at ${String(lesson.start_time).slice(0, 5)}`,
          icon:  '/icon-192.png',
          badge: '/icon-96.png',
        })
        sent++
      } catch (e) {
        console.error('Push failed:', e)
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
