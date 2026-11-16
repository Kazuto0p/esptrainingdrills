import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: 'player' | 'admin'
  created_at: string
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  isAdmin: boolean
  loading: boolean
  error: string | null
  demoMode: boolean
  initAuth: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  clearError: () => void
  toggleDemoAdmin: () => void
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  error: null,
  demoMode: false,

  initAuth: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false })
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null

      if (user) {
        // Fetch public profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        set({
          user,
          profile: (profile as UserProfile) ?? null,
          isAdmin: profile?.role === 'admin',
          loading: false,
        })
      } else {
        set({ user: null, profile: null, isAdmin: false, loading: false })
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        const currentUser = session?.user ?? null
        if (currentUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()

          set({
            user: currentUser,
            profile: (profile as UserProfile) ?? null,
            isAdmin: profile?.role === 'admin',
            loading: false,
          })
        } else {
          set({ user: null, profile: null, isAdmin: false, loading: false })
        }
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Auth initialization failed'
      set({ loading: false, error: message })
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null })
    if (!isSupabaseConfigured) {
      const error = new Error('Supabase is not configured yet. Please add your credentials to .env')
      set({ loading: false, error: error.message })
      return { error }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ loading: false, error: error.message })
      return { error }
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      set({
        user: data.user,
        profile: (profile as UserProfile) ?? null,
        isAdmin: profile?.role === 'admin',
        loading: false,
      })
    }

    return { error: null }
  },

  signUp: async (email: string, password: string, displayName: string) => {
    set({ loading: true, error: null })
    if (!isSupabaseConfigured) {
      const error = new Error('Supabase is not configured yet. Please add your credentials to .env')
      set({ loading: false, error: error.message })
      return { error }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role: 'player',
        },
      },
    })

    if (error) {
      set({ loading: false, error: error.message })
      return { error }
    }

    if (data.user) {
      // Profile trigger runs on server, fetch created profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      set({
        user: data.user,
        profile: (profile as UserProfile) ?? null,
        isAdmin: profile?.role === 'admin',
        loading: false,
      })
    }

    return { error: null }
  },

  signOut: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    set({ user: null, profile: null, isAdmin: false, loading: false })
  },

  clearError: () => set({ error: null }),

  toggleDemoAdmin: () => {
    const next = !get().isAdmin
    set({
      isAdmin: next,
      demoMode: true,
      profile: {
        id: 'demo-admin-id',
        email: 'admin@pulsearena.local',
        display_name: 'Commander Admin (Demo)',
        avatar_url: null,
        role: next ? 'admin' : 'player',
        created_at: new Date().toISOString(),
      },
    })
  },
}))
