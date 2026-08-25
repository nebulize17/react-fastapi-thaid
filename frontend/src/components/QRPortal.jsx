import React, { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'

// ============================================================
// QR Code Generator — ใช้ qrcode npm package (ไม่ต้องพึ่ง CDN)
// ============================================================
function useQRCode(canvasRef, url) {
  useEffect(() => {
    if (!canvasRef.current || !url) return

    QRCode.toCanvas(canvasRef.current, url, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0F3A6C',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    }).catch(err => {
      console.error('QR Code generation error:', err)
    })
  }, [url, canvasRef])
}

// ============================================================
// Status Icons
// ============================================================
function IconWifi() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

function IconSmartphone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconActivity() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function IconLogOut() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ============================================================
// Countdown Ring Component
// ============================================================
function CountdownRing({ total, remaining }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = remaining / total
  const dashoffset = circumference * (1 - progress)

  const color = remaining > 60 ? '#22c55e' : remaining > 30 ? '#f59e0b' : '#ef4444'

  return (
    <div className="countdown-ring-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
        />
        <text x="60" y="55" textAnchor="middle" fontSize="20" fontWeight="700" fill={color} dominantBaseline="middle" fontFamily="'Sarabun', sans-serif">
          {remaining}
        </text>
        <text x="60" y="74" textAnchor="middle" fontSize="11" fill="#9ca3af" fontFamily="'Sarabun', sans-serif">
          วินาที
        </text>
      </svg>
    </div>
  )
}

// ============================================================
// FortiGate Auto-Submit Form (After Auth Success)
// ============================================================
function FortigateAutoSubmitForm({ magic, fwIp, fwPort, fwPath, authUrl, username, password, onSubmitted }) {
  const formRef = useRef(null)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (magic && formRef.current) {
        // ยิง Auto-Submit ไปที่ FortiGate พร้อม User/Pass
        formRef.current.submit();
        if (onSubmitted) {
          // หน่วงเวลาเล็กน้อยเพื่อให้ฟอร์ม submit สำเร็จก่อนเปลี่ยนหน้า
          setTimeout(onSubmitted, 1000);
        }
      } else {
        // ถ้าไม่มีค่า magic (เปิดเว็บมาทดสอบตรงๆ) ให้เด้งไป Google เลย
        window.location.href = 'https://www.google.com';
      }
    }, 1500) // รอ 1.5 วินาทีให้ user เห็นหน้า Success ก่อน
    return () => clearTimeout(timer);
  }, [magic, onSubmitted])

  if (!magic) return null

  // บังคับยิงไปที่ IP และพอร์ตของวงนี้โดยตรง เพื่อป้องกันค่าเก่าที่ค้างมาจาก FortiGate
  const targetIp = fwIp || '192.168.64.253';
  const postTarget = `https://${targetIp}:1442/fgtauth`;

  return (
    <>
      <iframe name="auth_iframe" id="auth_iframe" style={{ display: 'none' }} />
      <form
        ref={formRef}
        method="POST"
        action={postTarget}
        target="auth_iframe"
        style={{ display: 'none' }}
      >
        <input type="hidden" name="magic" value={magic} />
        <input type="hidden" name="username" value={username || "thanphichetwi"} />
        <input type="hidden" name="password" value={password || "Benz1711"} />
      </form>
    </>
  )
}

