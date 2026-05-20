import { useEffect, useState } from 'react'
import QRPortal from './components/QRPortal'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname)
    }
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  // ── Routing ──────────────────────────────────────────────
  // /             → QRPortal (Captive Portal หน้าหลัก — FortiGate redirect มาที่นี่)
  // /login        → Login (fallback สำหรับ redirect-based login)
  // /dashboard    → Dashboard (แสดงข้อมูลผู้ใช้หลัง auth)
  let content
  if (currentPath === '/dashboard') {
    content = <Dashboard />
  } else if (currentPath === '/qr') {
    content = <QRPortal />
  } else {
    // หน้าหลัก: Captive Portal (ปุ่มล็อกอินเปลี่ยนเส้นทางไป BORA)
    content = <Login />
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {content}
    </div>
  )
}

export default App
