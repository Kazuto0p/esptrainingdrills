import type { AttemptPayload, TestId } from '@/types'
import { getTestCopy } from '@/content/catalog'

export interface FlaggedAttempt {
  valid: boolean
  flags: string[]
}

/**
 * Three cheap gates, applied when a result is saved:
 * 1. Median reaction time under the drill floor (about 90–180ms).
 * 2. Hit times with almost no human variance.
 * 3. Two saves inside 1.2s — a full drill cannot finish that fast.
 * Last-hit has no reaction floor: predicting a visible window is the skill.
 * Smooth Track flags only a sub-pixel lock held the entire run.
 */
export function flagAttempt(attempt: AttemptPayload, elapsedSinceLastMs: number): FlaggedAttempt {
  const flags: string[] = []
  const copy = getTestCopy(attempt.testId)
  const floor = copy?.minReactionMs ?? null

  if (floor != null && attempt.reactionTime != null && attempt.reactionTime < floor) {
    flags.push('impossible-rt')
  }

  const samples = numberMeta(attempt, 'samples')
  const rtStd = numberMeta(attempt, 'rtStd')
  if (samples != null && rtStd != null && samples >= 5 && rtStd < 11) {
    flags.push('robotic')
  }

  const meanError = numberMeta(attempt, 'meanError')
  const uptime = numberMeta(attempt, 'uptime')
  if (meanError != null && uptime != null && meanError < 2 && uptime > 0.98) {
    flags.push('robotic-track')
  }

  if (elapsedSinceLastMs >= 0 && elapsedSinceLastMs < 1200) {
    flags.push('rate-limit')
  }

  if (!Number.isFinite(attempt.score) || attempt.score < 0 || attempt.score > 1000) {
    flags.push('bad-score')
  }

  return { valid: flags.length === 0, flags }
}

export function numberMeta(attempt: AttemptPayload, key: string): number | null {
  const value = attempt.metadata[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export const FLAG_COPY: Record<string, string> = {
  'impossible-rt': 'Median reaction time was below a human floor, so this run was not saved as a best.',
  robotic: 'Reaction times were almost identical. That pattern was not saved as a best.',
  'robotic-track': 'The track sat on the target too perfectly to count as a finger run.',
  'rate-limit': 'This finished too soon after the previous save.',
  'bad-score': 'The score was outside the 0–1000 range.',
}

export function minReactionFor(testId: TestId): number | null {
  return getTestCopy(testId)?.minReactionMs ?? null
}
