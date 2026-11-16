import { useEffect, useRef, useState } from 'react'
import { DrillFrame } from '@/components/test/DrillFrame'
import { Button } from '@/components/ui/Button'
import { useLatest } from '@/hooks/useRaf'
import { playTone } from '@/lib/audio'
import { triggerHaptic } from '@/lib/haptics'
import { scoreSpeedAccuracy } from '@/lib/scoring'
import { median, stdDev } from '@/lib/stats'
import type { AttemptPayload, Difficulty, TestModuleProps } from '@/types'

type ShapeName = 'circle' | 'square' | 'diamond' | 'triangle'
type Outcome = 'hit' | 'miss' | 'false-alarm' | 'correct-reject' | 'anticipation'

interface Stimulus {
  shape: ShapeName
  match: boolean
}

const POOL: ShapeName[] = ['circle', 'square', 'diamond', 'triangle']

const SETTINGS: Record<Difficulty, { count: number; showMs: number }> = {
  easy: { count: 12, showMs: 1600 },
  normal: { count: 16, showMs: 1250 },
  hard: { count: 18, showMs: 950 },
}

function planSequence(count: number): Stimulus[] {
  const shapes: ShapeName[] = []
  const sequence: Stimulus[] = []
  for (let index = 0; index < count; index += 1) {
    const wantMatch = index >= 2 && Math.random() < 0.34
    let shape: ShapeName
    if (wantMatch) {
      shape = shapes[index - 2] ?? 'circle'
    } else {
      const banned = index >= 2 ? shapes[index - 2] : null
      const options = POOL.filter((item) => item !== banned)
      shape = options[Math.floor(Math.random() * options.length)] ?? 'circle'
    }
    shapes.push(shape)
    sequence.push({ shape, match: index >= 2 && shape === shapes[index - 2] })
  }
  return sequence
}

/** 2-back on shape. Color is not used, so the cue stays readable for color-blind players. */
export default function ShapeNBack({ mode, onComplete, onExit }: TestModuleProps) {
  const onCompleteRef = useLatest(onComplete)
  const sequenceRef = useRef<Stimulus[]>([])
  const logRef = useRef<{ outcome: Outcome; rt: number | null }[]>([])
  const shownAtRef = useRef(0)
  const showMsRef = useRef(1250)
  const lockedRef = useRef(false)
  const difficultyRef = useRef<Difficulty>('normal')
  const startedAtRef = useRef(0)
  const doneRef = useRef(false)
  const [live, setLive] = useState(false)
  const [index, setIndex] = useState(0)
  const [current, setCurrent] = useState<Stimulus | null>(null)
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
      testId: 'shape-nback',
      score: scoreSpeedAccuracy(reaction, accuracy / 100, 280, 900, 0.4),
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

  const commit = (responded: boolean) => {
    if (lockedRef.current) return
    const item = sequenceRef.current[index]
    if (!item) return
    lockedRef.current = true
    const rt = responded ? performance.now() - shownAtRef.current : null
    let outcome: Outcome
    if (item.match && responded && rt != null && rt < 120) outcome = 'anticipation'
    else if (item.match && responded) outcome = 'hit'
    else if (item.match) outcome = 'miss'
    else if (responded) outcome = 'false-alarm'
    else outcome = 'correct-reject'
    logRef.current.push({ outcome, rt: outcome === 'hit' ? rt : null })
    playTone(outcome === 'hit' || outcome === 'correct-reject' ? 680 : 180, 0.05, outcome === 'hit' ? 'sine' : 'triangle')
    triggerHaptic(outcome === 'hit' || outcome === 'correct-reject' ? 'light' : 'warning')
    window.setTimeout(() => setIndex((value) => value + 1), 180)
  }
  const commitRef = useLatest(commit)

  useEffect(() => {
    if (!live) return
    const item = sequenceRef.current[index]
    if (!item) {
      finishRef.current()
      return
    }
    lockedRef.current = false
    shownAtRef.current = performance.now()
    setCurrent(item)
    setProgress(`${index + 1} / ${sequenceRef.current.length}`)
    const id = window.setTimeout(() => commitRef.current(false), showMsRef.current)
    return () => window.clearTimeout(id)
  }, [live, index, finishRef, commitRef])

  return (
    <DrillFrame
      testId="shape-nback"
      mode={mode}
      onExit={onExit}
      progress={progress}
      onArmed={(difficulty) => {
        const config = SETTINGS[difficulty]
        difficultyRef.current = difficulty
        showMsRef.current = config.showMs
        sequenceRef.current = planSequence(config.count)
        logRef.current = []
        doneRef.current = false
        startedAtRef.current = performance.now()
        setIndex(0)
        setLive(true)
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <p className="py-2 text-center text-sm text-mute">Tap Match when this shape equals two back</p>
        <div className="grid flex-1 place-items-center" aria-live="polite">
          {current && <ShapeGlyph name={current.shape} />}
        </div>
        <Button
          full
          variant="secondary"
          className="min-h-16 text-base"
          onPointerDown={(event) => {
            event.preventDefault()
            commitRef.current(true)
          }}
        >
          Match
        </Button>
      </div>
    </DrillFrame>
  )
}

function ShapeGlyph({ name }: { name: ShapeName }) {
  return (
    <svg viewBox="0 0 120 120" className="h-40 w-40" aria-label={name}>
      {name === 'circle' && <circle cx="60" cy="60" r="36" fill="#2ee6a6" />}
      {name === 'square' && <rect x="26" y="26" width="68" height="68" rx="8" fill="#8eaaef" />}
      {name === 'diamond' && <path d="M60 18l34 42-34 42-34-42 34-42z" fill="#f6c445" />}
      {name === 'triangle' && <path d="M60 18l40 78H20l40-78z" fill="#ff8a5b" />}
    </svg>
  )
}
