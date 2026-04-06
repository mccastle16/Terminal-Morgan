import { Routes, Route, Navigate } from 'react-router-dom'
import { TerminalAuthProvider, useTerminalAuth } from './context/TerminalAuthContext'
import { TerminalDataProvider } from './context/TerminalDataContext'
import TerminalLayout from './components/TerminalLayout'
import TerminalLoginPage from './pages/TerminalLoginPage'
import OverviewPage from './pages/OverviewPage'
import BrowsePage from './pages/BrowsePage'
import ExplorerPage from './pages/ExplorerPage'
import RecruitQueuePage from './pages/RecruitQueuePage'
import AnalyticsPage from './pages/AnalyticsPage'
import RiskRadarPage from './pages/RiskRadarPage'
import ComparePage from './pages/ComparePage'
import MarketIntelPage from './pages/MarketIntelPage'
import TacticalPage from './tactical/pages/TacticalPage'

function TerminalProtected({ children }) {
  const { user, loading } = useTerminalAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/terminal/login" replace />
  return children
}

export default function TerminalRoutes() {
  return (
    <TerminalAuthProvider>
      <TerminalDataProvider>
        <Routes>
          <Route path="login" element={<TerminalLoginPage />} />
          <Route
            path=""
            element={
              <TerminalProtected>
                <TerminalLayout />
              </TerminalProtected>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="browse" element={<BrowsePage />} />
            <Route path="explorer/:id" element={<ExplorerPage />} />
            <Route path="recruit" element={<RecruitQueuePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="risks" element={<RiskRadarPage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="market" element={<MarketIntelPage />} />
            <Route path="tactical" element={<TacticalPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/terminal/overview" replace />} />
        </Routes>
      </TerminalDataProvider>
    </TerminalAuthProvider>
  )
}
