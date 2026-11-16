import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { DrillFrame } from '@/components/test/DrillFrame'
import { useLatest, useRaf } from '@/hooks/useRaf'
import { playTone } from '@/lib/audio'
import { triggerHaptic } from '@/lib/haptics'
import { fitCanvas, pointerInCanvas } from '@/lib/canvas'
import { clamp } from '@/lib/cn'
import { scoreMean } from '@/lib/scoring'
import { median, stdDev } from '@/lib/stats'
import type { AttemptPayload, Difficulty, TestModuleProps } from '@/types'

interface Target {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  born: number
  life: number
}

interface Hit {
  rt: number
  dist: number
  r: number
}

interface World {
  target: Target | null
  gapUntil: number
  hits: Hit[]
  misses: number
  spawned: number
  total: number
  prev: { x: number; y: number } | null
  ripples: { x: number; y: number; born: number }[]
  finished: boolean
}

const SETTINGS: Record<Difficulty | 'warmup', { total: number; radius: number; life: number; drift: number }> = {
  easy: { total: 8, radius: 46, life: 1300, drift: 22 },
  normal: { total: 12, radius: 38, life: 1050, drift: 48 },
  hard: { total: 15, radius: 32, life: 820, drift: 86 },
  warmup: { total: 8, radius: 42, life: 1100, drift: 36 },
}

function spawn(w: number, h: number, prev: { x: number; y: number } | null, radius: number, life: number, drift: number): Target {
  let x = w / 2
  let y = h / 2
  for (let attempt = 0; attempt < 14; attempt += 1) {
    x = radius + 18 + Math.random() * Math.max(1, w - radius * 2 - 36)
    y = radius + 18 + Math.random() * Math.max(1, h - radius * 2 - 36)
    if (!prev || Math.hypot(x - prev.x, y - prev.y) > 108) break
  }
  const angle = Math.random() * Math.PI * 2
  return { x, y, vx: Math.cos(angle) * drift, vy: Math.sin(angle) * drift, r: radius, born: performance.now(), life }
}

/**
 * Flick aim loop:
 * each frame moves the live target, expires it, then draws.
 * Hits are measured from spawn time, with a precision term for distance to center.
 * Sub-80ms contacts are thrown out as anticipations.
 */
