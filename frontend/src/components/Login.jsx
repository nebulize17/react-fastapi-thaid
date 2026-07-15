import React from 'react'

export default function Login() {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')

  const handleLogin = () => {
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

    // ตรวจสอบว่าเป็น Android หรือไม่
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      // ใช้ Android Intent Scheme เพื่อเปิดแอป ThaiD (D.ID) โดยตรง
      // Package Name ที่ถูกต้องคือ th.go.dopa.bora.identity
      const intentUrl = `intent://imauth.bora.dopa.go.th/api/v2/oauth2/auth/?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(JSON.stringify(stateObj))}#Intent;scheme=https;package=th.go.dopa.bora.identity;end;`;
      window.location.href = intentUrl;
    } else {
      // 1. สำหรับ iOS/อื่นๆ ปลุกแอปด้วย thaid://
      try {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'thaid://';
        document.body.appendChild(iframe);
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 500);
      } catch (e) {
        console.warn('Failed to call deep link', e);
      }

      // 2. นำหน้าจอหลักเบราว์เซอร์ไปที่ DOPA
      setTimeout(() => {
        window.location.href = thaidAuthUrl;
      }, 100);
    }
  }

  return (
    <div className="portal-root">
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
            {/* ปุ่มหลัก: บังคับเปิดแอป ThaiD บนเครื่อง (Mobile/Tablet App-to-App) */}
            <button 
              onClick={handleLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                padding: '16px 24px',
                borderRadius: 'var(--radius-sm)',
                border: '2px solid var(--primary)',
                background: 'var(--primary)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: 'var(--shadow-md)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.filter = 'none';
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
                  border: '2px solid white'
                }} 
              />
              <span style={{ fontSize: '18px', fontWeight: '700' }}>
                เปิดแอปพลิเคชัน ThaiD เพื่อยืนยันตัวตน
              </span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth={2.5} 
                style={{ width: '20px', height: '20px', marginLeft: 'auto', color: 'white' }}
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
    </div>
  )
}
