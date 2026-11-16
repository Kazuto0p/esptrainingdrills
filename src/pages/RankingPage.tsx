import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { tests } from '@/content/catalog'
import { Button } from '@/components/ui/Button'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { LogoMark } from '@/components/icons'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'
import { useProgress } from '@/stores/progressStore'
import { formatMs, formatPct, formatWhen } from '@/lib/dates'
import { getTier } from '@/lib/scoring'
import type { RankedLeaderboardEntry, TestId } from '@/types'

// Realistic competitive esports benchmark players for drills when database is fresh
const BENCHMARK_PLAYERS: Record<TestId, Array<{ name: string; score: number; rt: number; acc: number; daysAgo: number }>> = {
  'color-reaction': [
    { name: 'ViperX', score: 985, rt: 132, acc: 100, daysAgo: 1 },
    { name: 'ApexPhantom', score: 950, rt: 148, acc: 100, daysAgo: 2 },
    { name: 'KuroSniper', score: 915, rt: 165, acc: 94, daysAgo: 3 },
    { name: 'NovaTempo', score: 860, rt: 185, acc: 94, daysAgo: 4 },
    { name: 'GhostTrigger', score: 790, rt: 210, acc: 88, daysAgo: 5 },
  ],
  'flick-aim': [
    { name: 'KuroSniper', score: 978, rt: 210, acc: 100, daysAgo: 1 },
    { name: 'ViperX', score: 945, rt: 235, acc: 95, daysAgo: 2 },
    { name: 'FlickGod', score: 902, rt: 260, acc: 92, daysAgo: 3 },
    { name: 'CrosshairPro', score: 840, rt: 295, acc: 85, daysAgo: 4 },
  ],
  'smooth-track': [
    { name: 'ApexPhantom', score: 990, rt: 0, acc: 99, daysAgo: 1 },
    { name: 'TrackMaster', score: 940, rt: 0, acc: 94, daysAgo: 2 },
    { name: 'NovaTempo', score: 875, rt: 0, acc: 87.5, daysAgo: 3 },
  ],
  'zone-recall': [
    { name: 'MinimapGod', score: 960, rt: 520, acc: 100, daysAgo: 1 },
    { name: 'ViperX', score: 920, rt: 610, acc: 100, daysAgo: 2 },
    { name: 'RadarEye', score: 880, rt: 720, acc: 80, daysAgo: 3 },
  ],
  'cooldown-memory': [
    { name: 'TempoKing', score: 970, rt: 480, acc: 100, daysAgo: 1 },
    { name: 'KuroSniper', score: 910, rt: 590, acc: 100, daysAgo: 2 },
    { name: 'ArcWatcher', score: 830, rt: 740, acc: 75, daysAgo: 3 },
  ],
  'last-hit': [
    { name: 'CreepSlayer', score: 1000, rt: 120, acc: 100, daysAgo: 1 },
    { name: 'FarmMachine', score: 933, rt: 160, acc: 93, daysAgo: 2 },
    { name: 'ViperX', score: 866, rt: 210, acc: 86, daysAgo: 3 },
  ],
  'split-signal': [
    { name: 'DualThumb', score: 955, rt: 290, acc: 100, daysAgo: 1 },
    { name: 'SplitSecond', score: 890, rt: 340, acc: 92, daysAgo: 2 },
  ],
  'shape-nback': [
    { name: 'MemoryMatrix', score: 960, rt: 310, acc: 100, daysAgo: 1 },
    { name: 'NBackPro', score: 905, rt: 360, acc: 94, daysAgo: 2 },
  ],
  'sound-ping': [
    { name: 'AudioSniper', score: 980, rt: 320, acc: 100, daysAgo: 1 },
    { name: 'StereoHunter', score: 910, rt: 380, acc: 90, daysAgo: 2 },
  ],
}

