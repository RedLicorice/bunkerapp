import { useEffect } from 'react'
import { supabase } from '@bunker/supabase'
import { useAuthStore } from '@/store/auth'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export function useAuthInit() {
  const { setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) fetchProfile(session.user.id, session.access_token)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id, session.access_token)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string, accessToken: string) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
        { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${accessToken}` } },
      )
      const rows = await r.json()
      setProfile(Array.isArray(rows) ? rows[0] ?? null : null)
    } catch {
      setProfile(null)
    }
  }
}
