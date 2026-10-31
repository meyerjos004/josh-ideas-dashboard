import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import './index.css'
import { StoreProvider, useStore } from './lib/store'
import Shell, { PersonGate } from './components/Shell'
import Today from './pages/Today'
import Board from './pages/Board'
import IdeaPage from './pages/IdeaPage'
import Compare, { Trash } from './pages/Compare'
import Sessions, { SessionPage } from './pages/Sessions'
import Hours from './pages/Hours'
import CoachPage from './pages/CoachPage'
import Roadmap from './pages/Roadmap'
import Setup from './pages/Setup'

function App() {
  const { person } = useStore()
  if (!person) return <PersonGate />
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Today />} />
        <Route path="board" element={<Board />} />
        <Route path="idea/:id" element={<IdeaPage />} />
        <Route path="compare" element={<Compare />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="sessions/:id" element={<SessionPage />} />
        <Route path="hours" element={<Hours />} />
        <Route path="coach" element={<CoachPage />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="setup" element={<Setup />} />
        <Route path="trash" element={<Trash />} />
        <Route path="*" element={<Today />} />
      </Route>
    </Routes>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <StoreProvider><App /></StoreProvider>
      </HashRouter>
    </MotionConfig>
  </StrictMode>
)
