import React from 'react'

export default function Login() {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')

  const handleLogin = () => {
    // Using relative path to work on both local and Ubuntu
    window.location.href = '/api/auth/login'
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Banner / Header */}
      <header className="border-b border-gray-100 bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img src="/dtam.png" alt="DTAM Logo" className="h-16 w-auto object-contain" />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">ระบบบริการการแพทย์ทางไกล</h1>
              <p className="text-sm font-semibold text-green-700">Telemedicine Service</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
             <img src="/thaid.jpg" alt="ThaiD Logo" className="h-14 w-auto object-contain rounded-full shadow-sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center p-6 pt-20">
        <div className="w-full max-w-lg">
          <div className="bg-white p-10 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.08)] border border-gray-100 text-center">
            
            <div className="mb-10">
              <h2 className="text-3xl font-extrabold text-slate-900 mb-2">ยินดีต้อนรับ</h2>
              <p className="text-slate-500 font-medium">กรุณาเข้าสู่ระบบเพื่อเข้าถึงข้อมูลส่วนบุคคลของคุณ</p>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm text-left">
                ระบบไม่สามารถตรวจสอบตัวตนได้ กรุณาลองใหม่อีกครั้ง
              </div>
            )}

            <div className="space-y-6">
              <button 
                onClick={handleLogin}
                className="group relative w-full flex items-center justify-center space-x-4 py-5 px-6 rounded-2xl border-2 border-slate-200 hover:border-[#1e3a8a] bg-white transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1"
              >
                <img src="/thaid.jpg" alt="ThaiD" className="w-10 h-10 object-contain rounded-full border border-gray-100" />
                <span className="text-xl font-bold text-[#1e3a8a]">เข้าสู่ระบบด้วย ThaID</span>
                 <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-6 w-6 h-6 text-slate-400 group-hover:text-[#1e3a8a] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <p className="text-xs text-slate-400 mt-6 pt-6 border-t border-gray-100 italic">
                เฉพาะเจ้าหน้าที่และผู้ได้รับอนุญาตเท่านั้น
              </p>
            </div>
          </div>
          
          <div className="mt-12 text-center text-slate-400 text-sm font-medium">
             &copy; {new Date().getFullYear()} กรมการแพทย์แผนไทยและการแพทย์ทางเลือก
          </div>
        </div>
      </main>
    </div>
  )
}
