import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { LogoMark } from '@/components/icons'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'
import { formatMs, formatWhen } from '@/lib/dates'
import { getTier } from '@/lib/scoring'
import { tests } from '@/content/catalog'

interface AdminPlayer {
  id: string
  email: string
  display_name: string | null
  role: 'player' | 'admin'
  created_at: string
  attemptsCount: number
  avgScore: number
  bestScore: number
  bestReaction: number | null
  flaggedCount: number
}

interface AttemptDetail {
  id: string
  test_id: string
  score: number
  reaction_time: number | null
  accuracy: number
  valid: boolean
  flags: string[]
  created_at: string
}

// Fallback demo players for immediate preview when database is fresh or unconfigured
const DEMO_PLAYERS: AdminPlayer[] = [
  {
    id: 'usr-1',
    email: 'viper.pro@esports.gg',
    display_name: 'ViperX',
    role: 'admin',
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    attemptsCount: 84,
    avgScore: 955,
    bestScore: 992,
    bestReaction: 142,
    flaggedCount: 0,
  },
  {
    id: 'usr-2',
    email: 'kuro.aim@mobilelegends.io',
    display_name: 'KuroSniper',
    role: 'player',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    attemptsCount: 42,
    avgScore: 820,
    bestScore: 890,
    bestReaction: 178,
    flaggedCount: 1,
  },
  {
    id: 'usr-3',
    email: 'nova.tempo@bgmi.in',
    display_name: 'NovaTempo',
    role: 'player',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    attemptsCount: 19,
    avgScore: 685,
    bestScore: 740,
    bestReaction: 215,
    flaggedCount: 0,
  },
  {
    id: 'usr-4',
    email: 'bot_suspect@automated.xyz',
    display_name: 'MacroUser99',
    role: 'player',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    attemptsCount: 28,
    avgScore: 980,
    bestScore: 1000,
    bestReaction: 45,
    flaggedCount: 14,
  },
]

