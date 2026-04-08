import { Routes, Route } from 'react-router-dom'
import TerminalRoutes from './terminal/TerminalRoutes'

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<TerminalRoutes />} />
    </Routes>
  )
}
