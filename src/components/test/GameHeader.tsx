import type { ReactNode } from 'react'
import { IconBack } from '@/components/icons'

export function GameHeader({
  title,
  onExit,
  right,
}: {
  title: string
  onExit: () => void
  right?: ReactNode
}) {
  return (
    <header className="flex items-center gap-2 px-3 pt-[max(0.7rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit drill"
        className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5"
      >
        <IconBack className="h-5 w-5" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">{title}</h1>
      <div className="min-w-11 text-right text-xs font-medium tabular-nums text-mute">{right}</div>
    </header>
  )
}
