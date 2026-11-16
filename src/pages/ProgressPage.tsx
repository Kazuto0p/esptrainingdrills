import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { categories, tests } from '@/content/catalog'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { Button } from '@/components/ui/Button'
import { formatMs, formatWhen } from '@/lib/dates'
import { getTier } from '@/lib/scoring'
import { useAuth } from '@/stores/authStore'
import { averageScore, bestReaction, bestScore, useProgress, visibleStreak } from '@/stores/progressStore'

export function ProgressPage() {
  const navigate = useNavigate()
  const results = useProgress((state) => state.results)
  const streak = useProgress((state) => state.streak)
  const guestId = useProgress((state) => state.guestId)
  const clearLocal = useProgress((state) => state.clearLocal)
  const importData = useProgress((state) => state.importData)
  const { user, profile, isAdmin, signOut } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const days = visibleStreak(streak)
  const overallAvg = averageScore(results) ?? 0
  const tier = getTier(overallAvg)

  const axes = useMemo(
    () =>
      categories.map((category) => {
        const ids = tests.filter((test) => test.category === category.id).map((test) => test.id)
        const pool = results.filter((item) => item.valid && ids.includes(item.testId))
        const value = pool.length === 0 ? 0 : pool.reduce((sum, item) => sum + item.score, 0) / pool.length
        return { label: category.title.split(' ')[0] ?? category.title, value }
      }),
    [results],
  )
  const hasData = results.some((item) => item.valid)

  const handleExport = () => {
    const data = {
      guestId,
      exportedAt: new Date().toISOString(),
      streak,
      results,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pulse-arena-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatusMsg('Export downloaded successfully!')
    setTimeout(() => setStatusMsg(null), 3000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        const ok = importData(parsed)
        if (ok) {
          setStatusMsg('Backup imported successfully!')
        } else {
          setStatusMsg('Invalid backup format.')
        }
      } catch {
        setStatusMsg('Error reading backup file.')
      }
      setTimeout(() => setStatusMsg(null), 3500)
    }
    reader.readAsText(file)
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-[max(1.1rem,env(safe-area-inset-top))]">
      <header className="relative overflow-hidden rounded-3xl panel p-5">
        <div
          className="pointer-events-none absolute -right-6 -top-6 w-36 h-36 blur-3xl opacity-25"
          style={{ backgroundColor: tier.color }}
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse">Athletic Profile</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{days} Day Streak</h1>
            <p className="mt-1 font-mono text-xs text-mute">ID: {guestId.slice(0, 12)}</p>
          </div>
          <div className="text-right">
            <span
              className="inline-block rounded-full px-3 py-1 font-semibold text-xs border"
              style={{
                color: tier.color,
                backgroundColor: tier.bg,
                borderColor: `${tier.color}40`,
              }}
            >
              {tier.title}
            </span>
            <p className="mt-1 text-xs font-mono text-mute">{overallAvg > 0 ? `${overallAvg} MMR` : 'Unranked'}</p>
          </div>
        </div>
      </header>

      {statusMsg && (
        <div className="rounded-2xl border border-pulse/30 bg-pulse/10 px-4 py-2.5 text-center text-sm font-medium text-pulse animate-fade-in">
          {statusMsg}
        </div>
      )}

      <section className="panel rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Skill Radar</h2>
          <span className="text-xs text-mute">0–1000 scale</span>
        </div>
        <p className="mt-1 text-xs text-mute">
          {hasData ? 'Category performance across valid attempts.' : 'Complete drills to establish your athletic polygon.'}
        </p>
        <Radar values={axes.map((axis) => axis.value)} labels={axes.map((axis) => axis.label)} />
      </section>

      <section className="panel rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Cloud Account & Sync</h2>
          {user ? (
            <span className="rounded-full bg-pulse/20 border border-pulse/40 px-2 py-0.5 text-[10px] font-bold text-pulse uppercase">
              Connected
            </span>
          ) : (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-mute uppercase font-mono">
              Guest Mode
            </span>
          )}
        </div>

        {user ? (
          <div className="rounded-2xl bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-white">
                  {profile?.display_name || user.email?.split('@')[0]}
                </p>
                <p className="text-xs font-mono text-mute">{user.email}</p>
              </div>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                  isAdmin
                    ? 'bg-coral/20 text-coral border-coral/40'
                    : 'bg-white/10 text-mute border-white/20'
                }`}
              >
                {isAdmin ? 'ADMIN' : 'PLAYER'}
              </span>
            </div>

            {isAdmin && (
              <Button
                full
                onClick={() => navigate('/admin')}
                className="bg-coral hover:bg-coral/90 text-bg font-bold py-2.5"
              >
                👑 Open Admin Command Panel
              </Button>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" full className="text-xs" onClick={() => signOut()}>
                Sign Out
              </Button>
              <Button variant="ghost" className="text-xs" onClick={handleExport}>
                Export Data
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-mute">
              Sign in to sync your Ranked Mode attempts (2/day per drill) to the global cloud leaderboards and compete for rank.
            </p>
            <div className="flex gap-2">
              <Button full onClick={() => navigate('/auth')}>
                Sign In / Register
              </Button>
              <Button variant="ghost" onClick={handleExport}>
                Export
              </Button>
              <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
                Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="pt-1">
              <Link
                to="/admin"
                className="block text-center text-[11px] text-mute hover:text-coral transition-colors"
              >
                Switch to Admin Command Panel →
              </Link>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-mute">Personal Bests</h2>
        <ul className="panel divide-y divide-white/5 rounded-3xl">
          {tests.map((test) => {
            const best = bestScore(results, test.id)
            const rt = bestReaction(results, test.id)
            const avg = averageScore(results, test.id)
            return (
              <li key={test.id}>
                <Link to={`/play/${test.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{test.title}</p>
                    <p className="text-xs text-mute">{avg == null ? 'No attempts' : `Avg ${avg}`}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold">{best ?? '—'}</p>
                    <p className="font-mono text-[11px] text-mute">{rt == null ? '' : formatMs(rt)}</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-mute">Recent Attempts</h2>
        {results.length === 0 ? (
          <p className="panel rounded-3xl px-4 py-5 text-sm text-mute">Nothing saved yet.</p>
        ) : (
          <ul className="panel divide-y divide-white/5 rounded-3xl">
            {results.slice(0, 10).map((item) => {
              const copy = tests.find((test) => test.id === item.testId)
              return (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{copy?.title}</p>
                    <p className="text-xs text-mute">
                      {formatWhen(item.timestamp)} ·{' '}
                      <span className={item.playMode === 'ranked' ? 'text-gold font-semibold' : 'text-slate-400'}>
                        {item.playMode === 'ranked' ? 'Ranked' : 'Classic'}
                      </span> ·{' '}
                      {item.valid ? (
                        <span className="text-pulse">Verified</span>
                      ) : (
                        <span className="text-gold">{item.flags[0]}</span>
                      )}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-semibold">{item.score}</p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Disclaimer />

      {confirming ? (
        <div className="grid grid-cols-2 gap-2 pb-6">
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              clearLocal()
              setConfirming(false)
            }}
          >
            Confirm Erase
          </Button>
        </div>
      ) : (
        <div className="pb-6">
          <Button variant="ghost" full onClick={() => setConfirming(true)}>
            Erase Local Progress
          </Button>
        </div>
      )}
    </div>
  )
}

function Radar({ values, labels }: { values: number[]; labels: string[] }) {
  const cx = 120
  const cy = 118
  const radius = 78
  const rings = [0.35, 0.65, 1]
  const points = values.map((value, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / values.length
    const distance = radius * Math.max(0, Math.min(1, value / 1000))
    return [cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance] as const
  })
  const polygon = points.map((point) => point.join(',')).join(' ')

  return (
    <svg viewBox="0 0 240 230" className="mx-auto mt-2 w-full max-w-[280px]" role="img" aria-label="Category score chart">
      {rings.map((ring) => (
        <polygon
          key={ring}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          points={labels
            .map((_, index) => {
              const angle = -Math.PI / 2 + (index * 2 * Math.PI) / labels.length
              return `${cx + Math.cos(angle) * radius * ring},${cy + Math.sin(angle) * radius * ring}`
            })
            .join(' ')}
        />
      ))}
      {labels.map((label, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / labels.length
        const x = cx + Math.cos(angle) * (radius + 18)
        const y = cy + Math.sin(angle) * (radius + 16)
        return (
          <text key={label} x={x} y={y} textAnchor="middle" fill="#9aa3b5" fontSize="10">
            {label}
          </text>
        )
      })}
      <polygon points={polygon} fill="rgba(46,230,166,0.22)" stroke="#2ee6a6" strokeWidth="1.5" />
    </svg>
  )
}
