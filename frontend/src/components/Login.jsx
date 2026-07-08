import React, { useState, useEffect } from 'react'

// ============================================================
// Device & Browser Detection Utilities
// ============================================================

/**
 * ตรวจสอบว่าเป็น mobile device หรือไม่
 */
function isMobileDevice() {
  const ua = navigator.userAgent || ''
  return /android|iphone|ipad|ipod|blackberry|windows phone|mobile/i.test(ua)
}

/**
 * ตรวจสอบว่าเป็น CNA (Captive Network Assistant) mini-browser หรือไม่
 * CNA บน iOS: CaptiveNetworkSupport, CaptiveNetworkSupport
 * CNA บน Android: wv (WebView), CaptivePortal
 * FortiGate captive portal ส่วนใหญ่ redirect มาที่ CNA mini-browser
 */
function isCNABrowser() {
  const ua = navigator.userAgent || ''
  // iOS CNA หรือ Safari WebView
  const isIOSWebView = /iPhone|iPad|iPod/i.test(ua) &&
    !/CriOS/i.test(ua) &&  // Chrome iOS
    !/FxiOS/i.test(ua) &&  // Firefox iOS
    (!/Safari/i.test(ua) || /CaptiveNetworkSupport/i.test(ua))

  // Android WebView หรือ CaptivePortal agent
  const isAndroidWebView = /Android/i.test(ua) && (
    /wv\)/i.test(ua) ||           // Android WebView flag
    /CaptivePortal/i.test(ua) ||
    !/Chrome/i.test(ua)           // ไม่ใช่ Chrome จริงๆ บน Android
  )

  return isIOSWebView || isAndroidWebView
}

/**
 * ตรวจสอบ OS
 */
