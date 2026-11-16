import { type ReactNode, useEffect, useState } from 'react'
import { getTestCopy } from '@/content/catalog'
import { CountdownOverlay } from '@/components/test/CountdownOverlay'
import { GameHeader } from '@/components/test/GameHeader'
import { IntroPanel } from '@/components/test/IntroPanel'
import { useCountdown } from '@/hooks/useCountdown'
import { useLatest } from '@/hooks/useRaf'
import { useProgress } from '@/stores/progressStore'
import type { Difficulty, TestId, TestMode } from '@/types'

/**
 * Shared intro → countdown → play chrome.
 * `onArmed` fires once, when the countdown ends, so drills can start their clock
 * on a player gesture that already happened (Start) plus a known delay.
 */
export function DrillFrame({
  testId,
  mode,
  onExit,
  onArmed,
  progress,
  children,
}: {
  testId: TestId
  mode: TestMode
  onExit: () => void
  onArmed: (difficulty: Difficulty) => void
  progress?: string
  children: ReactNode
}) {
  const copy = getTestCopy(testId)
  const difficulty = useProgress((state) => state.difficulty)
  const setDifficulty = useProgress((state) => state.setDifficulty)
  const playMode = useProgress((state) => state.currentPlayMode)
  const setPlayMode = useProgress((state) => state.setPlayMode)
  const getRankedAttemptsLeft = useProgress((state) => state.getRankedAttemptsLeft)
  const rankedAttemptsLeft = getRankedAttemptsLeft(testId)

  // Ensure default mode for warm-up is warmup, else fallback to classic if ranked is exhausted
  useEffect(() => {
    if (mode === 'warmup') {
      setPlayMode('warmup')
    } else if (rankedAttemptsLeft <= 0 && playMode === 'ranked') {
      setPlayMode('classic')
    }
  }, [mode, rankedAttemptsLeft, playMode, setPlayMode])

  const onArmedRef = useLatest(onArmed)
  const [phase, setPhase] = useState<'intro' | 'countdown' | 'live'>('intro')
  const countdown = useCountdown(phase === 'countdown', () => {
    onArmedRef.current(useProgress.getState().difficulty)
    setPhase('live')
  })

  if (!copy) return null

  if (phase === 'intro') {
    const step = copy.warmupOrder
    const isWarmup = mode === 'warmup'

    return (
      <IntroPanel
        title={copy.title}
        goal={copy.goal}
        duration={isWarmup ? 'Warm-up' : copy.duration}
        howTo={copy.howTo}
        showDifficulty={!isWarmup}
        difficulty={difficulty}
        onDifficulty={setDifficulty}
        startLabel={playMode === 'ranked' ? 'Enter Ranked Arena' : 'Start Drill'}
        badge={
          isWarmup && step
            ? `Warm-up · ${step} of 4`
            : playMode === 'ranked'
            ? `Ranked Rep (${rankedAttemptsLeft} left today)`
            : undefined
        }
        onExit={onExit}
        onStart={() => setPhase('countdown')}
        playMode={isWarmup ? undefined : playMode}
        onPlayMode={isWarmup ? undefined : setPlayMode}
        rankedAttemptsLeft={rankedAttemptsLeft}
      />
    )
  }

  const modeBadge =
    mode === 'warmup'
      ? 'Warm-up'
      : playMode === 'ranked'
      ? `Ranked (${rankedAttemptsLeft} left)`
      : 'Classic'

  const rightHeader = progress ? `${modeBadge} • ${progress}` : modeBadge

  if (phase === 'countdown') {
    return (
      <div className="flex h-full flex-col">
        <GameHeader title={copy.title} onExit={onExit} right={modeBadge} />
        <CountdownOverlay value={countdown} />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <GameHeader title={copy.title} onExit={onExit} right={rightHeader} />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
