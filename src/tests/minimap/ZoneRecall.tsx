import { useEffect, useRef, useState } from 'react'
import { DrillFrame } from '@/components/test/DrillFrame'
import { useLatest } from '@/hooks/useRaf'
import { playTone } from '@/lib/audio'
import { triggerHaptic } from '@/lib/haptics'
import { scoreSpeedAccuracy } from '@/lib/scoring'
import { median, stdDev } from '@/lib/stats'
import type { AttemptPayload, Difficulty, TestModuleProps } from '@/types'

const LABELS = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

interface Dot {
  zone: number
  x: number
  y: number
}

interface Round {
  hot: number
  dots: Dot[]
}

const ROUNDS: Record<Difficulty | 'warmup', number> = {
  easy: 3,
  normal: 4,
  hard: 5,
  warmup: 3,
}

function makeRound(): Round {
  const counts = Array.from({ length: 9 }, () => 0)
  const hot = Math.floor(Math.random() * 9)
  counts[hot] = 3
  let extra = 3
  let guard = 0
  while (extra > 0 && guard < 50) {
    guard += 1
    const zone = Math.floor(Math.random() * 9)
    if (zone === hot || (counts[zone] ?? 0) >= 2) continue
    counts[zone] = (counts[zone] ?? 0) + 1
    extra -= 1
  }
  const dots: Dot[] = []
  counts.forEach((count, zone) => {
    for (let index = 0; index < count; index += 1) {
      dots.push({ zone, x: 22 + Math.random() * 56, y: 22 + Math.random() * 56 })
    }
  })
  return { hot, dots }
}

type Phase = 'idle' | 'study' | 'ask'

/** One-look minimap: the busiest cell is unique by construction (3 markers vs at most 2). */
export default function ZoneRecall({ mode, onComplete, onExit }: TestModuleProps) {
  const onCompleteRef = useLatest(onComplete)
  const [live, setLive] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [round, setRound] = useState<Round | null>(null)
  const [progress, setProgress] = useState('')
  const roundsRef = useRef<Round[]>([])
  const indexRef = useRef(0)
  const askedAtRef = useRef(0)
  const logRef = useRef<{ correct: boolean; rt: number }[]>([])
  const difficultyRef = useRef<Difficulty>('normal')
  const startedAtRef = useRef(0)
  const doneRef = useRef(false)

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    const log = logRef.current
    const correct = log.filter((item) => item.correct).length
    const accuracy = log.length === 0 ? 0 : (correct / log.length) * 100
    const times = log.map((item) => item.rt)
    const reaction = median(times)
    const spread = stdDev(times)
    const payload: AttemptPayload = {
      testId: 'zone-recall',
      score: scoreSpeedAccuracy(reaction, accuracy / 100, 480, 2200, 0.22),
      reactionTime: reaction,
      accuracy,
      metadata: {
        difficulty: mode === 'warmup' ? 'warmup' : difficultyRef.current,
        mode,
        samples: times.length,
        rtStd: spread == null ? 0 : Math.round(spread),
        correct,
        durationMs: Math.round(performance.now() - startedAtRef.current),
      },
    }
    onCompleteRef.current(payload)
  }
  const finishRef = useLatest(finish)

  const showRound = (index: number) => {
    const next = roundsRef.current[index]
    if (!next) {
      finishRef.current()
      return
    }
    setRound(next)
    setProgress(`${index + 1} / ${roundsRef.current.length}`)
    setPhase('study')
  }

  useEffect(() => {
    if (!live || phase !== 'study') return
    const id = window.setTimeout(() => {
      askedAtRef.current = performance.now()
      setPhase('ask')
    }, 1300)
    return () => window.clearTimeout(id)
  }, [live, phase])

  const answer = (zone: number) => {
    if (phase !== 'ask' || !round) return
    const rt = performance.now() - askedAtRef.current
    const correct = zone === round.hot
    logRef.current.push({ correct, rt })
    playTone(correct ? 720 : 180, 0.06, correct ? 'sine' : 'triangle')
    triggerHaptic(correct ? 'light' : 'warning')
    indexRef.current += 1
    if (indexRef.current >= roundsRef.current.length) finishRef.current()
    else showRound(indexRef.current)
  }

  return (
    <DrillFrame
      testId="zone-recall"
      mode={mode}
      onExit={onExit}
      progress={progress}
      onArmed={(difficulty) => {
        const count = mode === 'warmup' ? ROUNDS.warmup : ROUNDS[difficulty]
        difficultyRef.current = difficulty
        roundsRef.current = Array.from({ length: count }, () => makeRound())
        indexRef.current = 0
        logRef.current = []
        doneRef.current = false
        startedAtRef.current = performance.now()
        setLive(true)
        showRound(0)
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <p className="py-3 text-center text-sm text-mute" aria-live="polite">
          {phase === 'ask' ? 'Which zone had the most markers?' : 'Read the board'}
        </p>
        <div className="grid flex-1 grid-cols-3 grid-rows-3 gap-2">
          {LABELS.map((label, zone) => {
            const dots = phase === 'study' ? round?.dots.filter((dot) => dot.zone === zone) ?? [] : []
            const inner = (
              <>
                <span className="absolute left-2 top-2 font-mono text-[11px] text-mute">{label}</span>
                {dots.map((dot, index) => (
                  <span
                    key={`${label}-${index}`}
                    className="absolute h-3.5 w-3.5 rotate-45 rounded-[3px] bg-gold"
                    style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
                  />
                ))}
              </>
            )
            if (phase === 'ask') {
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => answer(zone)}
                  className="relative min-h-16 rounded-2xl border border-white/10 bg-white/5 text-left active:scale-[0.96] active:bg-pulse/20 active:border-pulse transition-all shadow-sm"
                  aria-label={`Zone ${label}`}
                >
                  {inner}
                </button>
              )
            }
            return (
              <div key={label} className="relative min-h-16 rounded-2xl border border-white/10 bg-[#0c0e16]">
                {inner}
              </div>
            )
          })}
        </div>
      </div>
    </DrillFrame>
  )
}
