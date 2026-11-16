import { Link, useParams } from 'react-router-dom'
import { categories, getCategory, tests } from '@/content/catalog'
import type { CategoryId } from '@/types'
import { bestScore } from '@/stores/progressStore'
import { useProgress } from '@/stores/progressStore'
import { cn } from '@/lib/cn'

const tones: Record<string, string> = {
  pulse: 'text-pulse',
  iris: 'text-iris',
  gold: 'text-gold',
  lilac: 'text-lilac',
  coral: 'text-coral',
}

export function DrillsPage() {
  const { categoryId } = useParams()
  const results = useProgress((state) => state.results)
  const getRankedAttemptsLeft = useProgress((state) => state.getRankedAttemptsLeft)
  const active = categories.some((category) => category.id === categoryId)
    ? (categoryId as CategoryId)
    : null
  const visible = active ? tests.filter((test) => test.category === active) : tests

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-[max(1.1rem,env(safe-area-inset-top))]">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse">Drill library</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Pick a short session</h1>
      </header>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip to="/drills" active={!active} label="All" />
        {categories.map((category) => (
          <FilterChip
            key={category.id}
            to={`/drills/${category.id}`}
            active={active === category.id}
            label={category.title}
          />
        ))}
      </div>
      {active && <p className="text-sm text-mute">{getCategory(active).blurb}</p>}
      <ul className="space-y-2">
        {visible.map((test) => {
          const best = bestScore(results, test.id)
          const category = getCategory(test.category)
          const repsLeft = getRankedAttemptsLeft(test.id)
          return (
            <li key={test.id}>
              <Link to={`/play/${test.id}`} className="panel flex min-h-[4.5rem] items-center gap-3 rounded-3xl px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-[11px] font-semibold uppercase tracking-wider', tones[category.tone])}>
                      {category.title}
                    </p>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider',
                        repsLeft > 0
                          ? 'border border-gold/30 bg-gold/15 text-gold'
                          : 'border border-white/10 bg-white/5 text-mute',
                      )}
                    >
                      {repsLeft > 0 ? `${repsLeft}/2 Ranked` : 'Ranked Locked'}
                    </span>
                  </div>
                  <h2 className="truncate text-base font-semibold">{test.title}</h2>
                  <p className="truncate text-sm text-mute">{test.summary}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{best == null ? '—' : best}</p>
                  <p className="text-[11px] text-mute">{best == null ? test.duration : 'best'}</p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FilterChip({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        'shrink-0 rounded-full border px-3 py-2 text-sm font-medium',
        active ? 'border-pulse/40 bg-pulse/15 text-pulse' : 'border-white/10 bg-white/5 text-white/80',
      )}
    >
      {label}
    </Link>
  )
}
