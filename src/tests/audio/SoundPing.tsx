import { useEffect, useRef, useState } from 'react'
import { DrillFrame } from '@/components/test/DrillFrame'
import { useLatest } from '@/hooks/useRaf'
import { playPannedNoise, playTone, warmAudio } from '@/lib/audio'
import { triggerHaptic } from '@/lib/haptics'
import { scoreSpeedAccuracy } from '@/lib/scoring'
import { median, stdDev } from '@/lib/stats'
import type { AttemptPayload, Difficulty, TestModuleProps } from '@/types'

type Direction = 'left' | 'right' | 'center'
type Outcome = 'hit' | 'miss' | 'wrong' | 'anticipation'

const PAN: Record<Direction, number> = { left: -1, right: 1, center: 0 }
const ORDER: Direction[] = ['left', 'right', 'center']

const SETTINGS: Record<Difficulty, number> = { easy: 6, normal: 8, hard: 10 }

function plan(count: number): Direction[] {
  const sequence: Direction[] = []
  for (let index = 0; index < count; index += 1) {
    let next = ORDER[Math.floor(Math.random() * ORDER.length)] ?? 'center'
    const previous = sequence[index - 1]
    const before = sequence[index - 2]
    if (next === previous && next === before) {
      next = ORDER[(ORDER.indexOf(next) + 1) % ORDER.length] ?? 'left'
    }
    sequence.push(next)
  }
  return sequence
}

/**
 * Stereo burst, then a zone tap.
 * Center is equal in both ears. Headphones make left and right obvious;
 * phone speakers still separate center from a hard pan.
 */
export default function SoundPing({ mode, onComplete, onExit }: TestModuleProps) {
  const onCompleteRef = useLatest(onComplete)
  const plansRef = useRef<Direction[]>([])
  const openRef = useRef(false)
  const askedAtRef = useRef(0)
  const logRef = useRef<{ outcome: Outcome; rt: number | null }[]>([])
  const difficultyRef = useRef<Difficulty>('normal')
  const startedAtRef = useRef(0)
  const doneRef = useRef(false)
  const answeredRef = useRef(false)
  const [live, setLive] = useState(false)
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState('')
  const [hint, setHint] = useState('Headphones help')

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    const log = logRef.current
    const hits = log.filter((item) => item.outcome === 'hit' && item.rt != null).map((item) => item.rt as number)
    const correct = log.filter((item) => item.outcome === 'hit').length
    const accuracy = log.length === 0 ? 0 : (correct / log.length) * 100
    const reaction = median(hits)
    const spread = stdDev(hits)
    const payload: AttemptPayload = {
      testId: 'sound-ping',
      score: scoreSpeedAccuracy(reaction, accuracy / 100, 260, 1100, 0.35),
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
    const direction = plansRef.current[index]
    if (!direction) {
      finishRef.current()
      return
    }
    openRef.current = false
    answeredRef.current = false
    setHint('Listen')
    setProgress(`${index + 1} / ${plansRef.current.length}`)
    const playId = window.setTimeout(() => {
      warmAudio()
      playPannedNoise(PAN[direction])
      askedAtRef.current = performance.now()
      openRef.current = true
      setHint('Where was it?')
    }, 420)
    const endId = window.setTimeout(() => {
      if (answeredRef.current) return
      logRef.current.push({ outcome: 'miss', rt: null })
      playTone(180, 0.05, 'triangle')
      setIndex((value) => value + 1)
    }, 2600)
    return () => {
      window.clearTimeout(playId)
      window.clearTimeout(endId)
    }
  }, [live, index, finishRef])

  const answer = (choice: Direction) => {
    if (!openRef.current || answeredRef.current) return
    const actual = plansRef.current[index]
    if (!actual) return
    answeredRef.current = true
    const rt = performance.now() - askedAtRef.current
    let outcome: Outcome
    if (rt < 140) outcome = 'anticipation'
    else if (choice === actual) outcome = 'hit'
    else outcome = 'wrong'
    logRef.current.push({ outcome, rt: outcome === 'hit' ? rt : null })
    playTone(outcome === 'hit' ? 720 : 180, 0.05, outcome === 'hit' ? 'sine' : 'triangle')
    triggerHaptic(outcome === 'hit' ? 'light' : 'warning')
    window.setTimeout(() => setIndex((value) => value + 1), 160)
  }

  return (
    <DrillFrame
      testId="sound-ping"
      mode={mode}
      onExit={onExit}
      progress={progress}
      onArmed={(difficulty) => {
        difficultyRef.current = difficulty
        plansRef.current = plan(SETTINGS[difficulty])
        logRef.current = []
        doneRef.current = false
        startedAtRef.current = performance.now()
        warmAudio()
        setIndex(0)
        setLive(true)
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-4">
        <p className="pt-3 text-center text-sm text-mute" aria-live="polite">
          {hint}
        </p>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
          <Zone label="Left" onTap={() => answer('left')} />
          <Zone label="Right" onTap={() => answer('right')} />
        </div>
        <Zone label="Center" onTap={() => answer('center')} wide />
      </div>
    </DrillFrame>
  )
}

function Zone({ label, onTap, wide = false }: { label: string; onTap: () => void; wide?: boolean }) {
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.preventDefault()
        onTap()
      }}
      className={`arena min-h-24 rounded-3xl border border-white/10 bg-[#0c0e16] text-lg font-semibold ${wide ? '' : ''}`}
    >
      {label}
    </button>
  )
}
