import { Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResultsPanel } from '@/components/test/ResultsPanel'
import { Button } from '@/components/ui/Button'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { warmupPlaylist } from '@/tests/registry'
import type { SaveOutcome } from '@/types'
import { useProgress } from '@/stores/progressStore'

const playlist = warmupPlaylist()

export function WarmupPage() {
  const navigate = useNavigate()
  const recordAttempt = useProgress((state) => state.recordAttempt)
  const markWarmup = useProgress((state) => state.markWarmup)
  const [step, setStep] = useState(0)
  const [attemptKey, setAttemptKey] = useState(0)
  const [outcome, setOutcome] = useState<SaveOutcome | null>(null)
  const [history, setHistory] = useState<SaveOutcome[]>([])

  if (step >= playlist.length) {
    const total = history.reduce((sum, item) => sum + item.result.score, 0)
    const overall = history.length === 0 ? 0 : Math.round(total / history.length)
    return (
      <div className="mx-auto flex h-full w-full max-w-lg flex-col gap-4 overflow-y-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Daily warm-up</p>
        <h1 className="text-3xl font-semibold tracking-tight">Set complete</h1>
        <p className="font-mono text-6xl text-pulse">{overall}</p>
        <p className="text-sm text-mute">Average of today’s four drills.</p>
        <ul className="panel divide-y divide-white/5 rounded-3xl">
          {history.map((item) => {
            const meta = playlist.find((test) => test.id === item.result.testId)
            return (
              <li key={item.result.id} className="flex items-center justify-between px-4 py-3">
                <span>
                  <span className="block text-sm font-medium">{meta?.title}</span>
                  <span className="text-xs text-mute">{item.result.valid ? 'Saved' : 'Flagged'}</span>
                </span>
                <span className="font-mono">{item.result.score}</span>
              </li>
            )
          })}
        </ul>
        <Disclaimer compact />
        <Button full onClick={() => navigate('/')}>
          Back home
        </Button>
      </div>
    )
  }

  const current = playlist[step]
  if (!current) return null

  if (outcome) {
    return (
      <ResultsPanel
        outcome={outcome}
        onExit={() => navigate('/')}
        secondaryLabel="Try again"
        onSecondary={() => {
          setOutcome(null)
          setAttemptKey((value) => value + 1)
        }}
        primaryLabel={step === playlist.length - 1 ? 'Finish warm-up' : 'Next'}
        onPrimary={() => {
          const nextHistory = [...history, outcome]
          setHistory(nextHistory)
          if (step + 1 >= playlist.length) {
            const avg = nextHistory.reduce((sum, item) => sum + item.result.score, 0) / nextHistory.length
            markWarmup(avg)
          }
          setOutcome(null)
          setStep((value) => value + 1)
          setAttemptKey((value) => value + 1)
        }}
      />
    )
  }

  const Component = current.Component

  return (
    <Suspense fallback={<div className="grid h-full place-items-center text-sm text-mute">Loading drill…</div>}>
      <Component
        key={`${current.id}-${attemptKey}`}
        mode="warmup"
        onExit={() => navigate('/')}
        onComplete={(attempt) => setOutcome(recordAttempt(attempt))}
      />
    </Suspense>
  )
}
