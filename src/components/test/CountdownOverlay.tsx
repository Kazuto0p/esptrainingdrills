export function CountdownOverlay({ value }: { value: number }) {
  const label = value <= 0 ? 'Go' : String(value)
  return (
    <div className="grid h-full place-items-center" aria-live="assertive">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mute">Get ready</p>
        <p className="mt-2 font-mono text-8xl font-medium text-pulse">{label}</p>
      </div>
    </div>
  )
}