function getDeviceOS() {
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

/**
 * สร้าง ThaiD Auth URL โดยตรง (ไม่ผ่าน backend redirect)
 * สำหรับ mobile browser ที่จะเปิดแอปได้โดยตรง
 */
function buildThaiDDirectUrl(params) {
  const clientId = 'cTFDQlVxVHFBWWVaT3hDckprZ3R4aDdvakk4c21mZ1o'
  const callbackEndpoint = 'https://api-gateway.dtam.moph.go.th/api/auth/callback'

  const statePayload = {
    mac: params.mac || '',
    ip: params.ip || '',
    originalUrl: params.url || '',
    magic: params.magic || '',
    fw_ip: params.fw_ip || ''
  }

  const state = encodeURIComponent(JSON.stringify(statePayload))
  const redirectUri = encodeURIComponent(callbackEndpoint)

  return `https://imauth.bora.dopa.go.th/api/v2/oauth2/auth/?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid%20pid&state=${state}`
}

// ============================================================
// Sub Components
// ============================================================

/** ปุ่มหลักสำหรับเข้าสู่ระบบด้วย ThaiD */
function ThaiDButton({ onClick, loading, label }) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '16px 20px',
        borderRadius: 'var(--radius-sm)',
        border: `2px solid ${hovered ? 'var(--primary)' : 'var(--border)'}`,
        background: hovered ? '#f0f5ff' : 'white',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.25s ease',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        width: '100%',
        opacity: loading ? 0.7 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
        <img
          src="/thaid.jpg"
          alt="ThaiD"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            objectFit: 'contain',
            border: '1px solid #f0f0f0',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: '17px', fontWeight: '700', color: 'var(--primary)', textAlign: 'left' }}>
          {loading ? 'กำลังดำเนินการ...' : label}
        </span>
      </div>
      {!loading && (
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          style={{ width: '20px', height: '20px', flexShrink: 0, color: 'var(--text-light)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
      {loading && (
        <div style={{
          width: '20px', height: '20px', border: '2px solid var(--border)',
          borderTopColor: 'var(--primary)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', flexShrink: 0,
        }} />
      )}
    </button>
  )
}

/** แสดง error message */
function ErrorBox({ error }) {
  if (!error) return null
  return (
    <div style={{
      marginBottom: '20px',
      padding: '14px 18px',
      background: '#fef2f2',
      borderLeft: '5px solid #ef4444',
      color: '#991b1b',
      fontSize: '14px',
      lineHeight: '1.5',
      textAlign: 'left',
      borderRadius: '8px',
    }}>
      {error === 'user_not_pre_created' ? (
        <>
          <strong>⚠️ ไม่พบการลงทะเบียนเกสท์ในระบบ:</strong><br />
          ไม่พบชื่อบัญชีของคุณในระบบฐานข้อมูลผู้เข้าใช้งานชั่วคราว
          กรุณาติดต่อเจ้าหน้าที่/ประชาสัมพันธ์เพื่อขอลงทะเบียนเปิดบัญชีก่อนทำการสแกนยืนยันตัวตนอีกครั้ง
        </>
      ) : (
        '❌ ระบบไม่สามารถตรวจสอบตัวตนได้ กรุณาลองใหม่อีกครั้ง'
      )}
    </div>
  )
}

/** หน้าสำหรับ CNA browser — ให้ user เปิดในเบราว์เซอร์หลักก่อน */
function CNABrowserWarning({ thaidUrl, deviceOS }) {
  const [copied, setCopied] = useState(false)

  const openInBrowser = () => {
    // วิธีที่ 1: เปิด URL ที่เป็น https:// ตรงๆ — บางครั้ง CNA จะเปิด default browser
    window.open(thaidUrl, '_blank')
    // วิธีที่ 2: fallback redirect
    setTimeout(() => { window.location.href = thaidUrl }, 500)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(thaidUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // fallback: เปิด prompt
      prompt('คัดลอก link นี้แล้วเปิดใน browser:', thaidUrl)
    }
  }

  return (
    <div style={{ padding: '24px 28px 0' }}>
      {/* Warning box */}
      <div style={{
        background: 'linear-gradient(135deg, #fff7ed, #fef3c7)',
        border: '1px solid #fcd34d',
        borderRadius: '12px',
        padding: '18px',
        marginBottom: '20px',
        textAlign: 'left',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontWeight: '700', color: '#92400e', fontSize: '14px', marginBottom: '6px' }}>
              กรุณาเปิดในเบราว์เซอร์หลัก
            </p>
            <p style={{ color: '#78350f', fontSize: '13px', lineHeight: '1.6' }}>
              หน้าต่างนี้เป็น <strong>mini-browser</strong> ของระบบ Wi-Fi
              ซึ่งไม่สามารถเปิดแอป <strong>ThaID</strong> ได้โดยตรง
              กรุณาเปิดในเบราว์เซอร์ {deviceOS === 'ios' ? 'Safari' : 'Chrome'} แทน
            </p>
          </div>
        </div>
      </div>

      {/* ปุ่มหลัก: เปิดใน browser */}
      <button
        onClick={openInBrowser}
        style={{
          width: '100%',
          padding: '16px 20px',
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          fontSize: '16px',
          fontWeight: '700',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '12px',
          boxShadow: '0 4px 14px rgba(15,58,108,0.3)',
          fontFamily: 'Sarabun, sans-serif',
          transition: 'all 0.2s',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ width: '20px', height: '20px', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
        </svg>
        เปิดใน{deviceOS === 'ios' ? ' Safari' : ' Chrome'}
      </button>

      {/* ปุ่มรอง: copy link */}
      <button
        onClick={copyLink}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: copied ? '#f0fdf4' : '#f8fafc',
          color: copied ? 'var(--success)' : 'var(--primary)',
          border: `1px solid ${copied ? '#bbf7d0' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontFamily: 'Sarabun, sans-serif',
          transition: 'all 0.25s',
        }}
      >
        {copied ? '✅ คัดลอกแล้ว!' : '📋 คัดลอก Link เพื่อเปิดใน Browser'}
      </button>

      {/* คำแนะนำ step-by-step */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: '#f0f5ff',
        borderRadius: '10px',
        border: '1px solid #c7d7fd',
      }}>
        <p style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '13px', marginBottom: '10px' }}>
          📱 วิธีเปิดแอป ThaID:
        </p>
        <ol style={{ paddingLeft: '18px', fontSize: '13px', color: '#374151', lineHeight: '1.8' }}>
          <li>กดปุ่ม <strong>"เปิดใน {deviceOS === 'ios' ? 'Safari' : 'Chrome'}"</strong> ด้านบน</li>
          <li>หรือ คัดลอก Link แล้วเปิด {deviceOS === 'ios' ? 'Safari' : 'Chrome'} วางใน address bar</li>
          <li>กดปุ่ม <strong>"เข้าสู่ระบบด้วย ThaID"</strong> ในเบราว์เซอร์ที่เปิด</li>
          <li>ระบบจะเปิดแอป <strong>ThaID</strong> ให้อัตโนมัติ</li>
        </ol>
      </div>
    </div>
  )
}

/** หน้าสำหรับ mobile full browser — redirect โดยตรง */
function MobileLoginView({ thaidUrl, loading, onLogin, error }) {
  return (
    <div style={{ padding: '32px 28px 0', textAlign: 'center' }}>
      <div style={{ marginBottom: '28px' }}>
        {/* Icon */}
        <div style={{
          width: '72px', height: '72px',
          background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 4px 14px rgba(15,58,108,0.12)',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8"
            style={{ width: '36px', height: '36px' }}>
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)', marginBottom: '10px' }}>
          ยินดีต้อนรับ
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.7' }}>
          กรุณายืนยันตัวตนผ่านแอปพลิเคชัน <strong>ThaID</strong><br />
          เพื่อรับสิทธิ์ในการใช้งานเครือข่ายอินเทอร์เน็ต
        </p>
      </div>

      <ErrorBox error={error} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ThaiDButton
          onClick={onLogin}
          loading={loading}
          label="เข้าสู่ระบบด้วย ThaID"
        />

        {/* Info box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          textAlign: 'left',
        }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>📲</span>
          <span style={{ fontSize: '13px', color: '#15803d', lineHeight: '1.5' }}>
            ระบบจะเปิดแอป <strong>ThaID</strong> บนมือถือของท่านอัตโนมัติ
          </span>
        </div>
      </div>
    </div>
  )
}

/** หน้าสำหรับ Desktop — redirect ไป QR flow */
function DesktopLoginView({ loading, onLogin, error }) {
  return (
    <div style={{ padding: '32px 28px 0', textAlign: 'center' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px' }}>
          ยินดีต้อนรับ
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          กรุณาเข้าสู่ระบบผ่านระบบยืนยันตัวตนกลาง ThaID เพื่อรับสิทธิ์ในการใช้งานเครือข่ายอินเทอร์เน็ต
        </p>
      </div>

      <ErrorBox error={error} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <ThaiDButton
          onClick={onLogin}
          loading={loading}
          label="เข้าสู่ระบบด้วย ThaiD"
        />
        <p style={{
          fontSize: '11px',
          color: 'var(--text-light)',
          marginTop: '8px',
          paddingTop: '16px',
          borderTop: '1px solid #f0f3f7',
          fontStyle: 'italic',
        }}>
          เฉพาะเจ้าหน้าที่และผู้ได้รับอนุญาตเท่านั้น
        </p>
      </div>
    </div>
  )
}

// ============================================================
// MAIN COMPONENT: Login
// ============================================================
export default function Login() {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')

  const [loading, setLoading] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isCNA: false,
    os: 'other',
    thaidUrl: '',
    ready: false,
  })

  // Build captive params จาก URL query string
  const captiveParams = {
    mac: params.get('mac') || params.get('client_mac') || '',
    ip: params.get('ip') || params.get('client_ip') || '',
    url: params.get('url') || params.get('redirect_url') || '',
    magic: params.get('magic') || '',
    fw_ip: params.get('fw_ip') || '',
    type: params.get('type') || '',
  }

  useEffect(() => {
    const mobile = isMobileDevice()
    const cna = isCNABrowser()
    const os = getDeviceOS()

    // สร้าง ThaiD URL สำหรับ mobile โดยตรง (ไม่ผ่าน backend session)
    const directUrl = buildThaiDDirectUrl(captiveParams)

    setDeviceInfo({
      isMobile: mobile,
      isCNA: cna,
      os,
      thaidUrl: directUrl,
      ready: true,
    })
  }, [])

  // Handler: Desktop → ผ่าน backend login route (QR + session flow)
  const handleDesktopLogin = () => {
    setLoading(true)
    window.location.href = '/api/auth/login' + window.location.search
  }

  // Handler: Mobile full browser → redirect ตรงไป ThaiD URL
  const handleMobileLogin = () => {
    setLoading(true)
    // Redirect ตรงไปยัง ThaiD OAuth URL — full browser สามารถเปิด ThaID app ได้
    window.location.href = deviceInfo.thaidUrl
  }

  if (!deviceInfo.ready) {
    return (
      <div className="portal-root">
        <div className="portal-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <div className="loading-spinner" />
        </div>
      </div>
    )
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
            <img src="/thaid.jpg" alt="ThaiD Logo" className="header-logo"
              style={{ borderRadius: '50%', height: '48px', width: '48px' }} />
          </div>
        </div>

        {/* WiFi indicator */}
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

          {/* Device indicator badge */}
          <span style={{
            marginLeft: 'auto',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '20px',
            background: deviceInfo.isMobile
              ? (deviceInfo.isCNA ? '#fef3c7' : '#dcfce7')
              : '#dbeafe',
            color: deviceInfo.isMobile
              ? (deviceInfo.isCNA ? '#92400e' : '#15803d')
              : 'var(--primary)',
            fontWeight: '600',
          }}>
            {deviceInfo.isMobile
              ? (deviceInfo.isCNA ? '📱 Mini Browser' : `📱 ${deviceInfo.os === 'ios' ? 'iOS' : 'Android'}`)
              : '💻 Desktop'
            }
          </span>
        </div>

        {/* ── Content area based on device type ── */}

        {/* CNA Browser: แสดงคำแนะนำให้เปิดใน browser หลัก */}
        {deviceInfo.isMobile && deviceInfo.isCNA && (
          <CNABrowserWarning
            thaidUrl={deviceInfo.thaidUrl}
            deviceOS={deviceInfo.os}
          />
        )}

        {/* Mobile Full Browser: เข้าสู่ระบบได้เลย */}
        {deviceInfo.isMobile && !deviceInfo.isCNA && (
          <MobileLoginView
            thaidUrl={deviceInfo.thaidUrl}
            loading={loading}
            onLogin={handleMobileLogin}
            error={error}
          />
        )}

        {/* Desktop: ไปยัง QR flow */}
        {!deviceInfo.isMobile && (
          <DesktopLoginView
            loading={loading}
            onLogin={handleDesktopLogin}
            error={error}
          />
        )}

        {/* Footer */}
        <div className="card-footer">
          &copy; {new Date().getFullYear()} กรมการแพทย์แผนไทยและการแพทย์ทางเลือก
        </div>
      </div>
    </div>
  )
}
