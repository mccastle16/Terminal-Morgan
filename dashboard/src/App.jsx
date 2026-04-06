import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import TerminalRoutes from './terminal/TerminalRoutes'

// Mode 1: My Business
import MyBusinessPage from './pages/MyBusinessPage'
import ActionPlanPage from './pages/ActionPlanPage'
import GoToActionsPage from './pages/GoToActionsPage'
import EcosystemPage from './pages/EcosystemPage'

// Mode 2: Market Intel
import MarketIntelPage from './pages/MarketIntelPage'
import ComparePage from './pages/ComparePage'
import RiskRadarPage from './pages/RiskRadarPage'
import ExperimentLabPage from './pages/ExperimentLabPage'

// Mode 3: Discover
import DiscoverPage from './pages/DiscoverPage'
import BrowsePage from './pages/BrowsePage'
import GraphExplorerPage from './pages/GraphExplorerPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cgcc-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Default redirect to My Business */}
        <Route index element={<Navigate to="/my-business" replace />} />

        {/* Mode 1: My Business */}
        <Route path="my-business" element={<MyBusinessPage />} />
        <Route path="my-business/actions" element={<ActionPlanPage />} />
        <Route path="my-business/go-to-actions" element={<GoToActionsPage />} />
        <Route path="my-business/ecosystem" element={<EcosystemPage />} />

        {/* Mode 2: Market Intel */}
        <Route path="market-intel" element={<MarketIntelPage />} />
        <Route path="market-intel/compare" element={<ComparePage />} />
        <Route path="market-intel/risks" element={<RiskRadarPage />} />
        <Route path="market-intel/experiments" element={<ExperimentLabPage />} />

        {/* Mode 3: Discover */}
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="discover/browse" element={<BrowsePage />} />
        <Route path="discover/graph" element={<GraphExplorerPage />} />
      </Route>

      {/* Terminal Module */}
      <Route path="/terminal/*" element={<TerminalRoutes />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
