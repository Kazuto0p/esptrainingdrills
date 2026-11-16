import { useState } from 'react'
import type { Difficulty, PlayMode } from '@/types'
import { Button } from '@/components/ui/Button'
import { GameHeader } from '@/components/test/GameHeader'
import { warmAudio } from '@/lib/audio'
import { cn } from '@/lib/cn'

const levels: Difficulty[] = ['easy', 'normal', 'hard']

export function IntroPanel({
  title,
  goal,
  duration,
  howTo,
  showDifficulty,
  difficulty,
  onDifficulty,
  startLabel,
  onStart,
  onExit,
  badge,
  playMode = 'classic',
  onPlayMode,
  rankedAttemptsLeft = 2,
}: {
  title: string
  goal: string
  duration: string
  howTo: string[]
  showDifficulty: boolean
  difficulty: Difficulty
  onDifficulty: (difficulty: Difficulty) => void
  startLabel: string
  onStart: () => void
  onExit: () => void
  badge?: string
  playMode?: PlayMode
  onPlayMode?: (mode: PlayMode) => void
  rankedAttemptsLeft?: number
}) {
  const [ready, setReady] = useState(false)
  const isRankedLocked = rankedAttemptsLeft <= 0

  return (
    <div className="flex h-full flex-col">
      <GameHeader title={title} onExit={onExit} right={duration} />
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-6 pt-4">
        {badge && (
          <p className="w-fit rounded-full border border-pulse/30 bg-pulse/10 px-3 py-1 text-xs font-semibold text-pulse">
            {badge}
          </p>
        )}

        {/* Mode Selector: Classic vs Ranked */}
        {onPlayMode && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">Select Game Mode</p>
              <span className="text-[11px] text-mute font-mono">
                Ranked: <strong className={isRankedLocked ? 'text-coral' : 'text-pulse'}>{rankedAttemptsLeft}/2 left</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Classic Mode Card */}
              <button
                type="button"
                onClick={() => onPlayMode('classic')}
                className={cn(
                  'relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all',
                  playMode === 'classic'
                    ? 'border-iris bg-iris/15 shadow-glow'
                    : 'border-white/10 bg-white/5 opacity-70 hover:opacity-100'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold uppercase tracking-wider text-iris">Classic</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono">Free</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-white">Unlimited Play</p>
                <p className="mt-0.5 text-[11px] text-mute leading-tight">
                  Local 5-slot scorecard. Does not affect global ladder.
                </p>
              </button>

              {/* Ranked Mode Card */}
              <button
                type="button"
                disabled={isRankedLocked}
                onClick={() => !isRankedLocked && onPlayMode('ranked')}
                className={cn(
                  'relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all',
                  playMode === 'ranked'
                    ? 'border-gold bg-gold/15 shadow-glow'
                    : isRankedLocked
                    ? 'border-white/5 bg-white/2 opacity-40 cursor-not-allowed'
                    : 'border-white/10 bg-white/5 opacity-70 hover:opacity-100'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={cn('text-xs font-bold uppercase tracking-wider', isRankedLocked ? 'text-mute' : 'text-gold')}>
                    Ranked
                  </span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-mono font-bold',
                      isRankedLocked ? 'bg-coral/20 text-coral' : 'bg-gold/20 text-gold'
                    )}
                  >
                    {isRankedLocked ? 'Locked' : `${rankedAttemptsLeft}/2`}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-white">
                  {isRankedLocked ? 'Daily Limit Reached' : 'Official Qualifier'}
                </p>
                <p className="mt-0.5 text-[11px] text-mute leading-tight">
                  {isRankedLocked ? 'Resets at midnight. Play Classic mode anytime!' : 'Uploads to database. Compete for #1 rank.'}
                </p>
              </button>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse">Goal</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">{goal}</h2>
        </div>

        <ol className="panel space-y-3 rounded-3xl p-4">
          {howTo.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-relaxed text-white/90">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/8 font-mono text-xs text-pulse">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {showDifficulty && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-mute">Difficulty</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Difficulty">
              {levels.map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === level}
                  onClick={() => onDifficulty(level)}
                  className={cn(
                    'min-h-12 rounded-2xl border text-sm font-semibold capitalize transition-all',
                    difficulty === level
                      ? 'border-pulse/50 bg-pulse/15 text-pulse'
                      : 'border-white/10 bg-white/5 text-white/80',
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-2">
          <Button
            full
            autoFocus
            onClick={() => {
              warmAudio()
              setReady(true)
              onStart()
            }}
            disabled={ready || (playMode === 'ranked' && isRankedLocked)}
          >
            {playMode === 'ranked' ? `Start Ranked Rep (${rankedAttemptsLeft} left)` : startLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
