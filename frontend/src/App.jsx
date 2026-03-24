import { useEffect, useState } from 'react'
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

  // Simple basic routing
  let content = <Login />
  if (currentPath === '/dashboard') {
    content = <Dashboard />
  }

  return (
    <div className="min-h-screen">
      {content}
    </div>
  )
}

export default App
