import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { setSoundEnabled, warmAudio } from '@/lib/audio'
import { AdminPage } from '@/pages/AdminPage'
import { AuthPage } from '@/pages/AuthPage'
import { DrillsPage } from '@/pages/DrillsPage'
import { HomePage } from '@/pages/HomePage'
import { PlayPage } from '@/pages/PlayPage'
import { ProgressPage } from '@/pages/ProgressPage'
import { RankingPage } from '@/pages/RankingPage'
import { WarmupPage } from '@/pages/WarmupPage'
import { useAuth } from '@/stores/authStore'
import { useProgress } from '@/stores/progressStore'

export default function App() {
  const sound = useProgress((state) => state.sound)
  const initAuth = useAuth((state) => state.initAuth)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  useEffect(() => {
    setSoundEnabled(sound)
  }, [sound])

  useEffect(() => {
    const unlock = () => warmAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/drills" element={<DrillsPage />} />
            <Route path="/drills/:categoryId" element={<DrillsPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/play/:testId" element={<PlayPage />} />
            <Route path="/warmup" element={<WarmupPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  )
}
