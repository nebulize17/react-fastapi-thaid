import React, { useState, useEffect } from 'react'

// ============================================================
// Modern Icons
// ============================================================
function IconUserPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}

function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IconCheckCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '56px', height: '56px', color: '#22c55e', margin: '0 auto 16px' }}>
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
  const [activeTab, setActiveTab] = useState('create') // 'help', 'create', 'options'
  const [givenName, setGivenName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('DTAM Visitor')
  const [expireAfter, setExpireAfter] = useState(480) // 8 Hours = 480 minutes default
  const [notes, setNotes] = useState('สร้างโดยเจ้าหน้าที่ / ประชาสัมพันธ์')
  const [termsAccepted, setTermsAccepted] = useState(true)
  
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [ticketData, setTicketData] = useState(null)
  const [showPassword, setShowPassword] = useState(true)

  // Auto-generate username from givenName and familyName matching ThaiD format
  useEffect(() => {
    const cleanGiven = givenName.trim().toLowerCase().replace(/[^a-z]/g, '')
    const cleanFamily = familyName.trim().toLowerCase().replace(/[^a-z]/g, '')
    
    if (cleanGiven && cleanFamily) {
      // First Name + First 2 characters of Last Name (lowercase)
      const generated = cleanGiven + cleanFamily.slice(0, 2)
      setUsername(generated)
    } else {
      setUsername('')
    }
  }, [givenName, familyName])

  // Generate a random 6-digit numeric password on mount
  useEffect(() => {
    generateRandomPassword()
  }, [])

  const generateRandomPassword = () => {
    const numbers = '0123456789'
    let randPass = ''
    for (let i = 0; i < 6; i++) {
      randPass += numbers.charAt(Math.floor(Math.random() * numbers.length))
    }
    setPassword(randPass)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!termsAccepted) {
      setErrorMsg('กรุณายอมรับเงื่อนไขการสร้างบัญชีผู้ใช้งาน')
      return
    }
    if (!givenName.trim() || !familyName.trim() || !password.trim()) {
      setErrorMsg('กรุณากรอกข้อมูลชื่อ-นามสกุล และรหัสผ่าน')
      return
    }

    setIsLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    setTicketData(null)

    const visitorFullName = `${givenName.trim()} ${familyName.trim()}`

    try {
      const res = await fetch('/api/users/create-guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username, // generated username matching ThaiD pattern
          password: password,
          visitor_name: visitorFullName,
          expire_after: parseInt(expireAfter),
          notes: `${notes.trim()} | Company: ${companyName.trim()}`,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'เกิดข้อผิดพลาดในการสร้างบัญชี')
      }

      setSuccessMsg('ลงทะเบียนคูปองผู้ใช้งาน ClearPass สำเร็จ!')
      setTicketData({
        username: username,
        password: password,
        visitorName: visitorFullName,
        companyName: companyName,
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
    const textToCopy = `=== คูปองอินเทอร์เน็ต (DTAM Internet Guest) ===\nชื่อผู้ใช้งาน (Username): ${ticketData.username}\nรหัสผ่าน (Password): ${ticketData.password}\nชื่อผู้ใช้บริการ: ${ticketData.visitorName}\nหน่วยงาน: ${ticketData.companyName}\nเวลาหมดอายุ: ${getExpireLabel(ticketData.expireAfter)}\nวันที่สร้าง: ${ticketData.createdDate}\n=====================================`
    navigator.clipboard.writeText(textToCopy)
      .then(() => alert('คัดลอกข้อมูลรหัสผ่านไปยัง Clipboard สำเร็จ!'))
      .catch(err => console.error('Could not copy text: ', err))
  }

  const handlePrint = () => {
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
              font-size: 22px;
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
          <div class="cred-row" style="font-size: 12.5px;"><strong>ชื่อผู้ใช้บริการ:</strong> ${ticketData.visitorName}</div>
          <div class="cred-row" style="font-size: 12.5px;"><strong>หน่วยงาน/สังกัด:</strong> ${ticketData.companyName}</div>
          
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
    setGivenName('')
    setFamilyName('')
    setCompanyName('DTAM Visitor')
    setNotes('สร้างโดยเจ้าหน้าที่ / ประชาสัมพันธ์')
    setSuccessMsg('')
    setTicketData(null)
    setErrorMsg('')
    generateRandomPassword()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 10% 10%, rgba(15,58,108,0.12) 0%, transparent 60%), radial-gradient(ellipse at 90% 90%, rgba(200,169,81,0.06) 0%, transparent 60%), linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Sarabun', 'Inter', sans-serif"
    }}>
      
      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '36px',
        animation: 'slideDown 0.5s ease-out'
      }}>
        <img src="/dtam.png" alt="DTAM" style={{ height: '64px', width: 'auto', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))' }} />
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0F3A6C', margin: 0, tracking: '-0.02em' }}>
            Aruba ClearPass Guest Manager
          </h1>
          <p style={{ fontSize: '14px', color: '#475569', fontWeight: '500', marginTop: '2px' }}>
            ระบบจัดการเกสท์พอร์ทัลและการลงทะเบียนผู้ใช้งานชั่วคราว
          </p>
        </div>
      </div>

      {/* Main Container Layout */}
      <div style={{
        width: '100%',
        maxWidth: '1024px',
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: '28px',
        alignItems: 'start'
      }} className="admin-grid">
        
        {/* Left Side: Modern Form & Tabs */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 20px 40px -15px rgba(15,58,108,0.15)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          overflow: 'hidden',
          animation: 'slideUp 0.4s ease-out'
        }}>
          
          {/* Modern Tab Menu Header */}
          <div style={{
            display: 'flex',
            background: 'linear-gradient(180deg, #fafafa 0%, #f1f5f9 100%)',
            borderBottom: '1.5px solid #e2e8f0',
            padding: '4px 8px 0'
          }}>
            <button
              onClick={() => setActiveTab('help')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 20px',
                border: 'none',
                background: activeTab === 'help' ? '#ffffff' : 'transparent',
                color: activeTab === 'help' ? '#0F3A6C' : '#64748b',
                fontWeight: '700',
                fontSize: '14.5px',
                borderRadius: '12px 12px 0 0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderBottom: activeTab === 'help' ? '3px solid #0F3A6C' : '3px solid transparent',
                marginTop: '4px'
              }}
            >
              <IconHelp />
              <span>Quick Help</span>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 24px',
                border: 'none',
                background: activeTab === 'create' ? '#ffffff' : 'transparent',
                color: activeTab === 'create' ? '#0F3A6C' : '#64748b',
                fontWeight: '700',
                fontSize: '14.5px',
                borderRadius: '12px 12px 0 0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderBottom: activeTab === 'create' ? '3px solid #0F3A6C' : '3px solid transparent',
                marginTop: '4px'
              }}
            >
              <IconUserPlus />
              <span>Create Account</span>
            </button>

            <button
              onClick={() => setActiveTab('options')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 20px',
                border: 'none',
                background: activeTab === 'options' ? '#ffffff' : 'transparent',
                color: activeTab === 'options' ? '#0F3A6C' : '#64748b',
                fontWeight: '700',
                fontSize: '14.5px',
                borderRadius: '12px 12px 0 0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderBottom: activeTab === 'options' ? '3px solid #0F3A6C' : '3px solid transparent',
                marginTop: '4px'
              }}
            >
              <IconSettings />
              <span>More Options</span>
            </button>
          </div>

          {/* Form Content Area */}
          <div style={{ padding: '32px 36px' }}>
            
            {/* 🚨 Quick Help Tab Content */}
            {activeTab === 'help' && (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <h3 style={{ color: '#0F3A6C', fontSize: '18px', fontWeight: '800', marginBottom: '14px' }}>
                  คู่มือการใช้งานระบบสร้างเกสท์ชั่วคราว (Quick Help Guide)
                </h3>
                <p style={{ color: '#475569', fontSize: '14.5px', lineHeight: '1.7', marginBottom: '20px' }}>
                  ยินดีต้อนรับสู่ระบบบริหารจัดการผู้เข้าใช้บริการ (Guest) ด้วยความปลอดภัยระดับสูงของกรมฯ 
                  หน้านี้ช่วยให้เจ้าหน้าที่/แอดมินสามารถลงทะเบียนสร้างบัญชีเกสท์ล่วงหน้า เพื่อเตรียมความพร้อมในการเข้าสแกนสิทธิ์เข้าใช้งานเครือข่าย
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', gap: '14px', background: '#f8fafc', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #C8A951' }}>
                    <div style={{ fontWeight: '800', color: '#C8A951', fontSize: '16px' }}>1</div>
                    <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                      <strong>ระบุชื่อและนามสกุลเป็นภาษาอังกฤษ:</strong> ระบบจะใช้ตัวประมวลผลอัจฉริยะ 
                      ในการแปลงชื่อของเกสท์ให้มีโครงสร้างชื่อบัญชีของ ThaiD คือ <code>[given_name]+[family_name 2 หลักแรก]</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', background: '#f8fafc', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #0F3A6C' }}>
                    <div style={{ fontWeight: '800', color: '#0F3A6C', fontSize: '16px' }}>2</div>
                    <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                      <strong>นโยบายห้ามสร้างบัญชีออโต้:</strong> หากผู้ใช้สแกน ThaiD เข้าใช้งาน แต่ไม่มีชื่อที่สร้างล่วงหน้าในฐานข้อมูลของ ClearPass 
                      ระบบ Captive Portal จะบล็อกและไม่อนุญาตให้ออกอินเทอร์เน็ตเด็ดขาด
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', background: '#f8fafc', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                    <div style={{ fontWeight: '800', color: '#10b981', fontSize: '16px' }}>3</div>
                    <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                      <strong>จัดส่งคูปองความปลอดภัย:</strong> เมื่อลงทะเบียนสำเร็จ เจ้าหน้าที่สามารถกด <strong>พิมพ์ใบสลิปเกสท์</strong> 
                      หรือกด <strong>คัดลอกข้อมูล</strong> เพื่อส่งรหัสต่อให้เกสท์ได้อย่างสะดวกและรวดเร็ว
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 🚨 More Options Tab Content */}
            {activeTab === 'options' && (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <h3 style={{ color: '#0F3A6C', fontSize: '18px', fontWeight: '800', marginBottom: '14px' }}>
                  การตั้งค่าและการตรวจสอบสถานะระบบ
                </h3>
                <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                  เครื่องมือสำหรับตรวจเช็คการเชื่อมต่อและการกำหนดค่าตัวแปรของ ClearPass Policy Manager และ FortiGate Captive Portal
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>ClearPass API Endpoint</div>
                    <div style={{ fontSize: '14px', color: '#0F3A6C', fontWeight: '700', marginTop: '6px' }}>เชื่อมต่อเรียบร้อย (Online)</div>
                  </div>

                  <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Default Role Profile</div>
                    <div style={{ fontSize: '14px', color: '#0F3A6C', fontWeight: '700', marginTop: '6px' }}>[Guest] (ID 2)</div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1.5px dashed #cbd5e1' }}>
                  <h4 style={{ color: '#0F3A6C', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>ข้อสำคัญสำหรับแอดมินเครือข่าย:</h4>
                  <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.6' }}>
                    การสแกนสิทธิ์ผ่าน ThaiD บนมือถือ จะดึงสิทธิ์ผู้ใช้จาก ClearPass Guest Database 
                    ตามโครงสร้างชื่อผู้ใช้งานภาษาอังกฤษแบบ lowercase เสมอ เพื่อลดความซ้ำซ้อนและป้องกันความปลอดภัยในการใช้งานพอร์ทัล
                  </p>
                </div>
              </div>
            )}

            {/* 🚨 Create Account Tab Content */}
            {activeTab === 'create' && (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                {ticketData ? (
                  /* Success View inside tab */
                  <div style={{ textAlign: 'center' }}>
                    <IconCheckCircle />
                    <h2 style={{ color: '#22c55e', fontSize: '20px', fontWeight: '800', margin: '0 0 8px' }}>
                      {successMsg}
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '28px' }}>
                      บัญชีเกสท์ถูกบันทึกลงฐานข้อมูล ClearPass และผูกความปลอดภัยเรียบร้อยแล้ว
                    </p>

                    <div style={{ display: 'flex', gap: '14px', maxWidth: '380px', margin: '0 auto 24px' }}>
                      <button
                        className="refresh-btn"
                        onClick={handleCopy}
                        style={{ flex: 1, margin: 0, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: 'none' }}
                      >
                        <IconCopy />
                        <span>คัดลอกข้อมูล</span>
                      </button>
                      <button
                        className="refresh-btn"
                        onClick={handlePrint}
                        style={{ flex: 1, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#0F3A6C' }}
                      >
                        <IconPrinter />
                        <span>พิมพ์ใบสลิป</span>
                      </button>
                    </div>

                    <button
                      onClick={resetForm}
                      className="logout-btn"
                      style={{ background: 'transparent', color: '#0F3A6C', border: '2px solid #0F3A6C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', margin: '0 auto', borderRadius: '12px' }}
                    >
                      <IconArrowLeft />
                      <span>ลงทะเบียนผู้ใช้งานถัดไป</span>
                    </button>
                  </div>
                ) : (
                  /* Form Input View */
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    
                    {errorMsg && (
                      <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#991b1b', padding: '14px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '500' }}>
                        ⚠️ {errorMsg}
                      </div>
                    )}

                    {/* Section Header */}
                    <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '4px' }}>
                      <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700' }}>รายละเอียดผู้เข้าใช้บริการ (Guest Details)</h4>
                      <p style={{ color: '#64748b', fontSize: '12.5px', marginTop: '2px' }}>กรุณากรอกข้อมูลส่วนตัวของแขกผู้เข้าพบ</p>
                    </div>

                    {/* Input Grid (Given Name & Family Name) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="input-group">
                        <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                          ชื่อจริงภาษาอังกฤษ (Given Name) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น somsak"
                          value={givenName}
                          onChange={(e) => setGivenName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '14.5px',
                            outline: 'none',
                            transition: 'all 0.2s',
                          }}
                          required
                        />
                        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>ตัวอักษรภาษาอังกฤษเท่านั้น</span>
                      </div>

                      <div className="input-group">
                        <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                          นามสกุลภาษาอังกฤษ (Family Name) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น jaidee"
                          value={familyName}
                          onChange={(e) => setFamilyName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '14.5px',
                            outline: 'none',
                            transition: 'all 0.2s',
                          }}
                          required
                        />
                        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>ตัวอักษรภาษาอังกฤษเท่านั้น</span>
                      </div>
                    </div>

                    {/* Company Name */}
                    <div className="input-group">
                      <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                        หน่วยงาน / สังกัด (Company Name) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="ระบุบริษัทหรือหน่วยงาน เช่น กระทรวงสาธารณสุข"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '14.5px',
                          outline: 'none',
                        }}
                        required
                      />
                    </div>

                    {/* Section Header: Credentials */}
                    <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginTop: '8px', marginBottom: '4px' }}>
                      <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700' }}>การกำหนดค่าบัญชีและความปลอดภัย (Account Security)</h4>
                      <p style={{ color: '#64748b', fontSize: '12.5px', marginTop: '2px' }}>รหัสผ่านและระยะเวลาหมดอายุความปลอดภัย</p>
                    </div>

                    {/* Username & Password Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="input-group">
                        <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                          ชื่อผู้ใช้งาน (Auto Username)
                        </label>
                        <input
                          type="text"
                          value={username}
                          placeholder="กรอกชื่อภาษาอังกฤษด้านบน"
                          readOnly
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1.5px solid #e2e8f0',
                            background: '#f8fafc',
                            fontSize: '14.5px',
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            color: '#0F3A6C',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div className="input-group">
                        <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                          รหัสผ่านเชื่อมต่อ (Password) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="ระบุรหัสผ่านเข้าใช้งาน"
                            style={{
                              width: '100%',
                              padding: '12px 48px 12px 16px',
                              borderRadius: '12px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '14.5px',
                              fontFamily: 'monospace',
                              fontWeight: '700',
                              outline: 'none',
                            }}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                              position: 'absolute',
                              right: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#0F3A6C',
                              fontSize: '12.5px',
                              fontWeight: '700'
                            }}
                          >
                            {showPassword ? 'ซ่อน' : 'แสดง'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Random Password triggers */}
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      style={{
                        alignSelf: 'flex-end',
                        background: 'none',
                        border: 'none',
                        color: '#C8A951',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        marginTop: '-12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      🔄 สุ่มรหัสผ่านใหม่ (Random 6 Digits)
                    </button>

                    {/* Expire / TTL Selection */}
                    <div className="input-group">
                      <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                        ระยะเวลาหมดอายุบัญชีเกสท์ (Account Expiration)
                      </label>
                      <select
                        value={expireAfter}
                        onChange={(e) => setExpireAfter(parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '14.5px',
                          background: 'white',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value={480}>8 ชั่วโมง (8 Hours) - แนะนำสำหรับผู้เข้าพบรายวัน</option>
                        <option value={1440}>1 วัน (24 Hours)</option>
                        <option value={4320}>3 วัน (3 Days)</option>
                        <option value={10080}>7 วัน (7 Days)</option>
                        <option value={43200}>30 วัน (30 Days)</option>
                      </select>
                    </div>

                    {/* Notes Field */}
                    <div className="input-group">
                      <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                        หมายเหตุ / ผู้ลงทะเบียนรับรอง (Notes Summary)
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '14.5px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* Terms Agreement (Like the old ClearPass checkbox) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      background: '#f8fafc',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      marginTop: '6px'
                    }}>
                      <input
                        type="checkbox"
                        id="terms_agree"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
                      />
                      <label htmlFor="terms_agree" style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', cursor: 'pointer', fontWeight: '500' }}>
                        <strong>รับทราบเงื่อนไขความปลอดภัย:</strong> ข้าพเจ้ายินยอมลงทะเบียนและรับรองบัญชีผู้เข้าใช้บริการท่านนี้ 
                        โดยปฏิบัติตาม พ.ร.บ. ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์อย่างเคร่งครัด
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '16px 24px',
                        background: 'linear-gradient(135deg, #0F3A6C 0%, #1a5a9a 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '14px',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        boxShadow: '0 10px 25px -5px rgba(15, 58, 108, 0.3)',
                        transition: 'all 0.2s ease',
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                      }}
                      className="submit-btn"
                    >
                      {isLoading ? (
                        <>
                          <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '3px', borderTopColor: '#ffffff', margin: 0 }} />
                          <span>กำลังบันทึกบัญชีลง Aruba ClearPass...</span>
                        </>
                      ) : (
                        <span>➕ สร้างบัญชีผู้ใช้งานชั่วคราว (Create)</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: GORGEOUS LIVE TICKET SLIP PREVIEW */}
        <div style={{
          position: 'sticky',
          top: '40px',
          animation: 'slideUp 0.5s ease-out 0.1s both'
        }}>
          
          <div style={{
            fontSize: '13px',
            color: '#475569',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#C8A951', borderRadius: '50%' }}></span>
            <span>Live Wi-Fi Ticket Preview</span>
          </div>

          {/* Ticket Slip Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 15px 30px -10px rgba(0,0,0,0.08)',
            border: '1.5px dashed #cbd5e1',
            padding: '28px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            
            {/* Top Cutout dots */}
            <div style={{
              position: 'absolute',
              top: '-10px',
              left: '10%',
              right: '10%',
              display: 'flex',
              justifyContent: 'space-between',
              zIndex: 10
            }}>
              {[...Array(12)].map((_, i) => (
                <div key={i} style={{ width: '12px', height: '12px', background: '#e2e8f0', borderRadius: '50%' }}></div>
              ))}
            </div>

            {/* Slip Header */}
            <div style={{
              textAlign: 'center',
              borderBottom: '2px dashed #e2e8f0',
              paddingBottom: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F3A6C', letterSpacing: '0.05em' }}>
                DTAM GUEST WIFI
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>
                คูปองเข้าใช้งานเครือข่ายอินเทอร์เน็ต
              </div>
            </div>

            {/* Slip Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>ชื่อเกสท์ (Visitor Name):</span>
                <span style={{ color: '#0F3A6C', fontWeight: '700' }}>
                  {givenName || familyName ? `${givenName} ${familyName}` : '(ไม่ได้ระบุ)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>หน่วยงาน (Company):</span>
                <span style={{ color: '#0F3A6C', fontWeight: '700' }}>{companyName || '(ไม่ได้ระบุ)'}</span>
              </div>
            </div>

            {/* Slip Credentials Box */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                  ชื่อผู้ใช้งาน (Username)
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0F3A6C', fontFamily: 'monospace', marginTop: '4px', letterSpacing: '0.5px' }}>
                  {username || 'somsakja'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                  รหัสผ่าน (Password)
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0F3A6C', fontFamily: 'monospace', marginTop: '4px', letterSpacing: '0.5px' }}>
                  {password || '401004'}
                </div>
              </div>
            </div>

            {/* Slip Expiry / Meta */}
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingBottom: '16px',
              borderBottom: '2.5px dashed #e2e8f0',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🕒 <strong>อายุการใช้งาน:</strong></span>
                <span style={{ color: '#0F3A6C', fontWeight: '700' }}>{getExpireLabel(expireAfter)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>📅 <strong>วันที่สร้างสิทธิ์:</strong></span>
                <span style={{ fontWeight: '600' }}>{new Date().toLocaleDateString('th-TH')}</span>
              </div>
            </div>

            {/* Slip Instructions */}
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', lineHeight: '1.6' }}>
              <p style={{ fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>วิธีใช้งานคูปอง:</p>
              <p>เชื่อมต่อเครือข่าย Wi-Fi ของกรมวิทยาศาสตร์การแพทย์</p>
              <p>แล้วกรอกรหัสผู้ใช้ด้านบนนี้ลงบนหน้าจอป๊อปอัพเพื่อออกอินเทอร์เน็ต</p>
            </div>

          </div>
          
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <a href="/" style={{ fontSize: '13.5px', color: '#475569', textDecoration: 'none', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>⬅️ กลับสู่หน้าหลักพอร์ทัล</span>
            </a>
          </div>

        </div>

      </div>

    </div>
  )
}
