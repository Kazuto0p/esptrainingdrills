export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
  }
  return sorted[mid] ?? null
}

export function stdDev(values: number[]): number | null {
  if (values.length < 2) return null
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/** Abramowitz & Stegun approximation. Good enough for percentile labels. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const abs = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * abs)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t
  return sign * (1 - poly * Math.exp(-abs * abs))
}

export function normalCdf(x: number, mean: number, sd: number): number {
  if (sd <= 0) return x >= mean ? 1 : 0
  const z = (x - mean) / (sd * Math.SQRT2)
  return 0.5 * (1 + erf(z))
}
