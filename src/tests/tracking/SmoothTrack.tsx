import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { DrillFrame } from '@/components/test/DrillFrame'
import { useLatest, useRaf } from '@/hooks/useRaf'
import { fitCanvas } from '@/lib/canvas'
import { clamp } from '@/lib/cn'
import type { AttemptPayload, Difficulty, TestModuleProps } from '@/types'

interface PointerState {
  x: number
  y: number
  down: boolean
  id: number
}

interface World {
  started: number
  duration: number
  speed: number
  catch: number
  pointer: PointerState | null
  onMs: number
  errorSum: number
  errorN: number
  finished: boolean
}

const SETTINGS: Record<Difficulty, { duration: number; speed: number; catch: number }> = {
  easy: { duration: 20_000, speed: 0.72, catch: 58 },
  normal: { duration: 28_000, speed: 1, catch: 46 },
  hard: { duration: 32_000, speed: 1.38, catch: 38 },
}

/** Layered sines stay inside the arena and change direction without a hard corner. */
function orbAt(seconds: number, w: number, h: number, speed: number): { x: number; y: number } {
  const t = seconds * speed
  const ax = Math.max(20, w / 2 - 56)
  const ay = Math.max(20, h / 2 - 56)
  return {
    x: w / 2 + Math.sin(t * 0.85) * ax * 0.7 + Math.sin(t * 0.31 + 1.2) * ax * 0.26,
    y: h / 2 + Math.cos(t * 0.67 + 0.4) * ay * 0.68 + Math.sin(t * 0.23) * ay * 0.24,
  }
}

/**
 * Tracking score is time-on-target, sampled every frame.
 * A frame counts only while a finger is down and inside the catch radius.
 * Mean error is kept for the robotic-track check in the save path.
 */
export default function SmoothTrack({ mode, onComplete, onExit }: TestModuleProps) {
  const onCompleteRef = useLatest(onComplete)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World | null>(null)
  const difficultyRef = useRef<Difficulty>('normal')
  const [live, setLive] = useState(false)
  const [progress, setProgress] = useState('')
  const hudAt = useRef(0)

  const finish = (world: World) => {
    if (world.finished) return
    world.finished = true
    const elapsed = Math.max(1, performance.now() - world.started)
    const uptime = clamp(world.onMs / world.duration, 0, 1)
    const meanError = world.errorN === 0 ? 999 : world.errorSum / world.errorN
    const payload: AttemptPayload = {
      testId: 'smooth-track',
      score: Math.round(1000 * uptime),
      reactionTime: null,
      accuracy: uptime * 100,
      metadata: {
        difficulty: difficultyRef.current,
        mode,
        uptime: Math.round(uptime * 1000) / 1000,
        meanError: Math.round(meanError * 10) / 10,
        samples: world.errorN,
        durationMs: Math.round(elapsed),
      },
    }
    onCompleteRef.current(payload)
  }

  useRaf(live, (dt, now) => {
    const canvas = canvasRef.current
    const world = worldRef.current
    if (!canvas || !world || world.finished) return
    const { ctx, w, h } = fitCanvas(canvas)
    const elapsed = now - world.started
    if (elapsed >= world.duration) {
      finish(world)
      return
    }
    const orb = orbAt(elapsed / 1000, w, h, world.speed)
    const pointer = world.pointer
    if (pointer?.down) {
      const distance = Math.hypot(pointer.x - orb.x, pointer.y - orb.y)
      world.errorSum += distance
      world.errorN += 1
      if (distance <= world.catch) world.onMs += dt
    }
    if (now - hudAt.current > 200) {
      hudAt.current = now
      const left = Math.max(0, (world.duration - elapsed) / 1000)
      setProgress(`${left.toFixed(0)}s`)
    }

    const locked = pointer?.down === true && Math.hypot(pointer.x - orb.x, pointer.y - orb.y) <= world.catch
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#0c0e16'
    ctx.fillRect(0, 0, w, h)

    ctx.beginPath()
    ctx.arc(orb.x, orb.y, world.catch, 0, Math.PI * 2)
    ctx.strokeStyle = locked ? 'rgba(46,230,166,0.45)' : 'rgba(246,196,69,0.35)'
    ctx.setLineDash(locked ? [] : [5, 6])
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.setLineDash([])

    ctx.beginPath()
    ctx.arc(orb.x, orb.y, 22, 0, Math.PI * 2)
    ctx.fillStyle = locked ? '#2ee6a6' : '#8eaaef'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(orb.x, orb.y, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#10131c'
    ctx.fill()

    if (pointer?.down) {
      ctx.beginPath()
      ctx.arc(pointer.x, pointer.y, 20, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 2
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

  const pointFrom = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const world = worldRef.current
    if (!world) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = pointFrom(event)
    world.pointer = { ...point, down: true, id: event.pointerId }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const world = worldRef.current
    if (!world?.pointer?.down || world.pointer.id !== event.pointerId) return
    const point = pointFrom(event)
    world.pointer.x = point.x
    world.pointer.y = point.y
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const world = worldRef.current
    if (!world?.pointer || world.pointer.id !== event.pointerId) return
    world.pointer.down = false
  }

  return (
    <DrillFrame
      testId="smooth-track"
      mode={mode}
      onExit={onExit}
      progress={progress}
      onArmed={(difficulty) => {
        const config = SETTINGS[difficulty]
        difficultyRef.current = difficulty
        worldRef.current = {
          started: performance.now(),
          duration: config.duration,
          speed: config.speed,
          catch: config.catch,
          pointer: null,
          onMs: 0,
          errorSum: 0,
          errorN: 0,
          finished: false,
        }
        setProgress(`${Math.round(config.duration / 1000)}s`)
        setLive(true)
      }}
    >
      <div className="relative m-3 min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10">
        <canvas
          ref={canvasRef}
          className="arena absolute inset-0 h-full w-full"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Tracking arena. Hold a finger on the moving orb."
        />
        <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-mute">
          Solid ring means you are locked on
        </p>
      </div>
    </DrillFrame>
  )
}
