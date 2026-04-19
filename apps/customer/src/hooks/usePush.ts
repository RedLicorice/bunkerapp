import { supabase } from '@bunker/supabase'
import { useAuthStore } from '@/store/auth'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function registerPush() {
  const { session } = useAuthStore.getState()
  if (!session) return

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const registration = await navigator.serviceWorker.ready
  const permission   = await Notification.requestPermission()
  if (permission !== 'granted') return

  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const json = sub.toJSON()
  await supabase.from('push_subscriptions').upsert({
    user_id:  session.user.id,
    endpoint: json.endpoint!,
    p256dh:   (json.keys as any).p256dh,
    auth_key: (json.keys as any).auth,
  }, { onConflict: 'endpoint' })
}
