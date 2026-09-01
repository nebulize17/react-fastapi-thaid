import { useEffect, useState } from 'react'
import QRPortal from './components/QRPortal'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Logout from './components/Logout'
import CreateGuest from './components/CreateGuest'

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
  // /             → Login/QRPortal (Captive Portal หน้าหลัก — FortiGate redirect มาที่นี่)
  // /qr           → QRPortal (แสกน QR)
  // /keepalive    → QRPortal (หน้า Keepalive Dashboard หลังต่อติดแล้ว)
  // /logout       → Logout (หน้าหลังจากออกจากระบบสำเร็จ)
  // /dashboard    → Dashboard (แสดงข้อมูลผู้ใช้หลัง auth)
  // /admin /create-guest → CreateGuest (สร้างบัญชีเกสท์ชั่วคราว)
  let content
  if (currentPath === '/dashboard') {
    content = <Dashboard />
  } else if (currentPath === '/qr') {
    content = <QRPortal />
  } else if (currentPath === '/keepalive') {
    content = <QRPortal keepaliveOnly={true} />
  } else if (currentPath === '/logout') {
    content = <Logout />
  } else if (currentPath === '/admin' || currentPath === '/create-guest') {
    content = <CreateGuest />
  } else {
    content = <Login />
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {content}
    </div>
  )
}

export default App
