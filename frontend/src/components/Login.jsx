import React, { useState, useEffect, useRef } from 'react'

// ============================================================
// Device Detection
// ============================================================
function isMobileDevice() {
  const ua = navigator.userAgent || ''
  return /android|iphone|ipad|ipod|blackberry|windows phone|mobile/i.test(ua)
}

function getDeviceOS() {
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

// ============================================================
// App Store URLs
// ============================================================
const STORE_URLS = {
  android: 'https://play.google.com/store/apps/details?id=th.go.dopa.bora.dims.ddopa&hl=th',
  ios: 'https://apps.apple.com/th/app/thaid/id1533612248',
}

/**
 * พยายามเปิดแอป ThaiD ผ่าน deep link
 * ถ้าแอปไม่ถูกติดตั้ง (หน้าไม่ถูก blur/hidden ภายใน timeout)
 * จะ redirect ไปยัง App Store / Play Store อัตโนมัติ
 */
function openThaiDWithStoreFallback(thaidUrl, os) {
  const storeUrl = STORE_URLS[os]
  if (!storeUrl) {
    // Desktop / other — ไม่ต้องทำอะไร
    window.location.href = thaidUrl
    return
  }

  let appOpened = false

  // ถ้า browser/tab ถูก blur → แสดงว่าแอปเปิดขึ้นแล้ว
  const onVisibilityChange = () => {
    if (document.hidden || document.visibilityState === 'hidden') {
      appOpened = true
    }
  }
  const onBlur = () => { appOpened = true }

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('blur', onBlur)

  // เปิด deep link
  window.location.href = thaidUrl

  // รอ 2.5 วินาที — ถ้าแอปไม่เปิด (appOpened ยัง false) ให้ redirect ไป Store
  setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('blur', onBlur)

    if (!appOpened) {
      // แอปไม่ได้ถูกติดตั้ง → ไป Store
      window.location.href = storeUrl
    }
  }, 2500)
}

/**
 * สร้าง ThaiD Auth URL โดยตรง พร้อม state JSON เพื่อ pass captive params
 */
function buildThaiDUrl(captiveParams) {
  const clientId = 'cTFDQlVxVHFBWWVaT3hDckprZ3R4aDdvakk4c21mZ1o'
  const callbackEndpoint = 'https://api-gateway.dtam.moph.go.th/api/auth/callback'
  const state = JSON.stringify({
    mac: captiveParams.mac || '',
    ip: captiveParams.ip || '',
    originalUrl: captiveParams.url || '',
    magic: captiveParams.magic || '',
    fw_ip: captiveParams.fw_ip || '',
  })
  return (
    'https://imauth.bora.dopa.go.th/api/v2/oauth2/auth/' +
    '?response_type=code' +
    '&client_id=' + encodeURIComponent(clientId) +
    '&redirect_uri=' + encodeURIComponent(callbackEndpoint) +
    '&scope=openid%20pid' +
    '&state=' + encodeURIComponent(state)
  )
}

// ============================================================
// UI Components
// ============================================================
function CardHeader() {
  return (
    <div className="portal-header">
      <img src="/dtam.png" alt="DTAM" className="header-logo" />
      <div className="header-text">
        <h1 className="header-title">ระบบบริการการแพทย์ทางไกล</h1>
        <p className="header-sub">Telemedicine Service</p>
      </div>
      <img src="/thaid.jpg" alt="ThaiD" className="header-logo"
        style={{ borderRadius: '50%', height: '46px', width: '46px', flexShrink: 0 }} />
    </div>
  )
}

function WifiBadge() {
  return (
    <div className="wifi-badge">
      <span className="wifi-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </span>
      <span>Wi-Fi Authentication Required</span>
    </div>
  )
}

function ErrorBox({ error }) {
  if (!error) return null
  return (
    <div style={{
      marginBottom: '20px', padding: '14px 18px',
      background: '#fef2f2', borderLeft: '5px solid #ef4444',
      color: '#991b1b', fontSize: '14px', lineHeight: '1.5',
      textAlign: 'left', borderRadius: '8px',
    }}>
      {error === 'user_not_pre_created' ? (
        <>
          <strong>⚠️ ไม่พบการลงทะเบียนเกสท์:</strong><br />
          กรุณาติดต่อเจ้าหน้าที่เพื่อขอลงทะเบียนเปิดบัญชีก่อนทำการสแกนยืนยันตัวตนอีกครั้ง
        </>
      ) : '❌ ระบบไม่สามารถตรวจสอบตัวตนได้ กรุณาลองใหม่อีกครั้ง'}
    </div>
  )
}

