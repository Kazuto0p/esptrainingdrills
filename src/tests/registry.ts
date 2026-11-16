import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { tests, type TestCopy } from '@/content/catalog'
import type { TestId, TestModuleProps } from '@/types'

const loaders: Record<TestId, LazyExoticComponent<ComponentType<TestModuleProps>>> = {
  'color-reaction': lazy(() => import('@/tests/color-reaction/ColorReaction')),
  'flick-aim': lazy(() => import('@/tests/flick-aim/FlickAim')),
  'smooth-track': lazy(() => import('@/tests/tracking/SmoothTrack')),
  'zone-recall': lazy(() => import('@/tests/minimap/ZoneRecall')),
  'sound-ping': lazy(() => import('@/tests/audio/SoundPing')),
  'split-signal': lazy(() => import('@/tests/split-signal/SplitSignal')),
  'shape-nback': lazy(() => import('@/tests/nback/ShapeNBack')),
  'cooldown-memory': lazy(() => import('@/tests/cooldown/CooldownMemory')),
  'last-hit': lazy(() => import('@/tests/last-hit/LastHit')),
}

export interface PlayableTest extends TestCopy {
  Component: LazyExoticComponent<ComponentType<TestModuleProps>>
}

export function getPlayable(id: string | undefined): PlayableTest | undefined {
  if (!id || !(id in loaders)) return undefined
  const meta = tests.find((test) => test.id === id)
  if (!meta) return undefined
  return { ...meta, Component: loaders[meta.id] }
}

export function nextTestId(id: TestId): TestId | null {
  const index = tests.findIndex((test) => test.id === id)
  return tests[index + 1]?.id ?? null
}

export function warmupPlaylist(): PlayableTest[] {
  return tests
    .filter((test) => test.warmupOrder != null)
    .sort((a, b) => (a.warmupOrder ?? 0) - (b.warmupOrder ?? 0))
    .map((test) => ({ ...test, Component: loaders[test.id] }))
}
