import { useEffect, useRef, useState } from 'react'
import { DrillFrame } from '@/components/test/DrillFrame'
import { useLatest } from '@/hooks/useRaf'
import { playTone } from '@/lib/audio'
import { triggerHaptic } from '@/lib/haptics'
import { shuffle } from '@/lib/cn'
import { scoreSpeedAccuracy } from '@/lib/scoring'
import { median, stdDev } from '@/lib/stats'
import type { AttemptPayload, Difficulty, TestModuleProps } from '@/types'

const ABILITIES = [
  { id: 'pulse', name: 'Pulse' },
  { id: 'aegis', name: 'Aegis' },
  { id: 'lance', name: 'Lance' },
  { id: 'bloom', name: 'Bloom' },
] as const

type AbilityId = (typeof ABILITIES)[number]['id']

interface Card {
  id: AbilityId
  name: string
  remaining: number
}

const ROUNDS: Record<Difficulty | 'warmup', number> = {
  easy: 3,
  normal: 4,
  hard: 5,
  warmup: 2,
}

const POOLS: Record<Difficulty | 'warmup', number[]> = {
  easy: [2.2, 4.2, 6.2, 8.2],
  normal: [2.4, 4.0, 5.8, 7.6],
  hard: [3.1, 3.9, 4.8, 5.7],
  warmup: [2.2, 4.4, 6.4, 8.2],
}

function makeCards(pool: number[]): Card[] {
  const times = shuffle(pool).slice(0, 4)
  return shuffle(ABILITIES).map((ability, index) => ({
    id: ability.id,
    name: ability.name,
    remaining: times[index] ?? 4,
  }))
}

type Phase = 'idle' | 'study' | 'ask'

const MAX_ARC = 8.2

/** Rings only — no digits — so the player ranks the arcs instead of reading a label. */
export default function CooldownMemory({ mode, onComplete, onExit }: TestModuleProps) {
  const onCompleteRef = useLatest(onComplete)
  const [live, setLive] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [cards, setCards] = useState<Card[]>([])
  const [progress, setProgress] = useState('')
  const deckRef = useRef<Card[][]>([])
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
      testId: 'cooldown-memory',
      score: scoreSpeedAccuracy(reaction, accuracy / 100, 500, 2400, 0.2),
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

  const show = (index: number) => {
    const next = deckRef.current[index]
    if (!next) {
      finishRef.current()
      return
    }
    setCards(next)
    setProgress(`${index + 1} / ${deckRef.current.length}`)
    setPhase('study')
  }

  useEffect(() => {
    if (!live || phase !== 'study') return
    const id = window.setTimeout(() => {
      askedAtRef.current = performance.now()
      setPhase('ask')
    }, 2200)
    return () => window.clearTimeout(id)
  }, [live, phase])

  const answer = (id: AbilityId) => {
    if (phase !== 'ask') return
    const ready = [...cards].sort((a, b) => a.remaining - b.remaining)[0]
    const rt = performance.now() - askedAtRef.current
    const correct = ready?.id === id
    logRef.current.push({ correct, rt })
    playTone(correct ? 720 : 180, 0.06, correct ? 'sine' : 'triangle')
    triggerHaptic(correct ? 'light' : 'warning')
    indexRef.current += 1
    if (indexRef.current >= deckRef.current.length) finishRef.current()
    else show(indexRef.current)
  }

  return (
    <DrillFrame
      testId="cooldown-memory"
      mode={mode}
      onExit={onExit}
      progress={progress}
      onArmed={(difficulty) => {
        const key = mode === 'warmup' ? 'warmup' : difficulty
        difficultyRef.current = difficulty
        deckRef.current = Array.from({ length: ROUNDS[key] }, () => makeCards(POOLS[key]))
        indexRef.current = 0
        logRef.current = []
        doneRef.current = false
        startedAtRef.current = performance.now()
        setLive(true)
        show(0)
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <p className="py-3 text-center text-sm text-mute" aria-live="polite">
          {phase === 'ask' ? 'Which ability is ready first?' : 'Rank the rings. Shortest arc wins.'}
        </p>
        <div className="grid flex-1 grid-cols-2 gap-3">
          {cards.map((card) => {
            const fraction = Math.max(0.08, Math.min(1, card.remaining / MAX_ARC))
            const radius = 32
            const circ = 2 * Math.PI * radius
            const body = (
              <>
                <svg viewBox="0 0 84 84" className="h-20 w-20">
                  <circle cx="42" cy="42" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
                  {phase === 'study' && (
                    <circle
                      cx="42"
                      cy="42"
                      r={radius}
                      stroke="#2ee6a6"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${circ * fraction} ${circ}`}
                      transform="rotate(-90 42 42)"
                    />
                  )}
                  <Shape id={card.id} />
                </svg>
                <span className="text-sm font-semibold">{card.name}</span>
              </>
            )
            if (phase === 'ask') {
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => answer(card.id)}
                  className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-3xl border border-white/10 bg-white/5 active:scale-[0.96] active:bg-pulse/20 active:border-pulse transition-all shadow-sm"
                >
                  {body}
                </button>
              )
            }
            return (
              <div
                key={card.id}
                className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-3xl border border-white/10 bg-[#0c0e16]"
              >
                {body}
              </div>
            )
          })}
        </div>
      </div>
    </DrillFrame>
  )
}

function Shape({ id }: { id: AbilityId }) {
  if (id === 'pulse') return <circle cx="42" cy="42" r="8" fill="#f6c445" />
  if (id === 'aegis') return <path d="M42 32l8 4v7c0 6-4 9-8 11-4-2-8-5-8-11v-7l8-4z" fill="#8eaaef" />
  if (id === 'lance') return <path d="M42 30l6 12-6 12-6-12 6-12z" fill="#ff8a5b" />
  return <path d="M42 31l4 7h8l-6 5 2 8-8-5-8 5 2-8-6-5h8l4-7z" fill="#c3b0ff" />
}