export function AdminPage() {
  const navigate = useNavigate()
  const { user, profile, isAdmin, toggleDemoAdmin, signOut } = useAuth()
  const [players, setPlayers] = useState<AdminPlayer[]>(DEMO_PLAYERS)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'player' | 'admin'>('all')
  const [selectedPlayer, setSelectedPlayer] = useState<AdminPlayer | null>(null)
  const [playerAttempts, setPlayerAttempts] = useState<AttemptDetail[]>([])
  const [attemptsLoading, setAttemptsLoading] = useState(false)
  const [tab, setTab] = useState<'players' | 'audits'>('players')

  // Fetch real players from Supabase if configured & user is admin
  useEffect(() => {
    async function fetchPlayers() {
      if (!isSupabaseConfigured || !isAdmin) return
      setLoading(true)
      try {
        const { data: profilesData, error: pError } = await supabase
          .from('profiles')
          .select('id, email, display_name, role, created_at')
          .order('created_at', { ascending: false })

        if (pError) throw pError

        // Fetch test results aggregate
        const { data: resultsData, error: rError } = await supabase
          .from('test_results')
          .select('id, user_id, score, reaction_time, valid, flags, created_at')

        if (rError) throw rError

        const mapped: AdminPlayer[] = (profilesData || []).map((p) => {
          const userResults = (resultsData || []).filter((r) => r.user_id === p.id)
          const validResults = userResults.filter((r) => r.valid)
          const scores = validResults.map((r) => r.score)
          const rts = validResults.map((r) => r.reaction_time).filter((t): t is number => t != null)
          const flagged = userResults.filter((r) => !r.valid).length

          return {
            id: p.id,
            email: p.email,
            display_name: p.display_name,
            role: p.role,
            created_at: p.created_at,
            attemptsCount: userResults.length,
            avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
            bestScore: scores.length ? Math.max(...scores) : 0,
            bestReaction: rts.length ? Math.min(...rts) : null,
            flaggedCount: flagged,
          }
        })

        if (mapped.length > 0) {
          setPlayers(mapped)
        }
      } catch (err) {
        console.warn('Could not load players from Supabase, showing demo data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [isAdmin])

  // Fetch individual player's attempts when selected
  const handleSelectPlayer = async (p: AdminPlayer) => {
    setSelectedPlayer(p)
    setAttemptsLoading(true)

    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false })
        .limit(20)

      setPlayerAttempts((data as AttemptDetail[]) || [])
    } else {
      // Demo mock attempts
      setPlayerAttempts([
        {
          id: 'att-1',
          test_id: 'color-reaction',
          score: p.bestScore,
          reaction_time: p.bestReaction,
          accuracy: 100,
          valid: p.flaggedCount === 0 || p.bestReaction! >= 100,
          flags: p.bestReaction && p.bestReaction < 100 ? ['impossible-rt'] : [],
          created_at: new Date().toISOString(),
        },
        {
          id: 'att-2',
          test_id: 'flick-aim',
          score: Math.max(0, p.bestScore - 40),
          reaction_time: p.bestReaction ? p.bestReaction + 45 : 240,
          accuracy: 94,
          valid: true,
          flags: [],
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
      ])
    }
    setAttemptsLoading(false)
  }

  // Toggle role in Supabase
  const handleToggleRole = async (targetPlayer: AdminPlayer) => {
    const nextRole = targetPlayer.role === 'admin' ? 'player' : 'admin'
    if (isSupabaseConfigured) {
      await supabase.from('profiles').update({ role: nextRole }).eq('id', targetPlayer.id)
    }
    setPlayers((prev) =>
      prev.map((pl) => (pl.id === targetPlayer.id ? { ...pl, role: nextRole } : pl))
    )
    if (selectedPlayer?.id === targetPlayer.id) {
      setSelectedPlayer((prev) => (prev ? { ...prev, role: nextRole } : null))
    }
  }

  // Access Guard if not Admin
  if (!isAdmin) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pt-[max(1.1rem,env(safe-area-inset-top))] pb-12">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark className="h-9 w-9" />
            <h1 className="text-lg font-bold">Admin Command Guard</h1>
          </Link>
          <Link to="/progress" className="text-xs text-mute hover:text-white">
            ← Back
          </Link>
        </header>

        <div className="panel rounded-3xl p-6 text-center space-y-4 border border-coral/30">
          <div className="h-16 w-16 rounded-full bg-coral/15 border border-coral/40 text-coral font-bold text-2xl grid place-items-center mx-auto">
            🔒
          </div>
          <h2 className="text-xl font-bold tracking-tight">Admin Privileges Required</h2>
          <p className="text-sm text-mute leading-relaxed">
            This area is restricted to esports tournament organizers and team coaches.
            {user
              ? ` You are signed in as ${user.email}, but your role is currently "${profile?.role || 'player'}".`
              : ' You are currently not signed in.'}
          </p>

          <div className="rounded-2xl bg-black/50 p-4 text-left font-mono text-xs space-y-2 border border-white/10">
            <p className="text-pulse font-sans font-semibold">How to grant yourself Admin:</p>
            <p className="text-white/80">In your Supabase SQL Editor, run:</p>
            <div className="bg-black/70 p-2.5 rounded-xl border border-white/10 text-gold break-all">
              UPDATE public.profiles SET role = 'admin' WHERE email = '{user?.email || 'your-email@example.com'}';
            </div>
          </div>

          <div className="grid gap-2 pt-2">
            <Button
              full
              onClick={() => {
                toggleDemoAdmin()
              }}
            >
              🚀 Bypass (Enter Preview Admin Mode)
            </Button>
            {!user ? (
              <Button variant="secondary" full onClick={() => navigate('/auth')}>
                Sign In to Admin Account
              </Button>
            ) : (
              <Button variant="ghost" full onClick={() => signOut()}>
                Sign Out
              </Button>
            )}
          </div>
        </div>

        <Disclaimer compact />
      </div>
    )
  }

  // Filtered players list
  const filtered = players.filter((p) => {
    const matchSearch =
      (p.display_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      p.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || p.role === roleFilter
    return matchSearch && matchRole
  })

  // KPI Calculations
  const totalRuns = players.reduce((sum, p) => sum + p.attemptsCount, 0)
  const totalFlagged = players.reduce((sum, p) => sum + p.flaggedCount, 0)
  const activeAvgScore = Math.round(
    players.length ? players.reduce((sum, p) => sum + p.avgScore, 0) / players.length : 0
  )

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-[max(1.1rem,env(safe-area-inset-top))] pb-16">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-9 w-9" />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-coral">Command HQ</p>
              <span className="rounded bg-coral/20 border border-coral/40 px-1.5 py-0.2 text-[9px] font-bold text-coral uppercase">
                Admin
              </span>
            </div>
            <h1 className="text-lg font-bold tracking-tight">Player Intelligence</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/progress" className="text-xs text-mute hover:text-white px-2 py-1">
            Portal
          </Link>
          <Button variant="ghost" className="text-xs px-2.5 py-1" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-4 gap-2">
        <div className="panel rounded-2xl p-2.5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-mute">Players</p>
          <p className="mt-0.5 font-mono text-lg font-bold text-white">{players.length}</p>
        </div>
        <div className="panel rounded-2xl p-2.5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-mute">Total Runs</p>
          <p className="mt-0.5 font-mono text-lg font-bold text-iris">{totalRuns}</p>
        </div>
        <div className="panel rounded-2xl p-2.5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-mute">Avg MMR</p>
          <p className="mt-0.5 font-mono text-lg font-bold text-pulse">{activeAvgScore}</p>
        </div>
        <div className="panel rounded-2xl p-2.5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-mute">Flags</p>
          <p className="mt-0.5 font-mono text-lg font-bold text-coral">{totalFlagged}</p>
        </div>
      </section>

      {/* Admin Tabs */}
      <div className="flex rounded-2xl bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setTab('players')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
            tab === 'players' ? 'bg-pulse text-bg shadow' : 'text-mute hover:text-white'
          }`}
        >
          All Players ({players.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('audits')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
            tab === 'audits' ? 'bg-pulse text-bg shadow' : 'text-mute hover:text-white'
          }`}
        >
          Anti-Cheat Audits ({totalFlagged})
        </button>
      </div>

      {tab === 'players' && (
        <section className="space-y-3">
          {/* Search & Filter Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by callsign or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-pulse focus:outline-none"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | 'player' | 'admin')}
              className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white focus:border-pulse focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="player">Players</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          {/* Player List */}
          {loading ? (
            <div className="panel rounded-3xl p-8 text-center text-xs text-mute">Loading database roster…</div>
          ) : filtered.length === 0 ? (
            <div className="panel rounded-3xl p-8 text-center text-xs text-mute">No players match the criteria.</div>
          ) : (
            <ul className="panel divide-y divide-white/5 rounded-3xl overflow-hidden">
              {filtered.map((p) => {
                const tier = getTier(p.avgScore)
                return (
                  <li key={p.id} className="p-3.5 hover:bg-white/5 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-white truncate">
                            {p.display_name || 'Anonymous'}
                          </span>
                          {p.role === 'admin' ? (
                            <span className="rounded bg-coral/20 border border-coral/40 px-1.5 py-0.5 text-[9px] font-bold text-coral">
                              ADMIN
                            </span>
                          ) : (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-mute font-mono">
                              PLAYER
                            </span>
                          )}
                          {p.flaggedCount > 0 && (
                            <span className="rounded bg-gold/20 text-gold border border-gold/40 px-1.5 py-0.5 text-[9px] font-bold">
                              {p.flaggedCount} FLAG{p.flaggedCount > 1 ? 'S' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-mute truncate mt-0.5">{p.email}</p>
                        <div className="flex items-center gap-3 text-[11px] text-mute mt-2">
                          <span>{p.attemptsCount} drills</span>
                          <span>•</span>
                          <span className="text-white/90">Best: {p.bestScore}</span>
                          <span>•</span>
                          <span>{p.bestReaction ? formatMs(p.bestReaction) : '—'}</span>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span
                          className="rounded-full px-2 py-0.5 font-semibold text-[10px] border"
                          style={{
                            color: tier.color,
                            backgroundColor: tier.bg,
                            borderColor: `${tier.color}40`,
                          }}
                        >
                          {tier.title}
                        </span>
                        <Button
                          variant="secondary"
                          className="text-[11px] py-1 px-2.5 h-auto"
                          onClick={() => handleSelectPlayer(p)}
                        >
                          Inspect →
                        </Button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {tab === 'audits' && (
        <section className="space-y-3">
          <p className="text-xs text-mute">
            Real-time feed of attempts that triggered anti-cheat algorithmic gates (impossible speed, zero variance bot patterns, or rate-limits).
          </p>
          <div className="panel divide-y divide-white/5 rounded-3xl overflow-hidden">
            {players
              .filter((p) => p.flaggedCount > 0)
              .map((p) => (
                <div key={p.id} className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gold">{p.display_name}</span>
                    <span className="text-[10px] font-mono text-mute">{p.email}</span>
                  </div>
                  <p className="text-xs text-mute">
                    Total Flagged Submissions: <strong className="text-coral">{p.flaggedCount}</strong>
                  </p>
                  <div className="rounded-xl bg-black/40 p-2 text-[11px] font-mono text-coral/90">
                    Flag triggers: impossible-rt (&lt;80ms), robotic jitter (&sigma;&lt;11ms)
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Selected Player Detail Modal */}
      <AnimatePresence>
        {selectedPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="panel w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl p-5 space-y-4 border border-white/15"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-pulse">
                    Player File
                  </span>
                  <h3 className="text-lg font-bold text-white">{selectedPlayer.display_name}</h3>
                  <p className="text-xs font-mono text-mute">{selectedPlayer.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlayer(null)}
                  className="rounded-full bg-white/10 p-1.5 text-mute hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Player Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/5 p-2.5 text-center">
                  <p className="text-[10px] uppercase text-mute">Avg MMR</p>
                  <p className="font-mono text-base font-bold text-pulse">{selectedPlayer.avgScore}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-2.5 text-center">
                  <p className="text-[10px] uppercase text-mute">Best Reaction</p>
                  <p className="font-mono text-base font-bold text-iris">
                    {selectedPlayer.bestReaction ? formatMs(selectedPlayer.bestReaction) : '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 p-2.5 text-center">
                  <p className="text-[10px] uppercase text-mute">Joined</p>
                  <p className="font-mono text-xs text-white/80 mt-1">
                    {formatWhen(new Date(selectedPlayer.created_at).getTime())}
                  </p>
                </div>
              </div>

              {/* Role Toggle Button */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">Current Access Tier</p>
                  <p className="text-[11px] text-mute">
                    Role: <strong className="text-pulse uppercase">{selectedPlayer.role}</strong>
                  </p>
                </div>
                <Button
                  variant={selectedPlayer.role === 'admin' ? 'danger' : 'secondary'}
                  className="text-xs py-1 px-3"
                  onClick={() => handleToggleRole(selectedPlayer)}
                >
                  {selectedPlayer.role === 'admin' ? 'Demote to Player' : 'Promote to Admin'}
                </Button>
              </div>

              {/* Recent Attempts History */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-mute mb-2">
                  Recent Drill Logs
                </h4>
                {attemptsLoading ? (
                  <p className="text-xs text-mute py-3 text-center">Loading attempts…</p>
                ) : playerAttempts.length === 0 ? (
                  <p className="text-xs text-mute py-3 text-center">No logged attempts yet.</p>
                ) : (
                  <ul className="divide-y divide-white/5 rounded-2xl bg-black/40 border border-white/5 overflow-hidden">
                    {playerAttempts.map((att) => {
                      const testMeta = tests.find((t) => t.id === att.test_id)
                      return (
                        <li key={att.id} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-medium text-white">{testMeta?.title || att.test_id}</p>
                            <p className="text-[10px] text-mute">
                              {att.valid ? (
                                <span className="text-pulse">Verified</span>
                              ) : (
                                <span className="text-gold">Flagged: {att.flags.join(', ')}</span>
                              )}
                              {' • '}
                              {att.reaction_time ? formatMs(att.reaction_time) : 'No RT'}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-white text-sm">{att.score}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <Button full variant="ghost" onClick={() => setSelectedPlayer(null)}>
                Close Dossier
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Disclaimer compact />
    </div>
  )
}
