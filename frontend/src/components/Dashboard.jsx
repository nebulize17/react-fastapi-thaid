import React, { useEffect, useState } from 'react'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users/me')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json()
      })
      .then(data => {
        setUser(data.user)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        window.location.href = '/?error=auth_failed'
      })
  }, [])

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      window.location.href = '/'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 pt-10 md:pt-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700 shadow focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            Logout
          </button>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
          {/* Subtle glow effect */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 mb-8 pb-8 border-b border-slate-700/80 relative z-10">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-1 shadow-xl shadow-purple-900/30">
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-4xl font-bold text-white border-4 border-slate-800">
                {user?.name?.charAt(0) || user?.given_name_en?.charAt(0) || 'U'}
              </div>
            </div>
            <div className="text-center md:text-left pt-2">
              <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">
                {user?.title} {user?.name}
              </h2>
              <p className="text-cyan-400 font-mono bg-cyan-950/40 px-3 py-1.5 rounded-md inline-block border border-cyan-900/50 shadow-inner">
                PID: {user?.pid || 'N/A'}
              </p>
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-slate-200 mb-5 relative z-10">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-10">
            <InfoCard label="English Name" value={`${user?.title_en || ''} ${user?.given_name_en || ''} ${user?.middle_name_en || ''} ${user?.family_name_en || ''}`.trim()} />
            <InfoCard label="Birthdate" value={user?.birthdate} />
            <InfoCard label="Gender" value={user?.gender === '1' ? 'Male' : user?.gender === '2' ? 'Female' : user?.gender} />
            <InfoCard label="Address" value={user?.address} className="md:col-span-2" />
          </div>
          
          <div className="mt-10 pt-8 border-t border-slate-700/80 relative z-10">
            <h3 className="text-lg font-medium text-slate-400 mb-4">Raw Data Payload (Developer)</h3>
            <pre className="bg-slate-950/80 p-5 rounded-2xl text-xs md:text-sm text-cyan-300 overflow-x-auto border border-slate-800 shadow-inner">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value, className = '' }) {
  if (!value) return null;
  return (
    <div className={`bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 shadow-sm hover:border-slate-600 transition-colors ${className}`}>
      <div className="text-xs text-slate-400 uppercase tracking-widest mb-1.5 font-bold">{label}</div>
      <div className="text-slate-100 font-medium text-lg">{value}</div>
    </div>
  )
}
