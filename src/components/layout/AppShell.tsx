import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '@/components/layout/BottomNav'

export function AppShell() {
  const location = useLocation()
  const immersive = location.pathname.startsWith('/play') || location.pathname.startsWith('/warmup')

  return (
    <div className="h-dvh overflow-hidden text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-pulse focus:px-3 focus:py-2 focus:text-bg"
      >
        Skip to content
      </a>
      <div id="main" className={immersive ? 'h-full' : 'h-full overflow-y-auto pb-24'}>
        <Outlet />
      </div>
      {!immersive && <BottomNav />}
    </div>
  )
}
