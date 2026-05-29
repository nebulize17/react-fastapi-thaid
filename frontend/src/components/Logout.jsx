import React, { useEffect } from 'react'

export default function Logout() {
  useEffect(() => {
    // 1. ดึงค่า magic จาก localStorage หรือ URL query parameters
    const params = new URLSearchParams(window.location.search)
    let magic = params.get('magic')

    if (!magic) {
      const storedParams = localStorage.getItem('captive_params')
      if (storedParams) {
        try {
          const parsed = JSON.parse(storedParams)
          magic = parsed.magic
        } catch (e) {
          console.error('Error parsing captive_params from localStorage', e)
        }
      }
    }

    // 2. นำไปล้าง Session ที่ FortiGate ทันที
    if (magic) {
      const logoutUrl = `https://192.168.150.1:1442/logout?magic=${magic}`
      window.location.href = logoutUrl
    } else {
      // หากไม่มีค่า magic จริงๆ ให้พากลับหน้าแรก
      window.location.href = '/'
    }
  }, [])

  return (
    <div className="portal-root">
      <div className="portal-card">
        <div className="loading-spinner" />
        <p className="loading-text" style={{ textAlign: 'center', paddingBottom: '30px' }}>
          กำลังออกจากระบบอินเทอร์เน็ต (Logging out)...
        </p>
      </div>
    </div>
  )
}
