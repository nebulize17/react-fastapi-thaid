import React from 'react'

export default function Login() {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')

  const handleLogin = () => {
    window.location.href = 'http://localhost:8000/api/auth/login'
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-black overflow-hidden">
      {/* Decorative animated background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-[40rem] h-[40rem] bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[40rem] h-[40rem] bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      
      <div className="relative z-10 w-full max-w-md p-10 m-4 backdrop-blur-2xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 text-center">
        <div className="mx-auto w-24 h-24 mb-6 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 p-[2px] shadow-lg shadow-cyan-500/50">
          <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
            <svg xmlns="http://www.开展.org/2000/svg" className="w-12 h-12 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
          </div>
        </div>
        
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-3 tracking-tight">
          ThaID Identity
        </h1>
        <p className="text-gray-400 mb-8 font-medium">Sign in securely to access your dashboard</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-300 max-w-xs mx-auto text-sm animate-pulse">
            Authentication failed or cancelled.
          </div>
        )}
        
        <button 
          onClick={handleLogin}
          className="w-full py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.8)] hover:from-blue-500 hover:to-purple-500 transform hover:-translate-y-1 transition-all duration-300 active:translate-y-0 active:scale-95"
        >
          Login with ThaID
        </button>
      </div>
    </div>
  )
}
