import React, { useEffect, useState } from 'react'

function IconCheckCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '64px', height: '64px', color: '#22c55e', margin: '0 auto 16px' }}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

export default function Logout() {
  const [phase, setPhase] = useState('processing') // processing | success
  const [logoutUrl, setLogoutUrl] = useState('')

  useEffect(() => {
    // 1. ดึงค่า magic และ fw_ip จาก URL query parameters หรือ localStorage
    const params = new URLSearchParams(window.location.search)
    let magic = params.get('magic')
    let fwIp = params.get('fw_ip') || '192.168.64.253'

    if (!magic) {
      const storedParams = localStorage.getItem('captive_params')
      if (storedParams) {
        try {
          const parsed = JSON.parse(storedParams)
          magic = parsed.magic
          if (parsed.fw_ip) {
            fwIp = parsed.fw_ip
          }
        } catch (e) {
          console.error('Error parsing captive_params from localStorage', e)
        }
      }
    }

    if (magic) {
      // ตั้งค่า URL สำหรับการยิง Logout ไปยัง FortiGate
      const targetUrl = `https://${fwIp}:1442/logout?magic=${magic}`
      setLogoutUrl(targetUrl)

      // ล้างข้อมูลความสำเร็จเดิมใน localStorage เพื่อความปลอดภัย
      localStorage.removeItem('thaid_success_data')
      localStorage.removeItem('captive_params')

      // หน่วงเวลา 2.5 วินาทีเพื่อให้เบราว์เซอร์ส่ง GET request ไปยัง FortiGate จนเสร็จสิ้น
      const timer = setTimeout(() => {
        setPhase('success')
      }, 2500)

      return () => clearTimeout(timer)
    } else {
      // หากไม่มี session ค้างอยู่เลย ให้ถือว่าเคลียร์สำเร็จทันที
      localStorage.removeItem('thaid_success_data')
      localStorage.removeItem('captive_params')
      setPhase('success')
    }
  }, [])

  const handleReturnToLogin = () => {
    window.location.href = '/'
  }

  return (
    <div className="portal-root">
      {/* แทรก Iframe ในเบื้องหลังเพื่อเรียกหน้า Logout ของ FortiGate */}
      {logoutUrl && (
        <iframe
          src={logoutUrl}
          title="Fortigate Logout Backend Trigger"
          style={{ display: 'none' }}
        />
      )}

      <div className="portal-card" style={{ padding: '40px 32px', textAlign: 'center' }}>
        {phase === 'processing' ? (
          <>
            <div className="loading-spinner" style={{ margin: '0 auto 24px' }} />
            <h2 style={{ color: '#0F3A6C', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
              กำลังออกจากระบบอินเทอร์เน็ต
            </h2>
            <p className="loading-text" style={{ color: '#6b7280', fontSize: '15px' }}>
              ระบบกำลังยกเลิกการเชื่อมต่อของคุณกับ FortiGate Firewall...
            </p>
          </>
        ) : (
          <div className="logout-success-content" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <IconCheckCircle />
            <h2 style={{ color: '#0F3A6C', fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>
              ออกจากระบบสำเร็จแล้ว
            </h2>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
              ระบบได้ทำการพิสูจน์ตัวตนออกจากการใช้งานอินเทอร์เน็ตของคุณเรียบร้อยแล้ว คุณสามารถปิดหน้าต่างนี้ได้ทันที หรือคลิกปุ่มด้านล่างเพื่อเข้าสู่ระบบใหม่อีกครั้ง
            </p>
            <button
              onClick={handleReturnToLogin}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #0F3A6C 0%, #1a5a9a 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(15, 58, 108, 0.25)',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              กลับหน้าหลัก / เข้าสู่ระบบใหม่
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