// ============================================================
// ThaiD Login Button — รองรับทุก platform
// iOS: ใช้ <a> tag แท้ๆ เพื่อให้ iOS WebKit handle Universal Link ได้จาก user tap
// Android/Desktop: ใช้ <button> + onClick ปกติ
// ============================================================
const btnBase = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: '14px', padding: '16px 20px', width: '100%',
  borderRadius: 'var(--radius-sm)',
  border: '2px solid var(--border)',
  background: 'white',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(15,58,108,0.08)',
  fontFamily: 'Sarabun, sans-serif',
  textDecoration: 'none',
  transition: 'all 0.25s ease',
  WebkitTapHighlightColor: 'transparent',
}

function ThaiDButtonContent({ loading }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
        <img src="/thaid.jpg" alt="ThaiD" style={{
          width: '36px', height: '36px', borderRadius: '8px',
          objectFit: 'contain', border: '1px solid #f0f0f0', flexShrink: 0,
        }} />
        <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', textAlign: 'left' }}>
          {loading ? 'กำลังดำเนินการ...' : 'เข้าสู่ระบบด้วย ThaiD'}
        </span>
      </div>
      {loading ? (
        <div style={{
          width: '20px', height: '20px', flexShrink: 0,
          border: '2px solid #d1d5db', borderTopColor: 'var(--primary)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          style={{ width: '20px', height: '20px', flexShrink: 0, color: 'var(--text-light)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </>
  )
}

/** iOS: <a href> แท้ๆ — ให้ iOS WebKit handle Universal Link/App redirect จาก user tap
 * onClickFallback: ถ้าผ่านไป 2.5s แล้วแอปยังไม่เปิด (ไม่มีแอป) → redirect ไป App Store
 */
function ThaiDLoginAnchor({ href, loading, onClickFallback }) {
  const handleClick = (e) => {
    // ปล่อยให้ iOS Universal Link ทำงานตามปกติ
    // พร้อมกันนั้นเริ่ม fallback timer ไปยัง App Store
    if (onClickFallback) {
      e.preventDefault()
      onClickFallback()
    }
  }
  return (
    <a
      id="thaid-login-btn"
      href={href}
      style={btnBase}
      onClick={handleClick}
    >
      <ThaiDButtonContent loading={loading} />
    </a>
  )
}

/** Desktop/Android: <button> + onClick */
function ThaiDLoginButton({ onClick, loading }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      id="thaid-login-btn"
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...btnBase,
        border: `2px solid ${hovered ? 'var(--primary)' : 'var(--border)'}`,
        background: hovered ? '#f0f5ff' : 'white',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        opacity: loading ? 0.7 : 1,
      }}
    >
      <ThaiDButtonContent loading={loading} />
    </button>
  )
}

