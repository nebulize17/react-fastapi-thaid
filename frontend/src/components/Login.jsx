import React, { useState } from 'react'

export default function Login() {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')
  const [showCnaWarning, setShowCnaWarning] = useState(false)

  const proceedToLogin = () => {
    const magic = params.get('magic') || ''
    const originalUrl = params.get('original_url') || params.get('url') || ''
    const authUrl = params.get('auth_url') || ''
    const mac = params.get('mac') || params.get('client_mac') || ''
    const ip = params.get('ip') || params.get('client_ip') || ''
    const fwIp = params.get('fw_ip') || ''

    // จัดเตรียม state สำหรับส่งไปพร้อมกับ oauth callback
    const stateObj = {
      mac: mac,
      ip: ip,
      originalUrl: originalUrl,
      magic: magic,
      fw_ip: fwIp,
      auth_url: authUrl,
      qr_session: ''
    }

    // ข้อมูลสำหรับเชื่อมต่อ ThaiD (ต้องตรงกับฝั่ง Backend ใน .env)
    const clientId = 'cTFDQlVxVHFBWWVaT3hDckprZ3R4aDdvakk4c21mZ1o' // THAID_CLIENT_ID
    const redirectUri = 'https://api-gateway.dtam.moph.go.th/api/auth/callback' // THAID_CALLBACK_ENDPOINT
    const scopes = 'openid pid title title_en given_name_en family_name_en name name_en'

    const thaidAuthUrl = 'https://imauth.bora.dopa.go.th/api/v2/oauth2/auth/' +
      '?response_type=code' +
      '&client_id=' + encodeURIComponent(clientId) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&scope=' + encodeURIComponent(scopes) +
      '&state=' + encodeURIComponent(JSON.stringify(stateObj))

    // ทำการนำทางไปยังหน้าจอ DOPA สำหรับตรวจสิทธิ์โดยตรงด้วยลิงก์ HTTPS มาตรฐาน
    // เพื่อความเสถียรและป้องกันเบราว์เซอร์บล็อก URL Scheme
    window.location.href = thaidAuthUrl;
  }

  const handleLogin = () => {
    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(ua)
    const isAndroid = /Android/i.test(ua)
    const isSafari = /Safari/i.test(ua)
    const isChrome = /Chrome/i.test(ua)
    
    // Detect Captive Network Assistant (CNA) / WebView in OS
    const isCna = (isIOS && !isSafari) || (isAndroid && (ua.includes('wv') || !isChrome))

    if (isCna) {
      setShowCnaWarning(true)
    } else {
      proceedToLogin()
    }
  }

  return (
    <div className="portal-root" style={{ position: 'relative' }}>
      <div className="portal-card">
        {/* Header */}
        <div className="portal-header">
          <img src="/dtam.png" alt="DTAM" className="header-logo" />
          <div className="header-text">
            <h1 className="header-title">ระบบบริการการแพทย์ทางไกล</h1>
            <p className="header-sub">Telemedicine Service</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
             <img src="/thaid.jpg" alt="ThaiD Logo" className="header-logo" style={{ borderRadius: '50%', height: '48px', width: '48px' }} />
          </div>
        </div>

        {/* WiFi indicator */}
        <div className="wifi-badge">
          <span className="wifi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </span>
          <span>Wi-Fi Authentication Required</span>
        </div>

        {/* Main Content inside the portal-card style */}
        <div style={{ padding: '32px 28px 0', textAlign: 'center' }}>
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px' }}>
              ยินดีต้อนรับ
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              กรุณาเข้าสู่ระบบผ่านระบบยืนยันตัวตนกลาง ThaID เพื่อรับสิทธิ์ในการใช้งานเครือข่ายอินเทอร์เน็ต
            </p>
          </div>

          {error && (
            <div style={{
              marginBottom: '24px',
              padding: '14px 18px',
              background: '#fef2f2',
              borderLeft: '5px solid #ef4444',
              color: '#991b1b',
              fontSize: '14px',
              lineHeight: '1.5',
              textAlign: 'left',
              borderRadius: '8px'
            }}>
              {error === 'user_not_pre_created' ? (
                <>
                  <strong>⚠️ ไม่พบการลงทะเบียนเกสท์ในระบบ:</strong><br />
                  ไม่พบชื่อบัญชีของคุณในระบบฐานข้อมูลผู้เข้าใช้งานชั่วคราว กรุณาติดต่อเจ้าหน้าที่/ประชาสัมพันธ์เพื่อขอลงทะเบียนเปิดบัญชีก่อนทำการสแกนยืนยันตัวตนอีกครั้ง
                </>
              ) : (
                '❌ ระบบไม่สามารถตรวจสอบตัวตนได้ กรุณาลองใหม่อีกครั้ง'
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button 
              onClick={handleLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                padding: '16px 24px',
                borderRadius: 'var(--radius-sm)',
                border: '2px solid var(--border)',
                background: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <img 
                src="/thaid.jpg" 
                alt="ThaiD" 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'contain',
                  border: '1px solid #f0f0f0'
                }} 
              />
              <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                เข้าสู่ระบบด้วย ThaiD
              </span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth={2.5} 
                style={{ width: '20px', height: '20px', marginLeft: 'auto', color: 'var(--text-light)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>


            <p style={{
              fontSize: '11px',
              color: 'var(--text-light)',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #f0f3f7',
              fontStyle: 'italic'
            }}>
              เฉพาะเจ้าหน้าที่และผู้ได้รับอนุญาตเท่านั้น
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="card-footer">
          &copy; {new Date().getFullYear()} กรมการแพทย์แผนไทยและการแพทย์ทางเลือก
        </div>
      </div>

      {/* CNA Warning Modal Overlay */}
      {showCnaWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 58, 108, 0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            borderTop: '5px solid #dc2626',
            width: '100%',
            maxWidth: '440px',
            padding: '28px',
            animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ ตรวจพบข้อจำกัดของป๊อปอัป Wi-Fi
            </h2>
            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', marginBottom: '16px', textAlign: 'left' }}>
              คุณกำลังเชื่อมต่อ Wi-Fi และเปิดหน้านี้ผ่านหน้าต่างป๊อปอัปอัตโนมัติของมือถือ (CNA) 
              ซึ่งระบบความปลอดภัยของมือถือจะ<strong>บล็อกการสลับหน้าจอไปเปิดแอป ThaID</strong>
            </p>
            
            <div style={{ 
              background: '#f9fafb', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px', 
              padding: '16px', 
              textAlign: 'left', 
              marginBottom: '20px',
              fontSize: '14px',
              lineHeight: '1.7'
            }}>
              <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>🛠️ วิธีแก้ไขเพื่อให้เปิดแอป ThaID ได้:</strong>
              <ol style={{ paddingLeft: '20px', margin: 0, color: '#374151' }}>
                <li style={{ marginBottom: '6px' }}>
                  กดปุ่ม <strong>"ยกเลิก" (Cancel)</strong> หรือปิดหน้าต่างป๊อปอัปนี้ที่มุมบนขวาหรือซ้าย
                </li>
                <li style={{ marginBottom: '6px' }}>
                  เลือกหัวข้อ <strong>"ใช้โดยไม่มีอินเทอร์เน็ต" (Keep Connection / Use Without Internet)</strong>
                </li>
                <li style={{ marginBottom: '6px' }}>
                  เปิดแอป <strong>Safari</strong> (บน iOS) หรือ <strong>Chrome</strong> (บน Android)
                </li>
                <li>
                  พิมพ์ค้นหาเว็บ <strong>neverssl.com</strong> หรือไอพี <strong>1.1.1.1</strong> เพื่อกลับมาหน้าล็อกอินนี้ แล้วจะสามารถเปิดแอป <strong>ThaID</strong> ได้ตามปกติ
                </li>
              </ol>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => setShowCnaWarning(false)}
                style={{
                  padding: '12px 20px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}
              >
                เข้าใจแล้ว (ปิดหน้าต่างนี้)
              </button>
              
              <button
                onClick={() => {
                  setShowCnaWarning(false)
                  proceedToLogin()
                }}
                style={{
                  padding: '12px 20px',
                  background: 'transparent',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                ดำเนินการล็อกอินต่ออย่างไรก็ดี
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