export function RankingPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [activeDrill, setActiveDrill] = useState<TestId>('color-reaction')
  const [leaderboard, setLeaderboard] = useState<RankedLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  const results = useProgress((state) => state.results)
  const getRankedAttemptsLeft = useProgress((state) => state.getRankedAttemptsLeft)
  const rankedAttemptsLeft = getRankedAttemptsLeft(activeDrill)

  // Find current user's local best Ranked score for this drill
  const localRankedBest = results
    .filter((r) => r.testId === activeDrill && r.playMode === 'ranked' && r.valid)
    .sort((a, b) => b.score - a.score)[0]

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true)
      const currentUserName = profile?.display_name || user?.email?.split('@')[0] || 'You (Guest)'
      const currentUserId = user?.id || 'current-user-id'

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('test_results')
            .select('id, user_id, score, reaction_time, accuracy, created_at, profiles(display_name, email, avatar_url)')
            .eq('test_id', activeDrill)
            .eq('mode', 'ranked')
            .eq('valid', true)
            .order('score', { ascending: false })
            .limit(100)

          if (error) throw error

          // Group by user_id to retain each player's highest ranked score
          const userBestMap = new Map<string, RankedLeaderboardEntry>()

          ;(data || []).forEach((row: any) => {
            const uid = row.user_id
            const existing = userBestMap.get(uid)
            const pName = row.profiles?.display_name || row.profiles?.email?.split('@')[0] || 'Player'

            if (!existing || row.score > existing.score) {
              userBestMap.set(uid, {
                rank: 0,
                userId: uid,
                playerName: pName,
                avatarUrl: row.profiles?.avatar_url,
                score: row.score,
                reactionTime: row.reaction_time,
                accuracy: row.accuracy,
                date: row.created_at,
                isCurrentUser: user?.id === uid,
              })
            }
          })

          // Also inject local ranked best if not already in query
          if (localRankedBest && (!user || !userBestMap.has(user.id))) {
            userBestMap.set(currentUserId, {
              rank: 0,
              userId: currentUserId,
              playerName: currentUserName,
              avatarUrl: null,
              score: localRankedBest.score,
              reactionTime: localRankedBest.reactionTime,
              accuracy: localRankedBest.accuracy,
              date: new Date(localRankedBest.timestamp).toISOString(),
              isCurrentUser: true,
            })
          }

          const sorted = Array.from(userBestMap.values()).sort((a, b) => b.score - a.score)
          sorted.forEach((item, index) => {
            item.rank = index + 1
          })

          if (sorted.length > 0) {
            setLeaderboard(sorted)
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('Could not fetch Supabase rankings, using benchmark fallback:', err)
        }
      }

      // Fallback: Combine esports benchmark roster with user's local score
      const benchmarks = (BENCHMARK_PLAYERS[activeDrill] || []).map((b, i) => ({
        rank: 0,
        userId: `bm-${i}`,
        playerName: b.name,
        avatarUrl: null,
        score: b.score,
        reactionTime: b.rt || null,
        accuracy: b.acc,
        date: new Date(Date.now() - 86400000 * b.daysAgo).toISOString(),
        isCurrentUser: false,
      }))

      if (localRankedBest) {
        benchmarks.push({
          rank: 0,
          userId: currentUserId,
          playerName: currentUserName,
          avatarUrl: null,
          score: localRankedBest.score,
          reactionTime: localRankedBest.reactionTime,
          accuracy: localRankedBest.accuracy,
          date: new Date(localRankedBest.timestamp).toISOString(),
          isCurrentUser: true,
        })
      }

      const combined = benchmarks.sort((a, b) => b.score - a.score)
      combined.forEach((item, index) => {
        item.rank = index + 1
      })

      setLeaderboard(combined)
      setLoading(false)
    }

    fetchRankings()
  }, [activeDrill, user, profile, localRankedBest])

  const userEntry = leaderboard.find((entry) => entry.isCurrentUser)
  const activeDrillMeta = tests.find((t) => t.id === activeDrill)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-[max(1.1rem,env(safe-area-inset-top))] pb-16">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-9 w-9" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Official Ladder</p>
            <h1 className="text-xl font-bold tracking-tight">Competitive Rankings</h1>
          </div>
        </div>
        <Link
          to={`/play/${activeDrill}`}
          className="rounded-2xl border border-gold/40 bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/25 transition-colors"
        >
          ⚔️ Play Ranked
        </Link>
      </header>

      {/* Drill Switcher Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tests.map((drill) => {
          const isActive = drill.id === activeDrill
          return (
            <button
              key={drill.id}
              type="button"
              onClick={() => setActiveDrill(drill.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'border-gold bg-gold/20 text-gold shadow-glow'
                  : 'border-white/10 bg-white/5 text-white/70 hover:text-white'
              }`}
            >
              {drill.title}
            </button>
          )
        })}
      </div>

      {/* Active Drill Banner & User Status */}
      <section className="panel rounded-3xl p-4 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-mute">Active Discipline</span>
            <h2 className="text-lg font-bold text-white">{activeDrillMeta?.title}</h2>
            <p className="text-xs text-mute mt-0.5">{activeDrillMeta?.goal}</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono text-mute">Daily Ranked Reps:</span>
            <p className={`font-mono text-sm font-bold ${rankedAttemptsLeft > 0 ? 'text-pulse' : 'text-coral'}`}>
              {rankedAttemptsLeft}/2 Remaining
            </p>
          </div>
        </div>

        {/* User's position highlight bar */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gold font-bold">Your Standing:</span>
            {userEntry ? (
              <span className="font-mono font-bold text-white">
                Rank #{userEntry.rank} • {userEntry.score} MMR
              </span>
            ) : (
              <span className="text-mute italic">Unranked (No ranked reps yet today)</span>
            )}
          </div>
          {rankedAttemptsLeft > 0 && (
            <Button
              className="text-xs py-1 px-3 h-auto"
              onClick={() => navigate(`/play/${activeDrill}`)}
            >
              Play Now ({rankedAttemptsLeft} left)
            </Button>
          )}
        </div>
      </section>

      {/* Leaderboard Table */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">
            Top Ranked Competitors
          </h3>
          <span className="text-[11px] text-mute font-mono">Ranked Mode Only</span>
        </div>

        {loading ? (
          <div className="panel rounded-3xl p-8 text-center text-xs text-mute">Loading ladder standings…</div>
        ) : leaderboard.length === 0 ? (
          <div className="panel rounded-3xl p-8 text-center text-xs text-mute">
            No ranked scores logged yet. Be the first to rank!
          </div>
        ) : (
          <ul className="panel divide-y divide-white/5 rounded-3xl overflow-hidden">
            {leaderboard.map((entry) => {
              const tier = getTier(entry.score)
              const isTop3 = entry.rank <= 3

              return (
                <motion.li
                  key={`${entry.userId}-${entry.rank}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-3 p-3.5 transition-colors ${
                    entry.isCurrentUser
                      ? 'bg-pulse/10 border-l-4 border-pulse font-semibold'
                      : 'hover:bg-white/5'
                  }`}
                >
                  {/* Rank Badge */}
                  <div className="w-8 shrink-0 text-center">
                    {entry.rank === 1 ? (
                      <span className="text-xl" title="1st Place Gold">🥇</span>
                    ) : entry.rank === 2 ? (
                      <span className="text-xl" title="2nd Place Silver">🥈</span>
                    ) : entry.rank === 3 ? (
                      <span className="text-xl" title="3rd Place Bronze">🥉</span>
                    ) : (
                      <span className="font-mono text-sm font-bold text-mute">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm truncate ${entry.isCurrentUser ? 'text-pulse font-bold' : 'text-white'}`}>
                        {entry.playerName}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="rounded bg-pulse/20 text-pulse border border-pulse/40 px-1.5 py-0.2 text-[9px] font-bold">
                          YOU
                        </span>
                      )}
                      <span
                        className="rounded-full px-1.5 py-0.2 text-[9px] font-semibold border"
                        style={{
                          color: tier.color,
                          backgroundColor: tier.bg,
                          borderColor: `${tier.color}40`,
                        }}
                      >
                        {tier.title.split(' ')[0]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-mute mt-0.5">
                      <span>{formatWhen(new Date(entry.date).getTime())}</span>
                      {entry.reactionTime != null && (
                        <>
                          <span>•</span>
                          <span className="text-iris">{formatMs(entry.reactionTime)}</span>
                        </>
                      )}
                      {entry.accuracy != null && (
                        <>
                          <span>•</span>
                          <span className="text-gold">{formatPct(entry.accuracy)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className={`font-mono text-base font-bold ${isTop3 ? 'text-gold' : 'text-white'}`}>
                      {entry.score}
                    </p>
                    <p className="text-[10px] text-mute font-mono">MMR</p>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        )}
      </section>

      <Disclaimer compact />
    </div>
  )
}