// ============================================================
// MAIN COMPONENT: QRPortal
// ============================================================
export default function QRPortal({ keepaliveOnly }) {
  const [phase, setPhase] = useState(keepaliveOnly ? 'keepalive' : 'init')
  // phases: init | loading | ready | scanning | success | keepalive | expired | error

  const [sessionId, setSessionId] = useState(null)
  const [thaidUrl, setThaidUrl] = useState('')
  const [expiresIn, setExpiresIn] = useState(300)
  const [countdown, setCountdown] = useState(300)
  const [captiveParams, setCaptiveParams] = useState({})
  const [successData, setSuccessData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [pollCount, setPollCount] = useState(0)
  const [sessionTimeLeft, setSessionTimeLeft] = useState(28800) // 8 Hours = 28800 Seconds

  const canvasRef = useRef(null)
  const pollTimerRef = useRef(null)
  const countdownTimerRef = useRef(null)

  useQRCode(canvasRef, phase === 'ready' || phase === 'scanning' ? thaidUrl : '')

  // ----------------------------------------------------------------
  // โหลดค่าตอนเปิดหน้า Keepalive ตรงๆ
  // ----------------------------------------------------------------
  useEffect(() => {
    if (keepaliveOnly) {
      const storedParams = localStorage.getItem('captive_params')
      const storedSuccess = localStorage.getItem('thaid_success_data')
      if (storedParams) {
        setCaptiveParams(JSON.parse(storedParams))
      }
      if (storedSuccess) {
        setSuccessData(JSON.parse(storedSuccess))
      }
    }
  }, [keepaliveOnly])

  const handleManualAuthFallback = () => {
    const magic = captiveParams.magic || ''
    const username = successData?.username || ''
    const password = successData?.password || ''
    const targetIp = captiveParams.fw_ip || '192.168.64.253'
    const postTarget = `https://${targetIp}:1442/fgtauth`

    if (magic) {
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = postTarget
      form.style.display = 'none'

      const magicInput = document.createElement('input')
      magicInput.type = 'hidden'
      magicInput.name = 'magic'
      magicInput.value = magic
      form.appendChild(magicInput)

      const userInput = document.createElement('input')
      userInput.type = 'hidden'
      userInput.name = 'username'
      userInput.value = username
      form.appendChild(userInput)

      const passInput = document.createElement('input')
      passInput.type = 'hidden'
      passInput.name = 'password'
      passInput.value = password
      form.appendChild(passInput)

      document.body.appendChild(form)
      form.submit()
    } else {
      alert('ไม่พบข้อมูลเซสชันล็อกอิน กรุณาลองล็อกอินใหม่อีกครั้ง')
    }
  }

  // ----------------------------------------------------------------
  // Ticking Keepalive Session Timer (8 Hours)
  // ----------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'keepalive') return

    const timer = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [phase])

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':')
  }

  // ----------------------------------------------------------------
  // อ่าน Captive Portal Query Params ที่ FortiGate ส่งมา
  // ----------------------------------------------------------------
  useEffect(() => {
    if (keepaliveOnly) return

    const params = new URLSearchParams(window.location.search)
    const newParams = {
      mac: params.get('mac') || params.get('client_mac') || '',
      ip: params.get('ip') || params.get('client_ip') || '',
      url: params.get('url') || params.get('redirect_url') || '',
      magic: params.get('magic') || '',
      fw_ip: params.get('fw_ip') || '192.168.254.253',
      type: params.get('type') || '',
    }
    setCaptiveParams(newParams)

    // บันทึกลง localStorage ทันทีที่มีค่าเพื่อรอใช้ที่หน้า Keepalive
    if (newParams.magic) {
      localStorage.setItem('captive_params', JSON.stringify(newParams))
    }

    // เช็ค error จาก URL
    const error = params.get('error')
    if (error) {
      setErrorMsg('เกิดข้อผิดพลาดในการยืนยันตัวตน กรุณาลองใหม่')
      setPhase('error')
    }
  }, [keepaliveOnly])

  // ----------------------------------------------------------------
  // สร้าง QR Session
  // ----------------------------------------------------------------
  const createQrSession = useCallback(async () => {
    setPhase('loading')
    setErrorMsg('')
    setPollCount(0)

    try {
      const params = new URLSearchParams(window.location.search)
      const queryStr = params.toString()
      const res = await fetch(`/api/auth/qr-session?${queryStr}`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)

      const data = await res.json()
      setSessionId(data.session_id)
      setThaidUrl(data.thaid_url)
      setExpiresIn(data.expires_in || 300)
      setCountdown(data.expires_in || 300)
      setPhase('ready')
    } catch (err) {
      console.error(err)
      setErrorMsg('ไม่สามารถสร้าง QR Code ได้ กรุณาลองใหม่')
      setPhase('error')
    }
  }, [])

  // เรียกสร้าง QR Session เมื่อ captiveParams พร้อม
  useEffect(() => {
    if (keepaliveOnly) return
    if (Object.keys(captiveParams).length > 0 && phase === 'init') {
      createQrSession()
    }
  }, [captiveParams, phase, createQrSession, keepaliveOnly])

  // ----------------------------------------------------------------
  // Countdown Timer
  // ----------------------------------------------------------------
  useEffect(() => {
    if (keepaliveOnly) return
    if (phase !== 'ready' && phase !== 'scanning') return

    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current)
          setPhase('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownTimerRef.current)
  }, [phase, keepaliveOnly])

  // ----------------------------------------------------------------
  // Polling: เช็คสถานะ QR Session
  // ----------------------------------------------------------------
  useEffect(() => {
    if (keepaliveOnly) return
    if ((phase !== 'ready' && phase !== 'scanning') || !sessionId) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/auth/qr-status/${sessionId}`)
        if (res.status === 404) {
          setPhase('expired')
          return
        }
        const data = await res.json()
        setPollCount(c => c + 1)

        if (data.status === 'success') {
          clearInterval(pollTimerRef.current)
          clearInterval(countdownTimerRef.current)
          setSuccessData(data)
          localStorage.setItem('thaid_success_data', JSON.stringify(data))
          setPhase('success')
        } else if (data.status === 'expired') {
          clearInterval(pollTimerRef.current)
          setPhase('expired')
        } else if (data.status === 'error') {
          clearInterval(pollTimerRef.current)
          setErrorMsg('การยืนยันตัวตนล้มเหลว กรุณาลองใหม่')
          setPhase('error')
        } else if (data.status === 'pending' && phase === 'ready' && pollCount > 2) {
          // ยังไม่มีการสแกน แต่แสดงว่ากำลังรอ
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }

    poll() // เรียกทันที
    pollTimerRef.current = setInterval(poll, 3000) // ทุก 3 วินาที

    return () => clearInterval(pollTimerRef.current)
  }, [phase, sessionId, keepaliveOnly])

  // ----------------------------------------------------------------
  // ปุ่ม Refresh QR
  // ----------------------------------------------------------------
  const handleRefresh = () => {
    clearInterval(pollTimerRef.current)
    clearInterval(countdownTimerRef.current)
    setPhase('init')
    setSessionId(null)
    setThaidUrl('')
    setSuccessData(null)
    // Trigger createQrSession ผ่าน useEffect
    setTimeout(() => setPhase('init'), 50)
    setTimeout(() => createQrSession(), 100)
  }

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="portal-root">

      {/* ── SUCCESS STATE ───────────────────────────────── */}
      {phase === 'success' && successData && (
        <>
          <FortigateAutoSubmitForm
            magic={captiveParams.magic}
            fwIp={successData.fw_ip || captiveParams.fw_ip}
            fwPort={successData.fw_port}
            fwPath={successData.fw_path}
            authUrl={successData.auth_url}
            username={successData.username}
            password={successData.password}
            onSubmitted={() => setPhase('keepalive')}
          />
          <div className="portal-card success-card">
            <div className="success-icon-wrap">
              <div className="success-icon">
                <IconCheck />
              </div>
              <div className="success-ripple" />
            </div>
            <h2 className="success-title">ยืนยันตัวตนสำเร็จ!</h2>
            <p className="success-sub">ระบบกำลังเชื่อมต่ออินเทอร์เน็ต กรุณารอสักครู่...</p>
            {successData.user_info && (
              <div className="user-badge">
                <span className="user-name">
                  {successData.user_info.name || successData.user_info.given_name_en}
                </span>
                {successData.username && (
                  <span className="user-username" style={{ display: 'block', fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                    Username: <strong>{successData.username}</strong>
                  </span>
                )}
                <span className="user-pid">
                  🪪 {successData.user_info.pid ? 'X'.repeat(10) + successData.user_info.pid.slice(-3) : '-'}
                </span>
              </div>
            )}
            <div className="connecting-indicator">
              <div className="dot-pulse">
                <span /><span /><span />
              </div>
              <span>กำลังนำคุณเข้าสู่เว็บไซต์...</span>
            </div>
          </div>
        </>
      )}

      {/* ── KEEPALIVE / LOGOUT SHOW SESSION STATE ─────────── */}
      {phase === 'keepalive' && (
        <div className="portal-card keepalive-card">
          <div className="portal-header keepalive-header">
            <img src="/dtam.png" alt="DTAM" className="header-logo" />
            <div className="header-text">
              <h1 className="header-title">ระบบลงทะเบียนเข้าใช้งานอินเทอร์เน็ต</h1>
              <p className="header-sub">DTAM Internet Session Dashboard</p>
            </div>
          </div>

          <div className="keepalive-body">
            {/* Status Banner */}
            <div className="status-banner">
              <div className="pulse-indicator">
                <span className="pulse-dot" />
                <span className="pulse-ring" />
              </div>
              <div className="status-text-wrap">
                <span className="status-title-text">Online / เชื่อมต่ออยู่</span>
                <span className="status-desc-text">อินเทอร์เน็ตพร้อมใช้งานเรียบร้อยแล้ว</span>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="session-countdown-box">
              <span className="clock-icon-wrap"><IconClock /></span>
              <div className="time-display-wrap">
                <span className="time-number">{formatTime(sessionTimeLeft)}</span>
                <span className="time-label">เวลาที่สามารถใช้งานคงเหลือ (ชั่วโมง:นาที:วินาที)</span>
              </div>
            </div>

            {/* User Profile */}
            <div className="info-section">
              <h3 className="section-title">
                <IconUser />
                <span>ข้อมูลผู้เข้าใช้งาน (ThaiD Session)</span>
              </h3>
              <div className="info-grid">
                <div className="info-row">
                  <span className="info-label">ชื่อ-นามสกุล:</span>
                  <span className="info-value">
                    {successData?.user_info?.name || successData?.user_info?.given_name_en || '-'}
                  </span>
                </div>
                {successData?.username && (
                  <div className="info-row">
                    <span className="info-label">Username:</span>
                    <span className="info-value text-monospace">{successData.username}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">เลขบัตรประชาชน:</span>
                  <span className="info-value text-monospace">
                    {successData?.user_info?.pid ? 'X'.repeat(10) + successData.user_info.pid.slice(-3) : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Log Out Button */}
            <button
              className="logout-btn"
              onClick={() => {
                const magic = captiveParams.magic || '';
                window.location.href = `/logout?magic=${magic}`;
              }}
            >
              <IconLogOut />
              <span>ลงชื่อออกจากการใช้งาน (Log Out)</span>
            </button>

            <div className="keepalive-warning" style={{ marginTop: '16px' }}>
              ⚠️ *กรุณาเปิดหน้านี้ค้างไว้จนกว่าจะเลิกใช้งาน เพื่อคงสถานะเชื่อมต่ออินเทอร์เน็ต
            </div>
          </div>
        </div>
      )}

      {/* ── LOADING ─────────────────────────────────────── */}
      {phase === 'loading' && (
        <div className="portal-card">
          <div className="loading-spinner" />
          <p className="loading-text">กำลังสร้าง QR Code...</p>
        </div>
      )}

      {/* ── QR READY / SCANNING ─────────────────────────── */}
      {(phase === 'ready' || phase === 'scanning') && (
        <div className="portal-card">
          {/* Header */}
          <div className="portal-header">
            <img src="/dtam.png" alt="DTAM" className="header-logo" />
            <div className="header-text">
              <h1 className="header-title">ระบบตรวจสอบสิทธิ์เครือข่าย</h1>
              <p className="header-sub">DTAM Telemedicine Network Access</p>
            </div>
          </div>

          {/* WiFi indicator */}
          <div className="wifi-badge">
            <span className="wifi-icon"><IconWifi /></span>
            <span>Wi-Fi Authentication Required</span>
          </div>

          {/* Instruction */}
          <div className="qr-instruction">
            <div className="step-row">
              <span className="step-num">1</span>
              <span>เปิดแอปพลิเคชัน <strong>ThaID</strong> บนสมาร์ทโฟน</span>
            </div>
            <div className="step-row">
              <span className="step-num">2</span>
              <span>กด <strong>"สแกน QR Code"</strong> แล้วสแกน QR ด้านล่าง</span>
            </div>
            <div className="step-row">
              <span className="step-num">3</span>
              <span>ยืนยันตัวตนในแอป ThaID ให้เสร็จสิ้น</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="qr-wrap">
            <div className="qr-frame">
              <canvas ref={canvasRef} width={240} height={240} className="qr-canvas" />
              <div className="qr-corner qr-tl" />
              <div className="qr-corner qr-tr" />
              <div className="qr-corner qr-bl" />
              <div className="qr-corner qr-br" />
            </div>
            <div className="qr-label">
              <span className="qr-label-icon"><IconSmartphone /></span>
              <span>สแกนด้วยแอป ThaID</span>
            </div>
          </div>

          {/* Countdown */}
          <div className="countdown-section">
            <CountdownRing total={expiresIn} remaining={countdown} />
            <p className="countdown-hint">QR Code หมดอายุใน</p>
          </div>

          {/* Polling indicator */}
          <div className="poll-indicator">
            <span className="poll-dot" />
            <span>กำลังรอการยืนยัน...</span>
          </div>

          {/* Footer */}
          <div className="card-footer">
            <p>การเข้าใช้งานระบบถือว่าท่านยอมรับ</p>
            <a href="#" onClick={e => e.preventDefault()}>ข้อตกลงและเงื่อนไขการใช้งาน</a>
          </div>
        </div>
      )}

      {/* ── EXPIRED ─────────────────────────────────────── */}
      {phase === 'expired' && (
        <div className="portal-card">
          <div className="portal-header">
            <img src="/dtam.png" alt="DTAM" className="header-logo" />
          </div>
          <div className="status-icon expired-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="state-title">QR Code หมดอายุแล้ว</h2>
          <p className="state-sub">กรุณาขอรับ QR Code ใหม่เพื่อยืนยันตัวตน</p>
          <button className="refresh-btn" onClick={handleRefresh}>
            <span className="refresh-icon"><IconRefresh /></span>
            รับ QR Code ใหม่
          </button>
        </div>
      )}

      {/* ── ERROR ───────────────────────────────────────── */}
      {phase === 'error' && (
        <div className="portal-card">
          <div className="portal-header">
            <img src="/dtam.png" alt="DTAM" className="header-logo" />
          </div>
          <div className="status-icon error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="state-title">เกิดข้อผิดพลาด</h2>
          <p className="state-sub">{errorMsg || 'กรุณาลองใหม่อีกครั้ง'}</p>
          <button className="refresh-btn" onClick={handleRefresh}>
            <span className="refresh-icon"><IconRefresh /></span>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}

      {/* ── INIT (fallback) ──────────────────────────────── */}
      {phase === 'init' && (
        <div className="portal-card">
          <div className="loading-spinner" />
          <p className="loading-text">กำลังเชื่อมต่อระบบ...</p>
        </div>
      )}
    </div>
  )
}
