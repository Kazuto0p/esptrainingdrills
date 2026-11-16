export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p className={compact ? 'text-[11px] leading-relaxed text-mute' : 'text-xs leading-relaxed text-mute'}>
      Pulse Arena is a training tool. Scores are practice feedback, not a measure of in-game rank and not a
      promise that you will climb.
    </p>
  )
}
