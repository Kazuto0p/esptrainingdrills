import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DrillFrame } from '@/components/test/DrillFrame'
import { useLatest } from '@/hooks/useRaf'
import { playTone } from '@/lib/audio'
import { triggerHaptic } from '@/lib/haptics'
import { randomBetween } from '@/lib/cn'
import { scoreSpeedAccuracy } from '@/lib/scoring'
import { median, stdDev } from '@/lib/stats'
import type { AttemptPayload, Difficulty, TestModuleProps } from '@/types'

type Kind = 'go' | 'nogo'
type Phase = 'idle' | 'wait' | 'show' | 'gap'
type Outcome = 'hit' | 'miss' | 'correct-reject' | 'false-alarm' | 'anticipation'

interface PlannedTrial {
  kind: Kind
  delay: number
}

interface LoggedTrial {
  outcome: Outcome
  rt: number | null
}

const SETTINGS: Record<Difficulty | 'warmup', { trials: number; goRatio: number; minDelay: number; maxDelay: number; timeout: number }> = {
  easy: { trials: 12, goRatio: 0.7, minDelay: 900, maxDelay: 1800, timeout: 1000 },
  normal: { trials: 18, goRatio: 0.62, minDelay: 700, maxDelay: 2200, timeout: 820 },
  hard: { trials: 22, goRatio: 0.55, minDelay: 480, maxDelay: 2500, timeout: 640 },
  warmup: { trials: 10, goRatio: 0.66, minDelay: 800, maxDelay: 1700, timeout: 900 },
}

function planTrials(count: number, goRatio: number, minDelay: number, maxDelay: number): PlannedTrial[] {
  const trials: PlannedTrial[] = []
  let withholdStreak = 0
  for (let index = 0; index < count; index += 1) {
    let kind: Kind = Math.random() < goRatio ? 'go' : 'nogo'
    if (withholdStreak >= 2) kind = 'go'
    withholdStreak = kind === 'nogo' ? withholdStreak + 1 : 0
    trials.push({ kind, delay: Math.round(randomBetween(minDelay, maxDelay)) })
  }
  if (trials[0] && !trials.some((trial) => trial.kind === 'go')) trials[0].kind = 'go'
  return trials
}

/**
 * Go / no-go.
 * The clock starts in useLayoutEffect, after the shape commits and before paint.
 * Anything under 100ms is scored as an anticipation, not a hit.
 */