// ============================================================
// MAIN COMPONENT: Login
// ============================================================
export default function Login() {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')

  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [deviceOS, setDeviceOS] = useState('other')
  const [ready, setReady] = useState(false)

  const captiveParams = {
    mac: params.get('mac') || params.get('client_mac') || '',
    ip: params.get('ip') || params.get('client_ip') || '',
    url: params.get('url') || params.get('redirect_url') || '',
    magic: params.get('magic') || '',
    fw_ip: params.get('fw_ip') || '',
    type: params.get('type') || '',
  }

  useEffect(() => {
    setIsMobile(isMobileDevice())
    setDeviceOS(getDeviceOS())
    setReady(true)
  }, [])

  /**
   * handleLogin — รองรับทุก device และ platform
   *
   * Desktop:
   *   → /api/auth/login (backend OAuth redirect → ThaiD web แสดง QR)
   *
   * Mobile (Android Chrome / Samsung Browser / Full browser):
   *   → redirect ไปยัง ThaiD URL โดยตรง
   *   → ThaiD web detect mobile → เปิดแอป ThaID อัตโนมัติ
   *
   * iOS (Safari / Chrome iOS / CNA mini-browser):
   *   → ใช้ <a> tag href แทน window.location เพื่อให้ iOS
   *     handle Universal Link ได้ถูกต้องกว่า JS redirect
   *   → ThaiD URL ที่ imauth.bora.dopa.go.th จะ trigger
   *     Universal Link เพื่อเปิดแอป ThaID
   */
  const thaidUrl = buildThaiDUrl(captiveParams)

  const handleLogin = () => {
    setLoading(true)
    if (!isMobile) {
      // Desktop → ผ่าน backend (ThaiD web แสดง QR code)
      window.location.href = '/api/auth/login' + window.location.search
      return
    }
    // Mobile (Android) → ลองเปิดแอป ThaiD ก่อน
    // ถ้าไม่มีแอป → redirect ไป Play Store อัตโนมัติ
    openThaiDWithStoreFallback(thaidUrl, deviceOS)
  }

  if (!ready) return (
    <div className="portal-root">
      <div className="portal-card" style={{
        minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="loading-spinner" />
      </div>
    </div>
  )

  return (
    <div className="portal-root">
      <div className="portal-card">
        <CardHeader />
        <WifiBadge />

        {/* ── Main Content ── */}
        <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>

          {/* Welcome Text */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '24px', fontWeight: '800',
              color: 'var(--primary)', marginBottom: '8px',
            }}>
              ยินดีต้อนรับ
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              กรุณาเข้าสู่ระบบผ่านระบบยืนยันตัวตนกลาง ThaID<br />
              เพื่อรับสิทธิ์ในการใช้งานเครือข่ายอินเทอร์เน็ต
            </p>
          </div>

          <ErrorBox error={error} />

          {/* Login Button — iOS ใช้ <a> tag แท้ๆ เพื่อให้ iOS WebKit เปิดแอปได้ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isMobile && deviceOS === 'ios' ? (
              <ThaiDLoginAnchor
                href={thaidUrl}
                loading={loading}
                onClickFallback={() => openThaiDWithStoreFallback(thaidUrl, 'ios')}
              />
            ) : (
              <ThaiDLoginButton onClick={handleLogin} loading={loading} />
            )}

            {/* Info hint */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 14px',
              background: isMobile
                ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                : 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              border: isMobile ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
              borderRadius: '8px', textAlign: 'left',
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>
                {isMobile ? '📲' : '🖥️'}
              </span>
              <span style={{
                fontSize: '13px',
                color: isMobile ? '#15803d' : 'var(--primary)',
                lineHeight: '1.5',
              }}>
                {isMobile
                  ? 'ระบบจะเปิดแอป ThaID บนมือถือของท่านอัตโนมัติ'
                  : 'ระบบจะแสดง QR Code สำหรับสแกนยืนยันตัวตนด้วยแอป ThaID'
                }
              </span>
            </div>

            {/* iOS hint: แนะนำให้ download แอปถ้าไม่มี หรือ allow ถ้ามีแต่ไม่เปิด */}
            {isMobile && deviceOS === 'ios' && (
              <div style={{
                padding: '12px 14px',
                background: '#fef9ec',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#92400e',
                textAlign: 'left',
                lineHeight: '1.6',
              }}>
                <strong>💡 iOS tip:</strong> หากยังไม่มีแอป ThaID ระบบจะพาท่านไปยัง <strong>App Store</strong> โดยอัตโนมัติเพื่อดาวน์โหลด<br />
                หากมีแอปแล้วแต่ไม่เปิด ให้กดปุ่ม <strong>"Allow"</strong> ในหน้าต่างที่ปรากฏขึ้น
              </div>
            )}
          </div>

          <p style={{
            fontSize: '11px', color: 'var(--text-light)', marginTop: '20px',
            paddingTop: '16px', borderTop: '1px solid #f0f3f7', fontStyle: 'italic',
          }}>
            เฉพาะเจ้าหน้าที่และผู้ได้รับอนุญาตเท่านั้น
          </p>
        </div>

        <div className="card-footer">
          &copy; {new Date().getFullYear()} กรมการแพทย์แผนไทยและการแพทย์ทางเลือก
        </div>
      </div>
    </div>
  )
}
