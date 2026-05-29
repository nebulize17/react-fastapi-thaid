import React from 'react'

export default function Logout() {
  const handleLoginAgain = () => {
    // พากลับไปหน้าจอล็อกอินหลัก
    window.location.href = '/'
  }

  return (
    <div className="portal-root">
      <div className="portal-card success-card" style={{ borderTopColor: 'var(--danger)' }}>
        {/* Header */}
        <div className="portal-header" style={{ background: 'linear-gradient(135deg, #fafbfd 0%, #fef2f2 100%)' }}>
          <img src="/dtam.png" alt="DTAM" className="header-logo" />
          <div className="header-text">
            <h1 className="header-title">ระบบบริการอินเทอร์เน็ต</h1>
            <p className="header-sub" style={{ color: 'var(--danger)' }}>Disconnected / ออกจากระบบแล้ว</p>
          </div>
        </div>

        <div style={{ padding: '40px 28px 28px', textAlign: 'center' }}>
          {/* Disconnected Icon */}
          <div className="success-icon-wrap" style={{ margin: '0 auto 24px' }}>
            <div className="success-icon" style={{ background: 'var(--danger-bg)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '40px', height: '40px' }}>
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
            </div>
            <div className="success-ripple" style={{ borderColor: 'var(--danger)' }} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--danger)', marginBottom: '8px' }}>
            ออกจากระบบสำเร็จ!
          </h2>
          <p style={{ fontSize: '14.5px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '28px' }}>
            คุณได้ทำการสิ้นสุดการใช้งานและตัดการเชื่อมต่ออินเทอร์เน็ตเรียบร้อยแล้ว<br />
            ขอบคุณที่ใช้บริการเครือข่าย DTAM Telemedicine
          </p>

          {/* Log In Again Button */}
          <button 
            onClick={handleLoginAgain}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px 20px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontFamily: 'Sarabun, sans-serif',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(15, 58, 108, 0.25)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary-light)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>กลับสู่หน้าล็อกอิน (Log In Again)</span>
          </button>
        </div>

        {/* Footer */}
        <div className="card-footer">
          &copy; {new Date().getFullYear()} กรมการแพทย์แผนไทยและการแพทย์ทางเลือก
        </div>
      </div>
    </div>
  )
}
