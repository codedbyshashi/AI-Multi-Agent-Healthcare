import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import History from './pages/History'
import AnalysisResult from './pages/AnalysisResult'

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, paddingTop: '72px' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analysis" element={<AnalysisResult />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
