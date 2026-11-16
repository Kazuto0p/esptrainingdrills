import { useEffect, useRef, useState } from 'react'
import { DrillFrame } from '@/components/test/DrillFrame'
import { useLatest } from '@/hooks/useRaf'
import { playTone } from '@/lib/audio'
import { triggerHaptic } from '@/lib/haptics'
import { scoreSpeedAccuracy } from '@/lib/scoring'
import { median, stdDev } from '@/lib/stats'
import type { AttemptPayload, Difficulty, TestModuleProps } from '@/types'

type Side = 'go' | 'nogo'
interface RoundPlan {
  left: Side
  right: Side
}
type Outcome = 'hit' | 'miss' | 'false-alarm' | 'correct-reject' | 'anticipation'

const SETTINGS: Record<Difficulty, { rounds: number; windowMs: number }> = {
  easy: { rounds: 8, windowMs: 1200 },
  normal: { rounds: 12, windowMs: 960 },
  hard: { rounds: 14, windowMs: 760 },
}

function planRounds(count: number): RoundPlan[] {
  return Array.from({ length: count }, () => {
    const roll = Math.random()
    if (roll < 0.22) return { left: 'nogo', right: 'nogo' }
    if (roll < 0.5) return { left: 'go', right: 'nogo' }
    if (roll < 0.78) return { left: 'nogo', right: 'go' }
    return { left: 'go', right: 'go' }
  })
}

function gradeSide(kind: Side, tap: number | null, started: number): { outcome: Outcome; rt: number | null } {
  if (tap == null) {
    return { outcome: kind === 'go' ? 'miss' : 'correct-reject', rt: null }
  }
  const rt = tap - started
  if (rt < 100) return { outcome: 'anticipation', rt }
  if (kind === 'nogo') return { outcome: 'false-alarm', rt }
  return { outcome: 'hit', rt }
}

/** Two pads at once. Circles are taps, diamonds are brakes. */
export default function SplitSignal({ mode, onComplete, onExit }: TestModuleProps) {
  const onCompleteRef = useLatest(onComplete)
  const plansRef = useRef<RoundPlan[]>([])
  const leftTap = useRef<number | null>(null)
  const rightTap = useRef<number | null>(null)
  const startedRef = useRef(0)
  const windowRef = useRef(960)
  const logRef = useRef<{ outcome: Outcome; rt: number | null }[]>([])
  const difficultyRef = useRef<Difficulty>('normal')
  const startedAtRef = useRef(0)
  const doneRef = useRef(false)
  const [live, setLive] = useState(false)
  const [index, setIndex] = useState(0)
  const [round, setRound] = useState<RoundPlan | null>(null)
  const [progress, setProgress] = useState('')

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    const log = logRef.current
    const hits = log.filter((item) => item.outcome === 'hit' && item.rt != null).map((item) => item.rt as number)
    const correct = log.filter((item) => item.outcome === 'hit' || item.outcome === 'correct-reject').length
    const accuracy = log.length === 0 ? 0 : (correct / log.length) * 100
    const reaction = median(hits)
    const spread = stdDev(hits)
    const payload: AttemptPayload = {
      testId: 'split-signal',
      score: scoreSpeedAccuracy(reaction, accuracy / 100, 240, 720, 0.5),
      reactionTime: reaction,
      accuracy,
      metadata: {
        difficulty: difficultyRef.current,
        mode,
        samples: hits.length,
        rtStd: spread == null ? 0 : Math.round(spread),
        durationMs: Math.round(performance.now() - startedAtRef.current),
      },
    }
    onCompleteRef.current(payload)
  }
  const finishRef = useLatest(finish)

  useEffect(() => {
    if (!live) return
    const current = plansRef.current[index]
    if (!current) {
      finishRef.current()
      return
    }
    leftTap.current = null
    rightTap.current = null
    setRound(current)
    setProgress(`${index + 1} / ${plansRef.current.length}`)
    const started = performance.now()
    startedRef.current = started
    const id = window.setTimeout(() => {
      const left = gradeSide(current.left, leftTap.current, started)
      const right = gradeSide(current.right, rightTap.current, started)
      logRef.current.push(left, right)
      const good = left.outcome === 'hit' || left.outcome === 'correct-reject'
      const goodRight = right.outcome === 'hit' || right.outcome === 'correct-reject'
      playTone(good && goodRight ? 720 : 180, 0.05, good && goodRight ? 'sine' : 'triangle')
      triggerHaptic(good && goodRight ? 'light' : 'warning')
      setIndex((value) => value + 1)
    }, windowRef.current)
    return () => window.clearTimeout(id)
  }, [live, index, finishRef])

  const tap = (side: 'left' | 'right') => {
    const slot = side === 'left' ? leftTap : rightTap
    if (slot.current != null) return
    slot.current = performance.now()
    playTone(540, 0.03)
    triggerHaptic('tick')
  }

  return (
    <DrillFrame
      testId="split-signal"
      mode={mode}
      onExit={onExit}
      progress={progress}
      onArmed={(difficulty) => {
        const config = SETTINGS[difficulty]
        difficultyRef.current = difficulty
        windowRef.current = config.windowMs
        plansRef.current = planRounds(config.rounds)
        logRef.current = []
        doneRef.current = false
        startedAtRef.current = performance.now()
        setIndex(0)
        setLive(true)
      }}
    >
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 px-3 pb-4">
        <Pad side="left" kind={round?.left ?? 'nogo'} onTap={() => tap('left')} />
        <Pad side="right" kind={round?.right ?? 'nogo'} onTap={() => tap('right')} />
      </div>
    </DrillFrame>
  )
}

function Pad({ side, kind, onTap }: { side: 'left' | 'right'; kind: Side; onTap: () => void }) {
  return (
    <button
      type="button"
      className="arena flex min-h-48 flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-[#0c0e16]"
      onPointerDown={(event) => {
        event.preventDefault()
        onTap()
      }}
      aria-label={`${side} pad`}
    >
      {kind === 'go' ? (
        <span className="h-24 w-24 rounded-full bg-pulse shadow-glow" />
      ) : (
        <span className="h-24 w-24 rotate-45 rounded-3xl bg-gold" />
      )}
      <span className="text-xs uppercase tracking-[0.16em] text-mute">{side}</span>
    </button>
  )
}
