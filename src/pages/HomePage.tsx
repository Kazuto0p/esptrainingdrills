import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { categories, tests } from '@/content/catalog'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { IconFlame, IconMute, IconSound, IconTrophy, LogoMark } from '@/components/icons'
import { formatMs } from '@/lib/dates'
import { localDay } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { getTier } from '@/lib/scoring'
import { useAuth } from '@/stores/authStore'
import { averageScore, bestReaction, bestScore, useProgress, visibleStreak } from '@/stores/progressStore'

const toneText: Record<string, string> = {
  pulse: 'text-pulse',
  iris: 'text-iris',
  gold: 'text-gold',
  lilac: 'text-lilac',
  coral: 'text-coral',
}

export function HomePage() {
  const results = useProgress((state) => state.results)
  const streak = useProgress((state) => state.streak)
  const sound = useProgress((state) => state.sound)
  const setSound = useProgress((state) => state.setSound)
  const lastWarmup = useProgress((state) => state.lastWarmup)
  const { user, profile } = useAuth()
  const days = visibleStreak(streak)
  const warmed = lastWarmup?.day === localDay()
  const recent = results.slice(0, 4)
  const avg = averageScore(results)
  const tier = getTier(avg ?? 0)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pt-[max(1.1rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-3">
        <LogoMark className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse">
            {profile?.display_name ? `Callsign: ${profile.display_name}` : 'Pulse Arena'}
          </p>
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {profile?.display_name ? `Welcome back, ${profile.display_name}` : 'Train the read and the hands'}
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={sound ? 'Mute cues' : 'Enable cues'}
            aria-pressed={sound}
            onClick={() => setSound(!sound)}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5"
          >
            {sound ? <IconSound className="h-5 w-5" /> : <IconMute className="h-5 w-5" />}
          </button>
          {!user && (
            <Link
              to="/auth"
              className="grid h-11 px-3 place-items-center rounded-2xl border border-pulse/30 bg-pulse/10 text-xs font-semibold text-pulse"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="Streak" value={days === 0 ? '0' : String(days)} hint={days === 1 ? 'day' : 'days'} />
        <Stat
          label="Tier"
          value={avg == null ? '—' : tier.title.split(' ')[0] ?? 'Recruit'}
          hint={avg == null ? 'unranked' : `${avg} MMR`}
          highlightColor={avg == null ? undefined : tier.color}
        />
        <Stat label="Drills" value={String(results.filter((item) => item.valid).length)} hint="completed" />
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <Link
          to="/warmup"
          className="panel relative flex flex-col justify-between overflow-hidden rounded-3xl p-3.5 border border-gold/20 bg-gradient-to-b from-gold/10 to-transparent active:scale-[0.99]"
        >
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
              <IconFlame className="h-4 w-4" />
              Daily Warm-up
            </p>
            <h3 className="mt-2 text-base font-semibold tracking-tight">
              {warmed ? 'Done Today' : '4 Drills'}
            </h3>
            <p className="mt-0.5 text-xs text-mute line-clamp-2">
              {warmed ? `Scored ${lastWarmup?.score} pts` : '~3 min calibration'}
            </p>
          </div>
          <span className="mt-3 inline-flex w-fit items-center rounded-full bg-gold/20 px-2.5 py-1 text-xs font-semibold text-gold">
            {warmed ? 'Review' : 'Start'}
          </span>
        </Link>

        <Link
          to="/ranking"
          className="panel relative flex flex-col justify-between overflow-hidden rounded-3xl p-3.5 border border-pulse/20 bg-gradient-to-b from-pulse/10 to-transparent active:scale-[0.99]"
        >
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse">
              <IconTrophy className="h-4 w-4" />
              Ranked Arena
            </p>
            <h3 className="mt-2 text-base font-semibold tracking-tight">
              Leaderboards
            </h3>
            <p className="mt-0.5 text-xs text-mute line-clamp-2">
              2 daily reps per drill. Compete for #1.
            </p>
          </div>
          <span className="mt-3 inline-flex w-fit items-center rounded-full bg-pulse/20 px-2.5 py-1 text-xs font-semibold text-pulse">
            View Board
          </span>
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-mute">Categories</h2>
          <Link to="/drills" className="text-sm font-medium text-pulse">
            See all
          </Link>
        </div>
        {categories.map((category, index) => {
          const drills = tests.filter((test) => test.category === category.id)
          return (
            <motion.article
              key={category.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="panel rounded-3xl p-3"
            >
              <Link to={`/drills/${category.id}`} className="block px-1 pb-2 pt-1">
                <h3 className={cn('text-base font-semibold', toneText[category.tone])}>{category.title}</h3>
                <p className="text-sm text-mute">{category.blurb}</p>
              </Link>
              <ul className="space-y-1">
                {drills.map((drill) => {
                  const best = bestScore(results, drill.id)
                  const rt = bestReaction(results, drill.id)
                  return (
                    <li key={drill.id}>
                      <Link
                        to={`/play/${drill.id}`}
                        className="flex min-h-12 items-center gap-3 rounded-2xl px-2 hover:bg-white/5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{drill.title}</span>
                          <span className="block truncate text-xs text-mute">{drill.summary}</span>
                        </span>
                        <span className="text-right font-mono text-xs text-white/80">
                          {best == null ? drill.duration : rt != null ? formatMs(rt) : String(best)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </motion.article>
          )
        })}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-mute">Recent</h2>
        {recent.length === 0 ? (
          <p className="panel rounded-3xl px-4 py-5 text-sm text-mute">Your first drill sets the baseline.</p>
        ) : (
          <ul className="panel divide-y divide-white/5 rounded-3xl">
            {recent.map((item) => {
              const copy = tests.find((test) => test.id === item.testId)
              return (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{copy?.title}</p>
                    <p className="text-xs text-mute">{item.valid ? 'Saved' : 'Flagged'}</p>
                  </div>
                  <p className="font-mono text-sm">{item.score}</p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Disclaimer />
      <p className="pb-2 text-[11px] leading-relaxed text-mute">
        Guest progress stays on this device. Original marks only — not affiliated with any publisher.
      </p>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  highlightColor,
}: {
  label: string
  value: string
  hint: string
  highlightColor?: string
}) {
  return (
    <div className="panel rounded-2xl px-3 py-3">
      <p className="text-[11px] uppercase tracking-wider text-mute">{label}</p>
      <p
        className="mt-1 font-mono text-xl sm:text-2xl font-bold tabular-nums truncate"
        style={{ color: highlightColor }}
      >
        {value}
      </p>
      <p className="text-[11px] text-mute truncate">{hint}</p>
    </div>
  )
}