export default function ColorReaction({ mode, onComplete, onExit }: TestModuleProps) {
  const onCompleteRef = useLatest(onComplete)
  const [live, setLive] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [kind, setKind] = useState<Kind>('go')
  const [note, setNote] = useState('Hold')
  const [progress, setProgress] = useState('')
  const trialsRef = useRef<PlannedTrial[]>([])
  const indexRef = useRef(0)
  const logRef = useRef<LoggedTrial[]>([])
  const shownAtRef = useRef(0)
  const startedAtRef = useRef(0)
  const timeoutRef = useRef(800)
  const difficultyRef = useRef<Difficulty>('normal')
  const doneRef = useRef(false)
  const phaseRef = useRef<Phase>('idle')
  phaseRef.current = phase

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    const log = logRef.current
    const hits = log.filter((trial) => trial.outcome === 'hit' && trial.rt != null).map((trial) => trial.rt as number)
    const correct = log.filter((trial) => trial.outcome === 'hit' || trial.outcome === 'correct-reject').length
    const accuracy = log.length === 0 ? 0 : (correct / log.length) * 100
    const reaction = median(hits)
    const spread = stdDev(hits)
    const payload: AttemptPayload = {
      testId: 'color-reaction',
      score: scoreSpeedAccuracy(reaction, accuracy / 100, 210, 480, 0.68),
      reactionTime: reaction,
      accuracy,
      metadata: {
        difficulty: mode === 'warmup' ? 'warmup' : difficultyRef.current,
        mode,
        samples: hits.length,
        rtStd: spread == null ? 0 : Math.round(spread),
        durationMs: Math.round(performance.now() - startedAtRef.current),
        anticipations: log.filter((trial) => trial.outcome === 'anticipation').length,
      },
    }
    onCompleteRef.current(payload)
  }
  const finishRef = useLatest(finish)

  const advance = (outcome: Outcome, rt: number | null) => {
    if (phaseRef.current !== 'wait' && phaseRef.current !== 'show') return
    logRef.current.push({ outcome, rt })
    setNote(outcome === 'hit' || outcome === 'correct-reject' ? 'Clean' : outcome === 'anticipation' ? 'Early' : 'Drop')
    setPhase('gap')
  }
  const advanceRef = useLatest(advance)

  useEffect(() => {
    if (!live || phase !== 'wait') return
    const trial = trialsRef.current[indexRef.current]
    if (!trial) {
      finishRef.current()
      return
    }
    setProgress(`${indexRef.current + 1} / ${trialsRef.current.length}`)
    setNote('Hold')
    const id = window.setTimeout(() => {
      setKind(trial.kind)
      setPhase('show')
    }, trial.delay)
    return () => window.clearTimeout(id)
  }, [live, phase, finishRef])

  useLayoutEffect(() => {
    if (phase !== 'show') return
    shownAtRef.current = performance.now()
    const trial = trialsRef.current[indexRef.current]
    const id = window.setTimeout(() => {
      advanceRef.current(trial?.kind === 'go' ? 'miss' : 'correct-reject', null)
    }, timeoutRef.current)
    return () => window.clearTimeout(id)
  }, [phase, advanceRef])

  useEffect(() => {
    if (phase !== 'gap') return
    const id = window.setTimeout(() => {
      indexRef.current += 1
      if (indexRef.current >= trialsRef.current.length) finishRef.current()
      else setPhase('wait')
    }, 240)
    return () => window.clearTimeout(id)
  }, [phase, finishRef])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (event.code !== 'Space' && event.code !== 'Enter') return
      if (phaseRef.current !== 'wait' && phaseRef.current !== 'show') return
      event.preventDefault()
      respond()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const respond = () => {
    const current = phaseRef.current
    if (current === 'wait') {
      playTone(180, 0.08, 'triangle')
      triggerHaptic('warning')
      advanceRef.current('anticipation', null)
      return
    }
    if (current !== 'show') return
    const rt = performance.now() - shownAtRef.current
    const trial = trialsRef.current[indexRef.current]
    if (!trial) return
    if (rt < 100) {
      playTone(180, 0.08, 'triangle')
      triggerHaptic('warning')
      advanceRef.current('anticipation', rt)
      return
    }
    if (trial.kind === 'nogo') {
      playTone(180, 0.08, 'triangle')
      triggerHaptic('warning')
      advanceRef.current('false-alarm', rt)
      return
    }
    playTone(760, 0.04)
    triggerHaptic('light')
    advanceRef.current('hit', rt)
  }

  const hot = phase === 'show'

  return (
    <DrillFrame
      testId="color-reaction"
      mode={mode}
      onExit={onExit}
      progress={progress}
      onArmed={(difficulty) => {
        const config = mode === 'warmup' ? SETTINGS.warmup : SETTINGS[difficulty]
        difficultyRef.current = difficulty
        timeoutRef.current = config.timeout
        trialsRef.current = planTrials(config.trials, config.goRatio, config.minDelay, config.maxDelay)
        indexRef.current = 0
        logRef.current = []
        doneRef.current = false
        startedAtRef.current = performance.now()
        setPhase('wait')
        setLive(true)
      }}
    >
      <button
        type="button"
        className="arena relative m-3 flex flex-1 flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#0c0e16]"
        onPointerDown={(event) => {
          event.preventDefault()
          respond()
        }}
      >
        <span className="sr-only" aria-live="assertive">
          {phase === 'wait' ? 'Wait' : phase === 'show' ? (kind === 'go' ? 'Tap' : 'Hold') : ''}
        </span>
        {hot && kind === 'go' && (
          <span className="grid h-36 w-36 place-items-center rounded-full bg-pulse shadow-glow">
            <span className="h-10 w-10 rounded-full bg-bg/30" />
          </span>
        )}
        {hot && kind === 'nogo' && (
          <span className="grid h-36 w-36 rotate-45 place-items-center rounded-3xl bg-gold">
            <span className="h-8 w-8 rounded-sm bg-bg/20" />
          </span>
        )}
        {!hot && <span className="h-36 w-36 rounded-full border border-dashed border-white/15" />}
        <span className="absolute bottom-6 text-sm font-medium text-mute">{note}</span>
      </button>
    </DrillFrame>
  )
}
