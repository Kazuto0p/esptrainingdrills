import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { LogoMark } from '@/components/icons'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'

export function AuthPage() {
  const navigate = useNavigate()
  const { user, signIn, signUp, loading, error, clearError, toggleDemoAdmin, isAdmin } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setNotice(null)

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (!error) {
        navigate('/progress')
      }
    } else {
      if (!displayName.trim()) {
        setNotice('Please enter a display name / callsign.')
        return
      }
      const { error } = await signUp(email, password, displayName)
      if (!error) {
        setNotice('Account created! Please check your email to confirm, or sign in.')
        setMode('signin')
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pt-[max(1.1rem,env(safe-area-inset-top))] pb-12">
      <header className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark className="h-9 w-9" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pulse">Pulse Arena</p>
            <h1 className="text-lg font-bold tracking-tight">Player Portal</h1>
          </div>
        </Link>
        <Link to="/progress" className="text-xs text-mute hover:text-white">
          ← Back
        </Link>
      </header>

      {!isSupabaseConfigured && (
        <div className="rounded-3xl border border-gold/30 bg-gold/10 p-5 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gold flex items-center gap-1.5">
              <span>⚡</span> Supabase Configuration Notice
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gold/20 text-gold font-bold">
              Action Needed
            </span>
          </div>
          <p className="text-xs text-mute leading-relaxed">
            Connect your free Supabase database to enable real user authentication, cloud sync, and the player admin directory.
          </p>
          <div className="rounded-2xl bg-black/40 p-3 text-xs space-y-1.5 font-mono text-white/80">
            <p className="text-gold font-semibold font-sans">Quick Setup Steps:</p>
            <p>1. Create project at <strong className="text-pulse">supabase.com</strong></p>
            <p>2. Run SQL script: <span className="text-iris">supabase/schema.sql</span></p>
            <p>3. Add credentials to your <span className="text-iris">.env</span> file</p>
          </div>
          <div className="pt-1">
            <Button
              full
              variant="secondary"
              onClick={() => {
                toggleDemoAdmin()
                navigate('/admin')
              }}
            >
              🚀 Launch Demo Admin Panel (Preview Mode)
            </Button>
          </div>
        </div>
      )}

      {user ? (
        <div className="panel rounded-3xl p-6 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-pulse/20 border border-pulse/40 text-pulse font-mono text-xl grid place-items-center mx-auto">
            {user.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold">Signed in as</h2>
            <p className="text-sm font-mono text-pulse mt-0.5">{user.email}</p>
            {isAdmin && (
              <span className="inline-block mt-2 rounded-full bg-coral/20 border border-coral/40 px-3 py-0.5 text-xs font-semibold text-coral">
                Admin Privileges Active
              </span>
            )}
          </div>
          <div className="grid gap-2 pt-2">
            {isAdmin && (
              <Button full onClick={() => navigate('/admin')}>
                Open Admin Directory
              </Button>
            )}
            <Button variant="secondary" full onClick={() => navigate('/progress')}>
              View Player Stats
            </Button>
          </div>
        </div>
      ) : (
        <div className="panel rounded-3xl p-6 shadow-xl border border-white/10">
          <div className="flex rounded-2xl bg-white/5 p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                clearError()
                setNotice(null)
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'signin' ? 'bg-pulse text-bg shadow' : 'text-mute hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                clearError()
                setNotice(null)
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'signup' ? 'bg-pulse text-bg shadow' : 'text-mute hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-mute mb-1.5 font-medium">
                  Player Callsign / Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. AceViper"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-pulse focus:outline-none focus:ring-1 focus:ring-pulse"
                />
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider text-mute mb-1.5 font-medium">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@example.com"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-pulse focus:outline-none focus:ring-1 focus:ring-pulse"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-mute mb-1.5 font-medium">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-pulse focus:outline-none focus:ring-1 focus:ring-pulse"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-coral/30 bg-coral/10 p-3 text-xs text-coral leading-relaxed"
              >
                {error}
              </motion.div>
            )}

            {notice && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-pulse/30 bg-pulse/10 p-3 text-xs text-pulse leading-relaxed"
              >
                {notice}
              </motion.div>
            )}

            <Button full type="submit" disabled={loading} className="mt-2 py-3.5">
              {loading ? 'Authenticating…' : mode === 'signin' ? 'Sign In to Pulse Arena' : 'Register Player'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/progress" className="text-xs text-mute hover:text-white transition-colors">
              Continue training in Guest Mode →
            </Link>
          </div>
        </div>
      )}

      <Disclaimer compact />
    </div>
  )
}
