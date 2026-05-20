import React, { useEffect, useState } from 'react'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users/me')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json()
      })
      .then(data => {
        setUser(data.user)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        window.location.href = '/?error=auth_failed'
      })
  }, [])

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      window.location.href = '/'
    })
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#eef2f7',
        fontFamily: "'Sarabun', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 20px' }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>ระบบกำลังตรวจสอบข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#eef2f7',
      fontFamily: "'Sarabun', 'Inter', sans-serif",
      color: 'var(--text)'
    }}>
      {/* Header Banner */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
            <img src="/dtam.png" alt="DTAM Logo" style={{ height: '44px', width: 'auto', objectFit: 'contain' }} />
            <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
            <h1 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)' }}>
              ระบบตรวจสอบข้อมูลบริการทางการแพทย์
            </h1>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 10px rgba(15,58,108,0.2)'
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
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '32px 16px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)',
          borderTop: '5px solid var(--primary)',
          overflow: 'hidden'
        }}>
          
          {/* Profile Banner */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
            padding: '40px 32px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '38px',
              fontWeight: '900',
              boxShadow: 'var(--shadow-md)'
            }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div style={{ flex: '1', minWidth: '250px' }}>
              <div style={{
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontSize: '11px',
                fontWeight: '700',
                color: '#93c5fd',
                marginBottom: '6px'
              }}>
                ข้อมูลผู้เข้าใช้งานระบบ
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: '800', margin: 0, lineHeight: '1.2' }}>
                {user?.name && user?.title && user.name.startsWith(user.title) 
                  ? user.name 
                  : `${user?.title || ''} ${user?.name || ''}`.trim()}
              </h2>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '20px',
                padding: '6px 16px',
                marginTop: '12px'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#bfdbfe', marginRight: '8px' }}>
                  หมายเลขบัตรประชาชน:
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: '700', letterSpacing: '0.05em' }}>
                  {user?.pid}
                </span>
              </div>
            </div>
          </div>

          <div style={{ padding: '36px 32px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '800',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: '2px solid #f0f3f7',
              paddingBottom: '12px',
              marginBottom: '28px'
            }}>
              <span style={{ width: '4px', height: '20px', background: 'var(--accent)', borderRadius: '2px' }} />
              ประวัติส่วนบุคคล (Thai Identity)
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              marginBottom: '32px'
            }}>
              <InfoRow label="ชื่อสากล (English Name)" value={user?.name_en || `${user?.title_en || ''} ${user?.given_name_en || ''} ${user?.middle_name_en || ''} ${user?.family_name_en || ''}`.trim()} />
              <InfoRow label="วันเกิด (Birthdate)" value={user?.birthdate} />
              <InfoRow label="เพศ (Gender)" value={user?.gender === '1' ? 'ชาย' : user?.gender === '2' ? 'หญิง' : user?.gender || '-'} />
              <InfoRow label="ที่อยู่ตามทะเบียนบ้าน (Official Address)" value={user?.address} isFullWidth={true} />
            </div>

            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <h4 style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--text-muted)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '12px'
              }}>
                ข้อมูลดิบจากระบบ (Developer Payload)
              </h4>
              <pre style={{
                margin: 0,
                fontSize: '13px',
                color: '#334155',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: "'Inter', monospace",
                lineHeight: '1.6'
              }}>
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <p style={{
          marginTop: '24px',
          textAlign: 'center',
          color: 'var(--text-light)',
          fontSize: '12px',
          fontStyle: 'italic'
        }}>
          ข้อมูลนี้เป็นความลับเฉพาะบุคคล ห้ามเปิดเผยแก่ผู้ไม่มีส่วนเกี่ยวข้อง
        </p>
      </main>
    </div>
  )
}

function InfoRow({ label, value, isFullWidth = false }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      paddingBottom: '12px',
      borderBottom: '1px solid #f1f5f9',
      gridColumn: isFullWidth ? '1 / -1' : 'span 1'
    }}>
      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
        {value || <span style={{ color: 'var(--text-light)', fontWeight: '400', fontStyle: 'italic' }}>ไม่มีข้อมูล</span>}
      </span>
    </div>
  )
}
