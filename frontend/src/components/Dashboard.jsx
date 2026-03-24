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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-900 mb-4"></div>
            <p className="text-slate-600 font-medium">ระบบกำลังตรวจสอบข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F7F9]">
      {/* Header Banner */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
             <img src="/dtam.png" alt="DTAM Logo" className="h-14 w-auto object-contain" />
             <div className="h-8 w-[1px] bg-gray-200 hidden sm:block"></div>
             <h1 className="text-lg font-bold text-slate-800 hidden sm:block">ระบบตรวจสอบข้อมูลบริการทางการแพทย์</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="px-6 py-2.5 bg-[#1e3a8a] text-white rounded-xl font-bold hover:bg-blue-800 transition-all shadow hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          
          {/* Hero Section / Profile Summary */}
          <div className="bg-[#1e3a8a] p-8 md:p-12 text-white flex flex-col md:flex-row items-center md:items-start md:space-x-10 text-center md:text-left">
             <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/20 shadow-2xl bg-white/10 backdrop-blur flex items-center justify-center text-5xl md:text-6xl font-black mb-6 md:mb-0">
                {user?.name?.charAt(0) || 'U'}
             </div>
             <div className="flex-1">
                <div className="uppercase tracking-[0.2em] text-blue-200 text-sm font-bold mb-2">ข้อมูลผู้เข้าใช้งานระบบ</div>
                <h2 className="text-3xl md:text-4xl font-extrabold mb-4">{user?.title} {user?.name}</h2>
                <div className="inline-flex items-center bg-white/10 border border-white/20 backdrop-blur rounded-full px-5 py-2">
                   <span className="text-blue-100 text-sm font-bold mr-3">หมายเลขบัตรประชาชน:</span>
                   <span className="text-white font-mono text-lg tracking-wider font-extrabold">{user?.pid}</span>
                </div>
             </div>
          </div>

          <div className="p-8 md:p-12">
            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center">
              <span className="w-1.5 h-8 bg-[#1e3a8a] rounded-full mr-4"></span>
              ประวัติส่วนบุคคล (Thai Identity)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12">
              <InfoRow label="ชื่อสากล (English Name)" value={`${user?.title_en || ''} ${user?.given_name_en || ''} ${user?.middle_name_en || ''} ${user?.family_name_en || ''}`.trim()} />
              <InfoRow label="วันเกิด (Birthdate)" value={user?.birthdate} />
              <InfoRow label="เพศ (Gender)" value={user?.gender === '1' ? 'ชาย' : user?.gender === '2' ? 'หญิง' : user?.gender || '-'} />
              <InfoRow label="ที่อยู่ตามทะเบียนบ้าน (Official Address)" value={user?.address} isFullWidth={true} />
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
               <h4 className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-4">ข้อมูลดิบจากระบบ (Developer Payload)</h4>
               <pre className="text-[13px] text-slate-700 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {JSON.stringify(user, null, 2)}
               </pre>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-400 text-sm font-medium italic">
          ข้อมูลนี้เป็นความลับเฉพาะบุคคล ห้ามเปิดเผยแก่ผู้ไม่มีส่วนเกี่ยวข้อง
        </p>
      </main>
    </div>
  )
}

function InfoRow({ label, value, isFullWidth = false }) {
  return (
    <div className={`flex flex-col space-y-2 pb-4 border-b border-slate-100 ${isFullWidth ? 'md:col-span-2' : ''}`}>
      <span className="text-xs uppercase tracking-widest text-slate-400 font-black">{label}</span>
      <span className="text-lg text-slate-800 font-bold">
        {value || <span className="text-slate-300 font-normal italic">ไม่มีข้อมูล</span>}
      </span>
    </div>
  )
}
