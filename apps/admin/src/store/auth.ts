import { create } from 'zustand'
import { supabase } from '@bunker/supabase'
import type { Profile } from '@bunker/supabase'
import type { Session } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  setSession: (s: Session | null) => void
  setProfile:  (p: Profile | null) => void
  setLoading:  (v: boolean) => void
  setProfileLoading: (v: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null, profile: null, loading: true, profileLoading: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setProfileLoading: (profileLoading) => set({ profileLoading }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },
}))
