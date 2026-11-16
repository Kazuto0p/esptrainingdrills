import type { TestId } from '@/types'
import { clamp } from '@/lib/cn'
import { normalCdf } from '@/lib/stats'

/**
 * Scores are 0–1000.
 * Reaction drills blend a speed curve with accuracy so a fast, sloppy run
 * cannot outrank a slightly slower clean one.
 * Touch screens are slower than keyboards, so the curves sit above the
 * classic 150–250ms keyboard benchmarks.
 */

export function scoreSpeedAccuracy(
  medianRt: number | null,
  accuracy01: number,
  excellentMs: number,
  poorMs: number,
  speedWeight = 0.65,
): number {
  const speed = medianRt == null ? 0 : clamp((poorMs - medianRt) / (poorMs - excellentMs), 0, 1)
  const blended = speedWeight * speed + (1 - speedWeight) * clamp(accuracy01, 0, 1)
  return Math.round(1000 * blended)
}

export function scoreMean(points: number[]): number {
  if (points.length === 0) return 0
  const avg = points.reduce((sum, point) => sum + point, 0) / points.length
  return Math.round(1000 * clamp(avg, 0, 1))
}

/**
 * Local samples are thin on a new device, so each drill carries a synthetic
 * prior (mean / sd / weight). The label is "ahead of N% of the baseline pool",
 * not a live global ladder. Swap `priors` for server norms later.
 */
const priors: Record<TestId, { mean: number; sd: number; n: number }> = {
  'color-reaction': { mean: 640, sd: 130, n: 48 },
  'flick-aim': { mean: 610, sd: 140, n: 48 },
  'smooth-track': { mean: 680, sd: 150, n: 40 },
  'zone-recall': { mean: 620, sd: 160, n: 36 },
  'sound-ping': { mean: 700, sd: 140, n: 32 },
  'split-signal': { mean: 600, sd: 140, n: 36 },
  'shape-nback': { mean: 640, sd: 150, n: 36 },
  'cooldown-memory': { mean: 660, sd: 150, n: 36 },
  'last-hit': { mean: 630, sd: 150, n: 36 },
}

export function percentileFor(testId: TestId, score: number, previousScores: number[]): number {
  const prior = priors[testId]
  const localBelow = previousScores.filter((value) => value < score).length
  const priorBelow = normalCdf(score, prior.mean, prior.sd) * prior.n
  const pct = (localBelow + priorBelow) / (previousScores.length + prior.n)
  return Math.round(clamp(pct, 0.01, 0.99) * 100)
}

export function pickTip(
  tips: { solid: string; slow: string; shaky: string },
  accuracy: number,
  reactionTime: number | null,
  slowAfterMs: number,
): string {
  if (accuracy < 75) return tips.shaky
  if (reactionTime != null && reactionTime > slowAfterMs) return tips.slow
  return tips.solid
}

export interface RankTier {
  name: string
  title: string
  color: string
  bg: string
  minScore: number
}

export const TIERS: RankTier[] = [
  { name: 'apex', title: 'Apex Predator', color: '#2ee6a6', bg: 'rgba(46, 230, 166, 0.15)', minScore: 950 },
  { name: 'grandmaster', title: 'Grandmaster', color: '#ff8a5b', bg: 'rgba(255, 138, 91, 0.15)', minScore: 900 },
  { name: 'master', title: 'Master', color: '#c3b0ff', bg: 'rgba(195, 176, 255, 0.15)', minScore: 800 },
  { name: 'challenger', title: 'Challenger', color: '#8eaaef', bg: 'rgba(142, 170, 239, 0.15)', minScore: 680 },
  { name: 'vanguard', title: 'Vanguard', color: '#f6c445', bg: 'rgba(246, 196, 69, 0.15)', minScore: 550 },
  { name: 'guardian', title: 'Guardian', color: '#a0aec0', bg: 'rgba(160, 174, 192, 0.15)', minScore: 400 },
  { name: 'recruit', title: 'Recruit', color: '#cd7f32', bg: 'rgba(205, 127, 50, 0.15)', minScore: 0 },
]

export function getTier(score: number): RankTier {
  for (const tier of TIERS) {
    if (score >= tier.minScore) return tier
  }
  return TIERS[TIERS.length - 1]!
}

