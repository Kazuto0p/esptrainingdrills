import { Suspense, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ResultsPanel } from '@/components/test/ResultsPanel'
import { Button } from '@/components/ui/Button'
import { getPlayable, nextTestId } from '@/tests/registry'
import type { SaveOutcome } from '@/types'
import { useProgress } from '@/stores/progressStore'

export function PlayPage() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const playable = getPlayable(testId)
  const recordAttempt = useProgress((state) => state.recordAttempt)
  const [attemptKey, setAttemptKey] = useState(0)
  const [outcome, setOutcome] = useState<SaveOutcome | null>(null)

  useEffect(() => {
    setOutcome(null)
    setAttemptKey((value) => value + 1)
  }, [testId])

  useEffect(() => {
    document.title = playable ? `${playable.title} · Pulse Arena` : 'Pulse Arena'
    return () => {
      document.title = 'Pulse Arena'
    }
  }, [playable])

  if (!playable) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div className="space-y-4">
          <p className="text-lg font-semibold">That drill is not in the library.</p>
          <Button onClick={() => navigate('/drills')}>Back to drills</Button>
        </div>
      </div>
    )
  }

  if (outcome) {
    const next = nextTestId(playable.id)
    return (
      <ResultsPanel
        outcome={outcome}
        onExit={() => navigate('/')}
        secondaryLabel="Try again"
        onSecondary={() => {
          setOutcome(null)
          setAttemptKey((value) => value + 1)
        }}
        primaryLabel={next ? 'Next drill' : 'Done'}
        onPrimary={() => (next ? navigate(`/play/${next}`) : navigate('/'))}
      />
    )
  }

  const Component = playable.Component

  return (
    <Suspense fallback={<div className="grid h-full place-items-center text-sm text-mute">Loading drill…</div>}>
      <Component
        key={attemptKey}
        mode="standard"
        onExit={() => navigate(-1)}
        onComplete={(attempt) => setOutcome(recordAttempt(attempt))}
      />
    </Suspense>
  )
}
