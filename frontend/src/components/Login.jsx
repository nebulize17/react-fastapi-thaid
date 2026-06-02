import React, { useState, useRef } from 'react'

export default function Login() {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')
  
  // Captive Portal parameters from FortiGate
  const mac = params.get('mac') || params.get('client_mac') || ''
  const ip = params.get('ip') || params.get('client_ip') || ''
  const originalUrl = params.get('url') || params.get('redirect_url') || ''
  const magic = params.get('magic') || ''
  const fwIp = params.get('fw_ip') || '192.168.150.1'

  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestUsername, setGuestUsername] = useState('')
  const [guestPassword, setGuestPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const formRef = useRef(null)

  const handleLogin = () => {
    // Redirect to ThaiD Login flow
    window.location.href = '/api/auth/login' + window.location.search
  }

  const handleGuestSubmit = (e) => {
    e.preventDefault()
    if (!guestUsername.trim() || !guestPassword.trim()) {
      setFormError('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่านคูปอง')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      // 1. บันทึกข้อมูล captive_params ลง localStorage เพื่อให้หน้า /keepalive แสดงผลได้
      const captiveData = {
        mac: mac,
        ip: ip,
        url: originalUrl,
        magic: magic,
        fw_ip: fwIp
      }
      localStorage.setItem('captive_params', JSON.stringify(captiveData))

      // 2. บันทึกข้อมูลจำลองความสำเร็จสำหรับเกสท์ลง localStorage
      const successData = {
        user_info: {
          title: 'Guest',
          name: 'ผู้ใช้งานอินเทอร์เน็ตชั่วคราว (Guest)',
          pid: 'GUEST-USER'
        },
        username: guestUsername.trim(),
        password: guestPassword,
        fw_ip: fwIp,
        fw_port: "1000",
        fw_path: "/fgtauth"
      }
      localStorage.setItem('thaid_success_data', JSON.stringify(successData))

      // 3. ทำการยิง Submit ไปหา FortiGate ผ่าน iframe ซ่อนในเบื้องหลัง
      if (magic && formRef.current) {
        formRef.current.submit()
        
        // หน่วงเวลา 1.5 วินาทีเพื่อให้ฟอร์มส่งเสร็จ แล้วนำทางไปหน้า /keepalive
        setTimeout(() => {
          window.location.href = '/keepalive'
        }, 1500)
      } else {
        // หากไม่มีค่า magic (เปิดเว็บทดสอบตรงๆ) ให้ข้ามไปหน้า /keepalive เลย
        window.location.href = '/keepalive'
      }
    } catch (err) {
      console.error(err)
      setFormError('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์')
      setIsSubmitting(false)
    }
  }

  const postTarget = `https://192.168.150.1:1442/fgtauth`

  return (
    <div className="portal-root">
      {/* Iframe ซ่อนสำหรับรับผลการซับมิตฟอร์ม FortiGate */}
      <iframe name="auth_iframe" id="auth_iframe" style={{ display: 'none' }} />

      {/* ฟอร์มส่งข้อมูลลับไป FortiGate */}
      {magic && (
        <form
          ref={formRef}
          method="POST"
          action={postTarget}
          target="auth_iframe"
          style={{ display: 'none' }}
        >
          <input type="hidden" name="magic" value={magic} />
          <input type="hidden" name="username" value={guestUsername} />
          <input type="hidden" name="password" value={guestPassword} />
        </form>
      )}

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

        {/* Main Content */}
        <div style={{ padding: '32px 28px 0', textAlign: 'center' }}>
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px' }}>
              ยินดีต้อนรับ
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              กรุณาเข้าสู่ระบบด้วยสิทธิ์ที่ได้รับ เพื่อเปิดสิทธิ์การเชื่อมต่อและเข้าใช้งานอินเทอร์เน็ต
            </p>
          </div>

          {(error || formError) && (
            <div style={{
              marginBottom: '24px',
              padding: '12px 16px',
              background: 'var(--danger-bg)',
              borderLeft: '4px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: '13px',
              textAlign: 'left',
              borderRadius: '6px'
            }}>
              ⚠️ {formError || 'ระบบไม่สามารถตรวจสอบตัวตนได้ กรุณาลองใหม่อีกครั้ง'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* BUTTON: ThaiD Login */}
            {!showGuestForm && (
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
            )}

            {/* COLLAPSIBLE GUEST FORM */}
            {showGuestForm ? (
              <form onSubmit={handleGuestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left', animation: 'fadeIn 0.3s' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F3A6C', marginBottom: '4px' }}>
                  เข้าใช้งานด้วยบัญชีเกสท์ (Guest Login)
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Username (ชื่อผู้ใช้งาน)</label>
                  <input
                    type="text"
                    value={guestUsername}
                    onChange={(e) => setGuestUsername(e.target.value)}
                    placeholder="ระบุชื่อผู้ใช้บนคูปอง (เช่น g-abcde)"
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Password (รหัสผ่าน)</label>
                  <input
                    type="password"
                    value={guestPassword}
                    onChange={(e) => setGuestPassword(e.target.value)}
                    placeholder="ระบุรหัสผ่านคูปอง 6 หลัก"
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => { setShowGuestForm(false); setFormError(''); }}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
                    disabled={isSubmitting}
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #0F3A6C 0%, #1a5a9a 100%)',
                      color: 'white',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#ffffff' }} />
                        <span>กำลังเชื่อมต่อ...</span>
                      </>
                    ) : (
                      <span>เชื่อมต่ออินเทอร์เน็ต</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* TOGGLE BUTTON to show Guest login */
              <button
                onClick={() => setShowGuestForm(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0F3A6C',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '8px',
                  textDecoration: 'underline'
                }}
              >
                เข้าใช้งานด้วยรหัสผ่านคูปอง (Coupon Login)
              </button>
            )}

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