export default function FlickAim({ mode, onComplete, onExit }: TestModuleProps) {
  const onCompleteRef = useLatest(onComplete)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World | null>(null)
  const configRef = useRef(SETTINGS.normal)
  const difficultyRef = useRef<Difficulty>('normal')
  const startedAtRef = useRef(0)
  const [live, setLive] = useState(false)
  const [progress, setProgress] = useState('')

  const finish = (world: World) => {
    if (world.finished) return
    world.finished = true
    const points = [
      ...world.hits.map((hit) => {
        const speed = clamp((920 - hit.rt) / (920 - 200), 0, 1)
        const precision = clamp(1 - hit.dist / hit.r, 0, 1)
        return speed * 0.72 + precision * 0.28
      }),
      ...Array.from({ length: world.misses }, () => 0),
    ]
    const times = world.hits.map((hit) => hit.rt)
    const reaction = median(times)
    const spread = stdDev(times)
    const accuracy = world.total === 0 ? 0 : (world.hits.length / world.total) * 100
    const payload: AttemptPayload = {
      testId: 'flick-aim',
      score: scoreMean(points),
      reactionTime: reaction,
      accuracy,
      metadata: {
        difficulty: mode === 'warmup' ? 'warmup' : difficultyRef.current,
        mode,
        samples: times.length,
        rtStd: spread == null ? 0 : Math.round(spread),
        misses: world.misses,
        durationMs: Math.round(performance.now() - startedAtRef.current),
      },
    }
    onCompleteRef.current(payload)
  }

  useRaf(live, (dt, now) => {
    const canvas = canvasRef.current
    const world = worldRef.current
    if (!canvas || !world || world.finished) return
    const { ctx, w, h } = fitCanvas(canvas)
    const config = configRef.current

    if (!world.target && now >= world.gapUntil) {
      if (world.spawned >= world.total) {
        finish(world)
        return
      }
      world.target = spawn(w, h, world.prev, config.radius, config.life, config.drift)
      world.spawned += 1
      setProgress(`${world.spawned} / ${world.total}`)
    }

    const target = world.target
    if (target) {
      const step = dt / 1000
      target.x += target.vx * step
      target.y += target.vy * step
      if (target.x < target.r || target.x > w - target.r) target.vx *= -1
      if (target.y < target.r || target.y > h - target.r) target.vy *= -1
      target.x = clamp(target.x, target.r, w - target.r)
      target.y = clamp(target.y, target.r, h - target.r)
      if (now - target.born >= target.life) {
        world.misses += 1
        world.prev = { x: target.x, y: target.y }
        world.target = null
        world.gapUntil = now + 220
        playTone(160, 0.06, 'triangle')
        triggerHaptic('warning')
      }
    }

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#0c0e16'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let x = 0; x < w; x += 48) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    world.ripples = world.ripples.filter((ripple) => now - ripple.born < 280)
    for (const ripple of world.ripples) {
      const age = (now - ripple.born) / 280
      ctx.beginPath()
      ctx.arc(ripple.x, ripple.y, 18 + age * 36, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(46,230,166,${1 - age})`
      ctx.lineWidth = 2
      ctx.stroke()
    }

    if (world.target) {
      const age = clamp((now - world.target.born) / world.target.life, 0, 1)
      const { x, y, r } = world.target
      ctx.beginPath()
      ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - age))
      ctx.strokeStyle = age > 0.72 ? '#f6c445' : '#8eaaef'
      ctx.lineWidth = 4
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, y, 7, 0, Math.PI * 2)
      ctx.fillStyle = '#2ee6a6'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x - 14, y)
      ctx.lineTo(x - 8, y)
      ctx.moveTo(x + 8, y)
      ctx.lineTo(x + 14, y)
      ctx.moveTo(x, y - 14)
      ctx.lineTo(x, y - 8)
      ctx.moveTo(x, y + 8)
      ctx.lineTo(x, y + 14)
      ctx.stroke()
    }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !live) return
    const block = (event: TouchEvent) => event.preventDefault()
    canvas.addEventListener('touchmove', block, { passive: false })
    return () => canvas.removeEventListener('touchmove', block)
  }, [live])

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const world = worldRef.current
    const target = world?.target
    if (!world || !target || world.finished) return
    const point = pointerInCanvas(event)
    const dist = Math.hypot(point.x - target.x, point.y - target.y)
    if (dist > target.r) return
    const rt = performance.now() - target.born
    if (rt >= 80) {
      world.hits.push({ rt, dist, r: target.r })
      triggerHaptic('light')
    } else {
      world.misses += 1
      triggerHaptic('warning')
    }
    world.ripples.push({ x: target.x, y: target.y, born: performance.now() })
    world.prev = { x: target.x, y: target.y }
    world.target = null
    world.gapUntil = performance.now() + 150
    playTone(rt >= 80 ? 740 : 180, 0.04, rt >= 80 ? 'sine' : 'triangle')
  }

  return (
    <DrillFrame
      testId="flick-aim"
      mode={mode}
      onExit={onExit}
      progress={progress}
      onArmed={(difficulty) => {
        const config = mode === 'warmup' ? SETTINGS.warmup : SETTINGS[difficulty]
        configRef.current = config
        difficultyRef.current = difficulty
        startedAtRef.current = performance.now()
        worldRef.current = {
          target: null,
          gapUntil: performance.now(),
          hits: [],
          misses: 0,
          spawned: 0,
          total: config.total,
          prev: null,
          ripples: [],
          finished: false,
        }
        setLive(true)
      }}
    >
      <div className="relative m-3 min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10">
        <canvas
          ref={canvasRef}
          className="arena absolute inset-0 h-full w-full"
          onPointerDown={onPointerDown}
          aria-label="Flick aim arena. Tap inside the ring."
        />
        <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-mute">
          Tap the core before the arc closes
        </p>
      </div>
    </DrillFrame>
  )
}
