import { NavLink } from 'react-router-dom'
import { IconChart, IconFlame, IconGrid, IconHome, IconShield, IconTrophy } from '@/components/icons'
import { cn } from '@/lib/cn'
import { useAuth } from '@/stores/authStore'

export function BottomNav() {
  const isAdmin = useAuth((state) => state.isAdmin)

  const items = [
    { to: '/', label: 'Home', icon: IconHome, end: true },
    { to: '/drills', label: 'Drills', icon: IconGrid, end: false },
    { to: '/ranking', label: 'Rankings', icon: IconTrophy, end: false },
    { to: '/warmup', label: 'Warm-up', icon: IconFlame, end: false },
    { to: '/progress', label: 'Profile', icon: IconChart, end: false },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: IconShield, end: false }] : []),
  ]

  const gridClass =
    items.length === 6 ? 'grid-cols-6' : items.length === 5 ? 'grid-cols-5' : 'grid-cols-4'

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0b0d13]/90 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl"
    >
      <ul className={`mx-auto grid max-w-lg ${gridClass}`}>
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] sm:text-[11px] font-medium transition-colors px-1',
                  isActive
                    ? item.to === '/admin'
                      ? 'text-coral'
                      : item.to === '/ranking'
                        ? 'text-gold'
                        : 'text-pulse'
                    : 'text-mute',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
