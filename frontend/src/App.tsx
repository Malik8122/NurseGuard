import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Login      from './pages/Login'
import Layout     from './components/Layout'
import Dashboard  from './pages/Dashboard'
import Schedule   from './pages/Schedule'
import UploadCSV  from './pages/UploadCSV'
import Nurses     from './pages/Nurses'
import Fatigue    from './pages/Fatigue'
import Reports    from './pages/Reports'
import Settings   from './pages/Settings'

const isAuth = () => !!localStorage.getItem('user')

function Guard({ children }: { children: React.ReactNode }) {
  return isAuth() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index              element={<Dashboard />} />
            <Route path="schedule"    element={<Schedule />} />
            <Route path="upload"      element={<UploadCSV />} />
            <Route path="nurses"      element={<Nurses />} />
            <Route path="fatigue"     element={<Fatigue />} />
            <Route path="reports"     element={<Reports />} />
            <Route path="settings"    element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}