import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AttemptPayload,
  ClassicDrillRecord,
  Difficulty,
  PlayMode,
  SaveOutcome,
  Streak,
  TestId,
  TestResult,
  WarmupRecord,
} from '@/types'
import { flagAttempt } from '@/lib/anticheat'
import { localDay, yesterday } from '@/lib/dates'
import { percentileFor } from '@/lib/scoring'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'

const MAX_RESULTS = 240
const MAX_RANKED_DAILY_ATTEMPTS = 2

interface ProgressState {
  guestId: string
  createdAt: number
  sound: boolean
  difficulty: Difficulty
  currentPlayMode: PlayMode
  streak: Streak
  lastWarmup: WarmupRecord | null
  results: TestResult[]
  lastSubmitAt: number
  /** Keyed by `${localDay}:${testId}` -> number of attempts used today */
  rankedUsage: Record<string, number>
  /** Max 5 slots per drill: 1 highest + up to 4 latest */
  classicRecords: Partial<Record<TestId, ClassicDrillRecord>>
  setSound: (sound: boolean) => void
  setDifficulty: (difficulty: Difficulty) => void
  setPlayMode: (mode: PlayMode) => void
  getRankedAttemptsLeft: (testId: TestId) => number
  getClassicRecord: (testId: TestId) => ClassicDrillRecord
  recordAttempt: (attempt: AttemptPayload, playMode?: PlayMode) => SaveOutcome
  markWarmup: (score: number) => void
  importData: (incoming: unknown) => boolean
  clearLocal: () => void
}

