import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { SaveOutcome } from '@/types'
import { getTestCopy } from '@/content/catalog'
import { Button } from '@/components/ui/Button'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { FLAG_COPY } from '@/lib/anticheat'
import { playResultChime } from '@/lib/audio'
import { triggerHaptic } from '@/lib/haptics'
import { formatMs, formatPct, formatWhen } from '@/lib/dates'
import { getTier, pickTip } from '@/lib/scoring'
import { GameHeader } from '@/components/test/GameHeader'
import { useProgress } from '@/stores/progressStore'

function useCountUp(target: number): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setValue(target)
      return
    }
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 520)
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return value
}

export function ResultsPanel({
  outcome,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onExit,
}: {
  outcome: SaveOutcome
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  onExit: () => void
}) {
  const navigate = useNavigate()
  const copy = getTestCopy(outcome.result.testId)
  const shown = useCountUp(outcome.result.score)
  const tip = copy
    ? pickTip(copy.tips, outcome.result.accuracy, outcome.result.reactionTime, 340)
    : 'Run it back while the feel is still in your hands.'
  const tier = getTier(outcome.result.score)

  const mode = outcome.result.playMode ?? 'classic'
  const isRanked = mode === 'ranked'
  const isClassic = mode === 'classic'

  // Retrieve current 5-slot Classic record for this drill
  const classicRecord = outcome.classicRecord ?? useProgress.getState().getClassicRecord(outcome.result.testId)
  const isNewHighestClassic = isClassic && classicRecord.highest?.id === outcome.result.id

  // Retrieve remaining ranked attempts
  const rankedAttemptsLeft = outcome.rankedAttemptsLeft ?? useProgress.getState().getRankedAttemptsLeft(outcome.result.testId)

  useEffect(() => {
    playResultChime(outcome.result.valid)
    triggerHaptic(outcome.result.valid ? 'success' : 'warning')
  }, [outcome])

  const delta =
    outcome.previousScore == null ? null : outcome.result.score - outcome.previousScore

  return (
    <div className="flex h-full flex-col">
      <GameHeader title={copy?.title ?? 'Result'} onExit={onExit} />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6 pt-2">
        {/* Mode Tag */}
        <div className="flex items-center justify-between">
          {isRanked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 border border-gold/40 px-3 py-1 text-xs font-bold text-gold">
              <span>🏆</span> Ranked Qualifier Attempt
            </span>
          ) : isClassic ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-iris/20 border border-iris/40 px-3 py-1 text-xs font-bold text-iris">
              <span>🎮</span> Classic Practice Rep
            </span>
          ) : (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">Warm-up Drill</span>
          )}

          {isRanked && (
            <span className="text-xs font-mono text-mute">
              {rankedAttemptsLeft > 0 ? (
                <span className="text-pulse">{rankedAttemptsLeft}/2 left today</span>
              ) : (
                <span className="text-coral">Daily limit reached (0/2)</span>
              )}
            </span>
          )}
        </div>

        {/* Score Card */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel rounded-3xl px-4 py-5 text-center relative overflow-hidden"
        >
          <div
            className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 blur-3xl opacity-20"
            style={{ backgroundColor: tier.color }}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Score</p>
          <p className="mt-1 font-mono text-6xl font-medium tabular-nums text-white">{shown}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span
              className="rounded-full px-2.5 py-1 font-semibold border"
              style={{
                color: tier.color,
                backgroundColor: tier.bg,
                borderColor: `${tier.color}40`,
              }}
            >
              Tier: {tier.title}
            </span>
            {outcome.isPersonalBest && outcome.result.valid && (
              <span className="rounded-full bg-pulse/15 px-2.5 py-1 font-semibold text-pulse">Personal best</span>
            )}
            {outcome.result.valid ? (
              <span className="rounded-full bg-white/8 px-2.5 py-1 text-white/80">
                Ahead of {outcome.percentile}% of baseline
              </span>
            ) : (
              <span className="rounded-full bg-gold/15 px-2.5 py-1 font-semibold text-gold">Not saved as a best</span>
            )}
          </div>
        </motion.section>

        {/* Metric DL */}
        <dl className="grid grid-cols-2 gap-2">
          <div className="panel rounded-2xl p-3">
            <dt className="text-[11px] uppercase tracking-wider text-mute">Reaction</dt>
            <dd className="mt-1 font-mono text-xl text-iris">{formatMs(outcome.result.reactionTime)}</dd>
          </div>
          <div className="panel rounded-2xl p-3">
            <dt className="text-[11px] uppercase tracking-wider text-mute">Accuracy</dt>
            <dd className="mt-1 font-mono text-xl text-gold">{formatPct(outcome.result.accuracy)}</dd>
          </div>
        </dl>

        {delta != null && (
          <p className="text-center text-sm text-mute">
            {delta === 0 ? 'Level with your previous score' : delta > 0 ? `+${delta} vs last score` : `${delta} vs last score`}
          </p>
        )}

        {/* Ranked Status Feedback */}
        {isRanked && (
          <div className="rounded-2xl border border-gold/30 bg-gold/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gold">
              <span>Database Leaderboard Status</span>
              <span className="font-mono">{rankedAttemptsLeft}/2 Remaining</span>
            </div>
            <p className="text-xs text-mute leading-relaxed">
              This score was submitted to the official Supabase database and will appear on the global ranking ladder.
            </p>
            <Button
              variant="secondary"
              full
              className="text-xs py-2 text-gold border-gold/40"
              onClick={() => navigate('/ranking')}
            >
              📊 Check Global Ranking Standings
            </Button>
          </div>
        )}

        {/* Classic 5-Slot Scorecard (Requirement 2) */}
        {isClassic && (
          <div className="panel rounded-3xl p-4 space-y-3 border border-iris/20 bg-iris/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-iris">Classic Scorecard</h3>
                <p className="text-[11px] text-mute">Top score + latest 4 reps (5 slots max)</p>
              </div>
              {isNewHighestClassic && (
                <span className="rounded-full bg-pulse/20 border border-pulse/40 px-2 py-0.5 text-[10px] font-bold text-pulse uppercase animate-pulse">
                  ★ New Highest!
                </span>
              )}
            </div>

            {/* Slot 1: Highest Score */}
            <div className="rounded-2xl bg-white/8 border border-gold/30 p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base text-gold">👑</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gold">Slot 1: All-Time High</p>
                  <p className="text-[11px] text-mute">
                    {classicRecord.highest ? formatWhen(classicRecord.highest.timestamp) : 'No high score yet'}
                  </p>
                </div>
              </div>
              <span className="font-mono text-lg font-bold text-gold">
                {classicRecord.highest ? classicRecord.highest.score : '—'}
              </span>
            </div>

            {/* Slots 2-5: Latest 4 Scores */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-mute font-semibold">Latest 4 Scores</p>
              {classicRecord.latest.length === 0 ? (
                <p className="text-xs text-mute py-1">No recorded reps yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {classicRecord.latest.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`rounded-xl px-2.5 py-1.5 flex items-center justify-between text-xs border ${
                        item.id === outcome.result.id
                          ? 'border-iris/60 bg-iris/15 text-white'
                          : 'border-white/5 bg-black/30 text-mute'
                      }`}
                    >
                      <span className="text-[10px] font-mono">
                        Slot {idx + 2}: {idx === 0 ? 'Latest' : formatWhen(item.timestamp)}
                      </span>
                      <span className="font-mono font-bold text-white">{item.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[10px] text-mute italic leading-tight">
              Classic scores stay on your device and are excluded from the main competitive ranking.
            </p>
          </div>
        )}

        {!outcome.result.valid && (
          <p className="rounded-2xl border border-gold/30 bg-gold/10 px-3 py-2 text-sm leading-relaxed text-gold">
            {FLAG_COPY[outcome.result.flags[0] ?? ''] ?? 'This attempt was flagged and left out of bests.'}
          </p>
        )}

        <p className="rounded-2xl bg-white/5 px-3 py-3 text-sm leading-relaxed text-white/85">{tip}</p>
        <Disclaimer compact />

        <div className="mt-auto grid gap-2 pt-2">
          {secondaryLabel && onSecondary && (
            <Button variant="secondary" full onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
          <Button full onClick={onPrimary}>
            {primaryLabel}
          </Button>
          <Button variant="ghost" full onClick={() => navigate('/drills')}>
            All Drills
          </Button>
        </div>
      </div>
    </div>
  )
}
