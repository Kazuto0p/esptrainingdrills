/** Fit a canvas to its parent in CSS pixels and scale the context by DPR (max 2). */
export function fitCanvas(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } {
  const parent = canvas.parentElement ?? canvas
  const rect = parent.getBoundingClientRect()
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = Math.max(1, rect.width)
  const h = Math.max(1, rect.height)
  const nextWidth = Math.round(w * dpr)
  const nextHeight = Math.round(h * dpr)
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth
    canvas.height = nextHeight
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, w, h }
}

export function pointerInCanvas(event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement }): {
  x: number
  y: number
} {
  const rect = event.currentTarget.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}
