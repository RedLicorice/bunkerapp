// Called by admin to send individual or broadcast push notification
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_MAILTO      = Deno.env.get('VAPID_MAILTO') ?? 'mailto:admin@gym.com'

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const { title, body, recipient_id } = await req.json()
  if (!title || !body) return new Response('Missing title/body', { status: 400 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let query = supabase.from('push_subscriptions').select('endpoint, p256dh, auth_key, user_id')
  if (recipient_id) query = query.eq('user_id', recipient_id)

  const { data: subs, error } = await query
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const webpush = (await import('npm:web-push')).default
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  let sent = 0
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({ title, body, icon: '/icon-192.png' }),
      )
      sent++
    } catch (e) {
      console.error('Push failed for', sub.user_id, e)
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
