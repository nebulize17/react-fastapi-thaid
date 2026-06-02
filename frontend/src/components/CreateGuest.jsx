import React, { useState, useEffect } from 'react'

// ============================================================
// Icons
// ============================================================
function IconUserPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '28px', height: '28px', color: '#0F3A6C' }}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}

function IconCheckCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '48px', height: '48px', color: '#22c55e', margin: '0 auto 12px' }}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function IconPrinter() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

function IconArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

export default function CreateGuest() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [visitorName, setVisitorName] = useState('')
  const [expireAfter, setExpireAfter] = useState(480) // 8 Hours = 480 minutes default
  const [notes, setNotes] = useState('สร้างโดยเจ้าหน้าที่ / ประชาสัมพันธ์')
  
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [ticketData, setTicketData] = useState(null) // Stores credential ticket for printing/copying
  const [showPassword, setShowPassword] = useState(false)

  // Auto generate a randomized guest username & passcode on page load
  useEffect(() => {
    generateRandomCreds()
  }, [])

  const generateRandomCreds = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    
    // Generate username (e.g. g-xxxxx)
    let randUser = 'g-'
    for (let i = 0; i < 5; i++) {
      randUser += letters.charAt(Math.floor(Math.random() * letters.length))
    }
    
    // Generate simple numerical passcode for easy keyboard input
    let randPass = ''
    for (let i = 0; i < 6; i++) {
      randPass += numbers.charAt(Math.floor(Math.random() * numbers.length))
    }
    
    setUsername(randUser)
    setPassword(randPass)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim() || !visitorName.trim()) {
      setErrorMsg('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน')
      return
    }

    setIsLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    setTicketData(null)

    try {
      const res = await fetch('/api/users/create-guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password: password,
          visitor_name: visitorName.trim(),
          expire_after: parseInt(expireAfter),
          notes: notes.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'เกิดข้อผิดพลาดในการสร้างบัญชี')
      }

      setSuccessMsg('สร้างบัญชีผู้ใช้งานชั่วคราวสำเร็จ!')
      setTicketData({
        username: username.trim().toLowerCase(),
        password: password,
        visitorName: visitorName.trim(),
        expireAfter: expireAfter,
        createdDate: new Date().toLocaleString('th-TH')
      })
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ชั่วคราว')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    if (!ticketData) return
    const textToCopy = `=== คูปองอินเทอร์เน็ต (DTAM Internet Guest) ===\nชื่อผู้ใช้งาน (Username): ${ticketData.username}\nรหัสผ่าน (Password): ${ticketData.password}\nชื่อผู้ใช้บริการ: ${ticketData.visitorName}\nเวลาหมดอายุ: ${getExpireLabel(ticketData.expireAfter)}\nวันที่สร้าง: ${ticketData.createdDate}\n=====================================`
    navigator.clipboard.writeText(textToCopy)
      .then(() => alert('คัดลอกข้อมูลรหัสผ่านไปยัง Clipboard สำเร็จ!'))
      .catch(err => console.error('Could not copy text: ', err))
  }

  const handlePrint = () => {
    // Open a print window specifically formatted for tickets
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    const expireLabel = getExpireLabel(ticketData.expireAfter)
    
    printWindow.document.write(`
      <html>
        <head>
          <title>DTAM Guest Ticket - ${ticketData.username}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
            body {
              font-family: 'Sarabun', sans-serif;
              padding: 20px;
              text-align: center;
              color: #333;
              max-width: 300px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 2px dashed #ccc;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .title {
              font-size: 16px;
              font-weight: bold;
              color: #0F3A6C;
              margin: 5px 0;
            }
            .subtitle {
              font-size: 11px;
              color: #666;
            }
            .credential-box {
              background: #f4f4f4;
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 15px;
              margin: 15px 0;
            }
            .cred-row {
              margin: 8px 0;
              font-size: 14px;
            }
            .cred-val {
              font-size: 20px;
              font-weight: bold;
              color: #0F3A6C;
              font-family: monospace;
              letter-spacing: 1px;
            }
            .footer {
              border-top: 2px dashed #ccc;
              padding-top: 10px;
              margin-top: 15px;
              font-size: 11px;
              color: #666;
            }
            @media print {
              body { padding: 0; margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">DTAM GUEST WIFI</div>
            <div class="subtitle">คูปองเข้าใช้งานเครือข่ายอินเทอร์เน็ต</div>
          </div>
          <div class="cred-row" style="font-size: 12px;"><strong>ชื่อผู้ใช้บริการ:</strong> ${ticketData.visitorName}</div>
          
          <div class="credential-box">
            <div class="cred-row">
              <div>ชื่อผู้ใช้งาน (Username)</div>
              <div class="cred-val">${ticketData.username}</div>
            </div>
            <div class="cred-row" style="margin-top: 12px;">
              <div>รหัสผ่าน (Password)</div>
              <div class="cred-val">${ticketData.password}</div>
            </div>
          </div>

          <div style="font-size: 12px; margin: 10px 0; text-align: left;">
            <div>🕒 <strong>อายุการใช้งาน:</strong> ${expireLabel}</div>
            <div style="margin-top: 4px;">📅 <strong>วันที่สร้าง:</strong> ${ticketData.createdDate}</div>
          </div>

          <div class="footer">
            <p><strong>วิธีใช้งาน:</strong> เชื่อมต่อ WiFi จากนั้นกรอกรหัสผ่านนี้บนหน้าจอ Captive Portal</p>
            <p style="margin-top: 5px;">*กรุณาเก็บรักษารหัสผ่านของท่านไว้เป็นความลับ</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const getExpireLabel = (minutes) => {
    switch (parseInt(minutes)) {
      case 480: return '8 ชั่วโมง (8 Hours)'
      case 1440: return '1 วัน (24 Hours)'
      case 4320: return '3 วัน (3 Days)'
      case 10080: return '7 วัน (7 Days)'
      case 43200: return '30 วัน (30 Days)'
      default: return `${minutes} นาที`
    }
  }

  const resetForm = () => {
    setVisitorName('')
    setNotes('สร้างโดยเจ้าหน้าที่ / ประชาสัมพันธ์')
    setSuccessMsg('')
    setTicketData(null)
    setErrorMsg('')
    generateRandomCreds()
  }

  return (
    <div className="portal-root">
      <div className="portal-card" style={{ maxWidth: '480px' }}>
        
        {/* Header */}
        <div className="portal-header" style={{ marginBottom: '24px' }}>
          <img src="/dtam.png" alt="DTAM" className="header-logo" />
          <div className="header-text">
            <h1 className="header-title" style={{ fontSize: '20px' }}>ระบบจัดการผู้ใช้งานชั่วคราว</h1>
            <p className="header-sub">Aruba ClearPass Guest Creator</p>
          </div>
        </div>

        {/* ── SUCCESS TICKET MODAL/BOX ────────────────────── */}
        {ticketData ? (
          <div className="ticket-view-wrap" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <IconCheckCircle />
              <h2 style={{ color: '#16a34a', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>
                {successMsg}
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>ออกคูปองเรียบร้อยแล้ว รายละเอียดผู้ใช้งาน</p>
            </div>

            <div className="info-section" style={{ background: '#eff6ff', border: '1px dashed #bfdbfe', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #bfdbfe', paddingBottom: '14px', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '600' }}>ชื่อผู้เข้าใช้บริการ (Guest User)</span>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#0F3A6C', marginTop: '4px' }}>{ticketData.visitorName}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#4b5563' }}>Username:</span>
                  <strong style={{ fontSize: '18px', fontFamily: 'monospace', color: '#0F3A6C', letterSpacing: '0.5px' }}>{ticketData.username}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#4b5563' }}>Password:</span>
                  <strong style={{ fontSize: '18px', fontFamily: 'monospace', color: '#0F3A6C', letterSpacing: '0.5px' }}>{ticketData.password}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #dbeafe', paddingTop: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#4b5563' }}>อายุการใช้งาน:</span>
                  <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '600' }}>{getExpireLabel(ticketData.expireAfter)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                className="refresh-btn"
                onClick={handleCopy}
                style={{ flex: 1, margin: 0, background: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <IconCopy />
                <span>คัดลอกข้อมูล</span>
              </button>
              <button
                className="refresh-btn"
                onClick={handlePrint}
                style={{ flex: 1, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: 'none' }}
              >
                <IconPrinter />
                <span>พิมพ์ใบสลิป</span>
              </button>
            </div>

            <button
              onClick={resetForm}
              className="logout-btn"
              style={{ background: 'transparent', color: '#0F3A6C', border: '2px solid #0F3A6C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
            >
              <IconArrowLeft />
              <span>สร้างผู้ใช้งานถัดไป</span>
            </button>
          </div>
        ) : (
          /* ── GUEST CREATION FORM ────────────────────────── */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {errorMsg && (
              <div className="keepalive-warning" style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#991b1b', margin: 0 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Title / Action Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#eff6ff', padding: '12px 16px', borderRadius: '12px', borderLeft: '4px solid #0F3A6C' }}>
              <IconUserPlus />
              <div style={{ fontSize: '15px', color: '#0F3A6C', fontWeight: '600' }}>ระบุรายละเอียดบัญชีเกสท์ใหม่</div>
            </div>

            {/* Input Name */}
            <div className="input-group">
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' }}>
                ชื่อผู้เข้าใช้บริการ (Visitor Full Name) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น นาย สมศักดิ์ ใจดี (หรือชื่อบริษัท/หน่วยงาน)"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  fontSize: '15px',
                  outline: 'none',
                }}
                required
              />
            </div>

            {/* Username & Generate */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' }}>
                  Username <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #d1d5db',
                    fontSize: '15px',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div className="input-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' }}>
                  Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 14px',
                      borderRadius: '10px',
                      border: '1px solid #d1d5db',
                      fontSize: '15px',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      fontSize: '13px'
                    }}
                  >
                    {showPassword ? 'ซ่อน' : 'แสดง'}
                  </button>
                </div>
              </div>
            </div>

            {/* Random Button */}
            <button
              type="button"
              onClick={generateRandomCreds}
              style={{
                alignSelf: 'flex-end',
                background: 'none',
                border: 'none',
                color: '#0F3A6C',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '-8px'
              }}
            >
              🔄 สุ่มบัญชีและรหัสผ่านใหม่
            </button>

            {/* Expire Select */}
            <div className="input-group">
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' }}>
                ระยะเวลาเข้าใช้งานอินเทอร์เน็ต (Duration)
              </label>
              <select
                value={expireAfter}
                onChange={(e) => setExpireAfter(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  fontSize: '15px',
                  background: 'white',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value={480}>8 ชั่วโมง (8 Hours)</option>
                <option value={1440}>1 วัน (24 Hours)</option>
                <option value={4320}>3 วัน (3 Days)</option>
                <option value={10080}>7 วัน (7 Days)</option>
                <option value={43200}>30 วัน (30 Days)</option>
              </select>
            </div>

            {/* Notes */}
            <div className="input-group">
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' }}>
                หมายเหตุการเข้าพบ (Notes)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #0F3A6C 0%, #1a5a9a 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 20px rgba(15, 58, 108, 0.25)',
                transition: 'all 0.2s ease-in-out',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '3px', borderTopColor: '#ffffff' }} />
                  <span>กำลังลงทะเบียนกับ ClearPass...</span>
                </>
              ) : (
                <span>➕ สร้างคูปองผู้ใช้งาน Guest</span>
              )}
            </button>

            {/* Extra Help Hint */}
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <a href="/" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none', fontWeight: '500' }}>
                ⬅️ กลับไปยังหน้าหลัก Captive Portal
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
