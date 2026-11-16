export type CategoryId = 'reflex' | 'awareness' | 'decision' | 'memory' | 'moba'

export type Difficulty = 'easy' | 'normal' | 'hard'

export type PlayMode = 'classic' | 'ranked' | 'warmup'

export type TestMode = 'standard' | 'warmup' | 'classic' | 'ranked'

export type TestId =
  | 'color-reaction'
  | 'flick-aim'
  | 'smooth-track'
  | 'zone-recall'
  | 'sound-ping'
  | 'split-signal'
  | 'shape-nback'
  | 'cooldown-memory'
  | 'last-hit'

/** Numbers and short labels only. Raw pointer streams are never stored. */
export type AttemptMeta = Record<string, number | string>

export interface AttemptPayload {
  testId: TestId
  score: number
  reactionTime: number | null
  accuracy: number
  metadata: AttemptMeta
  playMode?: PlayMode
}

export interface TestResult extends AttemptPayload {
  id: string
  timestamp: number
  valid: boolean
  flags: string[]
  playMode: PlayMode
}

/** Classic 5-slot scorecard structure */
export interface ClassicDrillRecord {
  /** Slot 1: Highest score ever achieved in Classic mode */
  highest: TestResult | null
  /** Slots 2–5: Up to 4 latest scores in reverse chronological order */
  latest: TestResult[]
}

export interface RankedLeaderboardEntry {
  rank: number
  userId: string
  playerName: string
  avatarUrl?: string | null
  score: number
  reactionTime: number | null
  accuracy: number
  date: string
  isCurrentUser: boolean
}

export interface Streak {
  count: number
  lastDay: string | null
}

export interface WarmupRecord {
  day: string
  score: number
}

export interface TestModuleProps {
  mode: TestMode
  onComplete: (attempt: AttemptPayload) => void
  onExit: () => void
}

export interface SaveOutcome {
  result: TestResult
  percentile: number
  isPersonalBest: boolean
  previousScore: number | null
  rankedAttemptsLeft?: number
  classicRecord?: ClassicDrillRecord
}
