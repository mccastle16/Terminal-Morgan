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
import TacticalPage from './tactical/pages/TacticalPage'
import MyBusinessPage from './pages/MyBusinessPage'
import ActionPlanPage from './pages/ActionPlanPage'
import EcosystemPage from './pages/EcosystemPage'
import GoToActionsPage from './pages/GoToActionsPage'
import ExperimentLabPage from './pages/ExperimentLabPage'
import GraphExplorerPage from './pages/GraphExplorerPage'
import ContentStudioPage from './pages/ContentStudioPage'

function TerminalProtected({ children }) {
  const { user, loading } = useTerminalAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
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
            <Route path="tactical" element={<TacticalPage />} />
            <Route path="my-business" element={<MyBusinessPage />} />
            <Route path="my-business/actions" element={<ActionPlanPage />} />
            <Route path="ecosystem" element={<EcosystemPage />} />
            <Route path="playbook" element={<GoToActionsPage />} />
            <Route path="experiments" element={<ExperimentLabPage />} />
            <Route path="graph" element={<GraphExplorerPage />} />
            <Route path="content" element={<ContentStudioPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </TerminalDataProvider>
    </TerminalAuthProvider>
  )
}