function nextStreak(streak: Streak): Streak {
  const today = localDay()
  if (streak.lastDay === today) return streak
  if (streak.lastDay === yesterday()) return { count: streak.count + 1, lastDay: today }
  return { count: 1, lastDay: today }
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      guestId: makeId(),
      createdAt: Date.now(),
      sound: true,
      difficulty: 'normal',
      currentPlayMode: 'classic',
      streak: { count: 0, lastDay: null },
      lastWarmup: null,
      results: [],
      lastSubmitAt: 0,
      rankedUsage: {},
      classicRecords: {},
      setSound: (sound) => set({ sound }),
      setDifficulty: (difficulty) => set({ difficulty }),
      setPlayMode: (mode) => set({ currentPlayMode: mode }),

      getRankedAttemptsLeft: (testId: TestId) => {
        const today = localDay()
        const key = `${today}:${testId}`
        const used = get().rankedUsage[key] ?? 0
        return Math.max(0, MAX_RANKED_DAILY_ATTEMPTS - used)
      },

      getClassicRecord: (testId: TestId): ClassicDrillRecord => {
        return get().classicRecords[testId] ?? { highest: null, latest: [] }
      },

      recordAttempt: (attempt, chosenPlayMode) => {
        const state = get()
        const now = Date.now()
        const today = localDay()
        const mode: PlayMode = chosenPlayMode ?? attempt.playMode ?? state.currentPlayMode ?? 'classic'
        const elapsed = state.lastSubmitAt === 0 ? Number.POSITIVE_INFINITY : now - state.lastSubmitAt
        const flagged = flagAttempt(attempt, elapsed)
        const previous = state.results.filter((item) => item.testId === attempt.testId && item.valid)
        const best = previous.reduce((max, item) => Math.max(max, item.score), 0)

        const result: TestResult = {
          ...attempt,
          playMode: mode,
          score: Math.round(Math.min(1000, Math.max(0, attempt.score))),
          accuracy: Math.round(attempt.accuracy * 10) / 10,
          reactionTime: attempt.reactionTime == null ? null : Math.round(attempt.reactionTime),
          id: makeId(),
          timestamp: now,
          valid: flagged.valid,
          flags: flagged.flags,
        }

        const percentile = percentileFor(
          attempt.testId,
          result.score,
          previous.map((item) => item.score),
        )

        // Handle Ranked Mode logic
        let nextRankedUsage = state.rankedUsage
        let rankedAttemptsLeft: number | undefined

        if (mode === 'ranked') {
          const key = `${today}:${attempt.testId}`
          const used = state.rankedUsage[key] ?? 0
          const nextUsed = used + 1
          nextRankedUsage = { ...state.rankedUsage, [key]: nextUsed }
          rankedAttemptsLeft = Math.max(0, MAX_RANKED_DAILY_ATTEMPTS - nextUsed)

          // ONLY Ranked Mode scores are sent to the Supabase database
          if (isSupabaseConfigured) {
            const user = useAuth.getState().user
            if (user) {
              supabase
                .from('test_results')
                .insert({
                  user_id: user.id,
                  test_id: result.testId,
                  score: result.score,
                  reaction_time: result.reactionTime,
                  accuracy: result.accuracy,
                  valid: result.valid,
                  flags: result.flags,
                  metadata: result.metadata,
                  mode: 'ranked',
                })
                .then(({ error }) => {
                  if (error) console.warn('Supabase ranked sync notice:', error.message)
                })
            }
          }
        }

        // Handle Classic Mode 5-slot structure
        let nextClassicRecords = state.classicRecords
        let updatedClassicRecord: ClassicDrillRecord | undefined

        if (mode === 'classic') {
          const currentRecord = state.classicRecords[attempt.testId] ?? { highest: null, latest: [] }
          const isHigher = !currentRecord.highest || result.score > currentRecord.highest.score
          const newHighest = isHigher ? result : currentRecord.highest
          // Maximum 4 latest scores: prepend new score, slice to 4
          const newLatest = [result, ...currentRecord.latest].slice(0, 4)

          updatedClassicRecord = {
            highest: newHighest,
            latest: newLatest,
          }

          nextClassicRecords = {
            ...state.classicRecords,
            [attempt.testId]: updatedClassicRecord,
          }
        }

        set({
          results: [result, ...state.results].slice(0, MAX_RESULTS),
          lastSubmitAt: now,
          streak: result.valid ? nextStreak(state.streak) : state.streak,
          rankedUsage: nextRankedUsage,
          classicRecords: nextClassicRecords,
        })

        return {
          result,
          percentile,
          isPersonalBest: result.valid && (previous.length === 0 || result.score > best),
          previousScore: previous[0]?.score ?? null,
          rankedAttemptsLeft,
          classicRecord: updatedClassicRecord,
        }
      },

      markWarmup: (score) => set({ lastWarmup: { day: localDay(), score: Math.round(score) } }),

      importData: (incoming: unknown) => {
        try {
          if (!incoming || typeof incoming !== 'object') return false
          const parsed = incoming as Record<string, unknown>
          set((prev) => ({
            ...prev,
            results: Array.isArray(parsed.results) ? (parsed.results as TestResult[]) : prev.results,
            streak: parsed.streak && typeof (parsed.streak as Streak).count === 'number' ? (parsed.streak as Streak) : prev.streak,
            lastWarmup: (parsed.lastWarmup as WarmupRecord) ?? prev.lastWarmup,
            difficulty: (parsed.difficulty as Difficulty) ?? prev.difficulty,
            rankedUsage: (parsed.rankedUsage as Record<string, number>) ?? prev.rankedUsage,
            classicRecords: (parsed.classicRecords as Partial<Record<TestId, ClassicDrillRecord>>) ?? prev.classicRecords,
          }))
          return true
        } catch {
          return false
        }
      },

      clearLocal: () =>
        set({
          results: [],
          streak: { count: 0, lastDay: null },
          lastWarmup: null,
          lastSubmitAt: 0,
          rankedUsage: {},
          classicRecords: {},
          guestId: makeId(),
          createdAt: Date.now(),
        }),
    }),
    {
      name: 'pulse-arena-progress',
      version: 2,
      partialize: (state) => ({
        guestId: state.guestId,
        createdAt: state.createdAt,
        sound: state.sound,
        difficulty: state.difficulty,
        streak: state.streak,
        lastWarmup: state.lastWarmup,
        results: state.results,
        lastSubmitAt: state.lastSubmitAt,
        rankedUsage: state.rankedUsage,
        classicRecords: state.classicRecords,
      }),
    },
  ),
)

export function visibleStreak(streak: Streak): number {
  if (!streak.lastDay) return 0
  if (streak.lastDay === localDay() || streak.lastDay === yesterday()) return streak.count
  return 0
}

export function resultsFor(results: TestResult[], testId: TestId): TestResult[] {
  return results.filter((item) => item.testId === testId)
}

export function bestScore(results: TestResult[], testId: TestId): number | null {
  const scores = results.filter((item) => item.testId === testId && item.valid).map((item) => item.score)
  if (scores.length === 0) return null
  return Math.max(...scores)
}

export function bestReaction(results: TestResult[], testId: TestId): number | null {
  const times = results
    .filter((item) => item.testId === testId && item.valid && item.reactionTime != null)
    .map((item) => item.reactionTime as number)
  if (times.length === 0) return null
  return Math.min(...times)
}

export function averageScore(results: TestResult[], testId?: TestId): number | null {
  const pool = results.filter((item) => item.valid && (testId == null || item.testId === testId))
  if (pool.length === 0) return null
  return Math.round(pool.reduce((sum, item) => sum + item.score, 0) / pool.length)
}
