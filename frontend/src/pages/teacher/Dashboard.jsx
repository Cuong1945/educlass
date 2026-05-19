import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import axiosClient from '../../api/axiosClient'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function TeacherDashboard() {
  const location = useLocation()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axiosClient.get('/dashboard/teacher')
        setStats(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const COLORS = ['#22c55e', '#ef4444'];
  const BAR_COLORS = { 'BEGINNER': '#3b82f6', 'INTERMEDIATE': '#f59e0b', 'ADVANCED': '#8b5cf6', 'KIDS': '#ec4899' };

  const getPieData = () => {
    if (!stats || !stats.passFail) return []
    return [
      { name: 'Passed', value: stats.passFail.passed },
      { name: 'Failed', value: stats.passFail.failed }
    ]
  }

  const getBarData = () => {
    if (!stats || !stats.studentsByLevel) return []
    return stats.studentsByLevel.map(s => ({
      name: s.level,
      Students: s.count,
      fill: BAR_COLORS[s.level] || '#cbd5e1'
    }))
  }

  const renderRankBadge = (rank) => {
    if (rank === 1) return <span className="rank-badge rank-1"><i className="fa-solid fa-trophy"/> Top 1</span>
    if (rank === 2) return <span className="rank-badge rank-2"><i className="fa-solid fa-medal"/> Top 2</span>
    if (rank === 3) return <span className="rank-badge rank-3"><i className="fa-solid fa-medal"/> Top 3</span>
    return <span className="rank-badge rank-default">#{rank}</span>
  }

  return (
    <div className="layout">
      <Sidebar role="TEACHER" activePath={location.pathname} />

      <main className="content">
        <header className="content-header">
          <div className="header-titles">
            <h1>Teacher Analytics</h1>
            <p>Xin chào <strong>{localStorage.getItem('username')}</strong>! Bảng điều khiển phân tích kết quả giảng dạy của bạn.</p>
          </div>
        </header>

        {loading ? (
          <div className="panel card">
            <p style={{ textAlign: 'center', color: '#999', margin: '40px 0' }}>Đang nạp dữ liệu phân tích...</p>
          </div>
        ) : stats ? (
          <>
            <section className="dashboard-grid" style={{ marginBottom: '24px' }}>
              <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
                <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
                  <i className="fa-solid fa-chalkboard" />
                </div>
                <div className="stat-info">
                  <p className="stat-label">My Classes</p>
                  <p className="stat-value">{stats.totalClasses}</p>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
                <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                  <i className="fa-solid fa-users-rectangle" />
                </div>
                <div className="stat-info">
                  <p className="stat-label">My Students</p>
                  <p className="stat-value">{stats.totalStudents}</p>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
                <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#8b5cf6' }}>
                  <i className="fa-solid fa-file-pen" />
                </div>
                <div className="stat-info">
                  <p className="stat-label">Scores Marked</p>
                  <p className="stat-value">{stats.totalScores}</p>
                </div>
              </div>

              <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
                <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}>
                  <i className="fa-solid fa-star-half-stroke" />
                </div>
                <div className="stat-info">
                  <p className="stat-label">Avg Class Score</p>
                  <p className="stat-value">{stats.avgScore}</p>
                </div>
              </div>
            </section>

            {/* CHARTS LAYER */}
            <div className="chart-container" style={{ marginBottom: '24px' }}>
              <div className="panel card" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  My Class Pass Rate
                </h3>
                {stats.passFail.totalScored === 0 ? (
                  <p style={{textAlign: 'center', color: '#94a3b8', margin: '80px 0'}}>Chưa có dữ liệu điểm.</p>
                ) : (
                  <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={getPieData()} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                          {getPieData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="panel card" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  My Students by Level
                </h3>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer>
                    <BarChart data={getBarData()} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 13}} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{fill: '#64748b', fontSize: 13}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                      <Bar dataKey="Students" radius={[4, 4, 0, 0]} barSize={50}>
                        {getBarData().map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* LEADERBOARDS LAYER */}
            <div className="dashboard-grid-leaderboards" style={{ gap: '24px', alignItems: 'start' }}>
              <div className="panel card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="attendance-header" style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                  <h3 style={{margin: 0}}><i className="fa-solid fa-medal" style={{color: '#f59e0b', marginRight: '8px'}}/> My Hall of Fame</h3>
                </div>
                <div className="table-wrap">
                  <table className="user-table">
                    <thead>
                      <tr>
                        <th style={{width: '90px'}}>Rank</th>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th style={{textAlign: 'right'}}>Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topStudents.length === 0 && <tr><td colSpan="4" style={{textAlign: 'center', color: '#94a3b8', padding: '20px'}}>Chưa có học sinh đạt điểm giỏi</td></tr>}
                      {stats.topStudents.map((s, idx) => (
                        <tr key={s._id}>
                          <td style={{textAlign: 'center'}}>{renderRankBadge(idx + 1)}</td>
                          <td><strong>{s.studentId?.name || '—'}</strong></td>
                          <td><span className="att-badge badge-warning" style={{background: '#f1f5f9', color: '#475569'}}>{s.classId?.className || '—'}</span></td>
                          <td style={{textAlign: 'right'}}><strong style={{color: '#2563eb', fontSize: '15px'}}>{s.average}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="attendance-header" style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                  <h3 style={{margin: 0}}><i className="fa-solid fa-clock-rotate-left" style={{color: '#3b82f6', marginRight: '8px'}}/> My Recent Classes</h3>
                </div>
                <div className="table-wrap">
                  <table className="user-table">
                    <thead>
                      <tr>
                        <th>Class Name</th>
                        <th>Level</th>
                        <th>Schedule</th>
                        <th style={{textAlign: 'center'}}>Cap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentClasses.length === 0 && <tr><td colSpan="4" style={{textAlign: 'center', color: '#94a3b8', padding: '20px'}}>Bạn chưa được phân công lớp nào</td></tr>}
                      {stats.recentClasses.map((c) => (
                        <tr key={c._id}>
                          <td><strong>{c.className}</strong></td>
                          <td><span className="att-badge badge-warning" style={{background: '#f1f5f9', color: '#475569'}}>{c.level}</span></td>
                          <td style={{color: '#64748b'}}>{c.schedule}</td>
                          <td style={{textAlign: 'center'}}><strong>{c.capacity}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </>
        ) : (
          <div className="panel card">
            <p className="empty-message">Cannot load analytics.</p>
          </div>
        )}
      </main>
    </div>
  )
}
