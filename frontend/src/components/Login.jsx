import React from 'react'

export default function Login() {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')

  const handleLogin = () => {
    // Using relative path to work on both local and Ubuntu
    window.location.href = '/api/auth/login' + window.location.search
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
              กรุณาเข้าสู่ระบบผ่านระบบยืนยันตัวตนกลาง ThaIDเพื่อรับสิทธิ์ในการใช้งานเครือข่ายอินเทอร์เน็ต
            </p>
          </div>

          {error && (
            <div style={{
              marginBottom: '24px',
              padding: '12px 16px',
              background: 'var(--danger-bg)',
              borderLeft: '4px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: '13px',
              textAlign: 'left',
              borderRadius: '4px'
            }}>
              ระบบไม่สามารถตรวจสอบตัวตนได้ กรุณาลองใหม่อีกครั้ง
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
                เข้าสู่ระบบด้วย ThaID
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
    </div>
  )
}
