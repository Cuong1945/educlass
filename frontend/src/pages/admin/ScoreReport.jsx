import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import axiosClient from '../../api/axiosClient'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'KIDS', label: 'Kids (Thiếu nhi)' },
]

const COLORS = ['#22c55e', '#ef4444']; // Green for Pass, Red for Fail

export default function ScoreReport() {
  const location = useLocation()

  const [classes, setClasses] = useState([])
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedClassInfo, setSelectedClassInfo] = useState(null)
  
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // Admin có thể fetch full danh sách lớp
    const fetchClasses = async () => {
      try {
        const { data } = await axiosClient.get('/classes')
        setClasses(data)
      } catch (err) {
        console.error('Failed to fetch classes', err)
      }
    }
    fetchClasses()
  }, [])

  const filteredClasses = classes.filter(c => selectedLevel ? c.level === selectedLevel : true)

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true)
      setErrorMsg('')
      try {
        const params = {}
        if (selectedClassId) params.classId = selectedClassId
        
        const { data } = await axiosClient.get('/scores/report', { params })
        setReportData(data)
        
        const cls = classes.find(c => c._id === selectedClassId)
        setSelectedClassInfo(cls || data.classInfo)
      } catch (err) {
        setReportData(null)
        if (err.response?.status === 404) {
          setErrorMsg('No report data available')
        } else {
          setErrorMsg(err.response?.data?.message || 'Cannot load report')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [selectedClassId, classes])

  // Data mapping for charts
  const getPieData = () => {
    if (!reportData) return []
    return [
      { name: 'Passed', value: reportData.stats.passed },
      { name: 'Failed', value: reportData.stats.failed }
    ]
  }

  const getBarData = () => {
    if (!reportData) return []
    let bins = { '0-4': 0, '5-6': 0, '7-8': 0, '9-10': 0 }
    
    reportData.ranking.forEach(s => {
      const avg = s.average
      if (avg < 50) bins['0-4']++
      else if (avg < 70) bins['5-6']++
      else if (avg < 90) bins['7-8']++
      else bins['9-10']++
    });

    return [
      { range: '0 - 49 (Fail)', count: bins['0-4'] },
      { range: '50 - 69', count: bins['5-6'] },
      { range: '70 - 89', count: bins['7-8'] },
      { range: '90 - 100', count: bins['9-10'] }
    ]
  }

  const renderRankBadge = (rank) => {
    if (rank === 1) return <span className="rank-badge rank-1"><i className="fa-solid fa-trophy"/> Top 1</span>
    if (rank === 2) return <span className="rank-badge rank-2"><i className="fa-solid fa-medal"/> Top 2</span>
    if (rank === 3) return <span className="rank-badge rank-3"><i className="fa-solid fa-medal"/> Top 3</span>
    return <span className="rank-badge rank-default">#{rank}</span>
  }

  return (
    <div className="layout">
      <Sidebar role="ADMIN" activePath={location.pathname} />

      <main className="content">
        <header className="content-header">
          <div className="header-titles">
            <h1>Class Score Report</h1>
            <p>Evaluate teaching quality and student progress.</p>
          </div>
        </header>

        <section className="panel card">
          <h3>Report Filters</h3>
          <div className="filter-form">
            <div className="filter-grid" style={{ gridTemplateColumns: 'minmax(200px, 300px) minmax(250px, 400px)' }}>
              <div className="filter-group">
                <label>Level Filter</label>
                <select value={selectedLevel} onChange={(e) => { setSelectedLevel(e.target.value); setSelectedClassId('') }}>
                  <option value="">All Levels</option>
                  {LEVELS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Class Filter <span style={{color: 'red'}}>*</span></label>
                <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                  <option value="">-- Choose a Class --</option>
                  {filteredClasses.map(c => (
                    <option key={c._id} value={c._id}>{c.className}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {loading && (
          <div className="panel card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#64748b' }}>Generating report...</p>
          </div>
        )}

        {!loading && errorMsg && (
          <div className="panel card" style={{ textAlign: 'center', padding: '40px' }}>
            <div className="empty-state">
              <i className="fa-solid fa-chart-pie" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }}></i>
              <h3 style={{ color: '#1e293b' }}>{errorMsg}</h3>
              <p style={{ color: '#64748b', marginTop: '8px' }}>This class either has no saved scores or hasn't been graded yet.</p>
            </div>
          </div>
        )}

        {!loading && reportData && (
          <>
            {/* STATS WIDGETS */}
            <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                  <i className="fa-solid fa-users" />
                </div>
                <div className="stat-info">
                  <p className="stat-label">Total Graded Students</p>
                  <p className="stat-value">{reportData.stats.totalStudents}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#dcfce7', color: '#166534' }}>
                  <i className="fa-solid fa-check-double" />
                </div>
                <div className="stat-info">
                  <p className="stat-label">Pass Rate</p>
                  <p className="stat-value">{reportData.stats.passRate}%</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fef9c3', color: '#854d0e' }}>
                  <i className="fa-solid fa-star" />
                </div>
                <div className="stat-info">
                  <p className="stat-label">Class Average</p>
                  <p className="stat-value">{reportData.stats.classAverage}</p>
                </div>
              </div>
            </div>

            {/* CHARTS LAYER */}
            <div className="chart-container" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '24px' }}>
              
              <div className="panel card" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Pass/Fail Ratio</h3>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={getPieData()}
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getPieData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel card" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Score Distribution</h3>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer>
                    <BarChart data={getBarData()} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="range" tick={{fill: '#64748b', fontSize: 13}} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{fill: '#64748b', fontSize: 13}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* DETAILED RANKING DATA TABLE */}
            <section className="panel card">
              <div className="attendance-header">
                <h3>Detailed Student Ranking</h3>
              </div>
              
              <div className="table-wrap">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                      <th>Student Name</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Midterm</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Final</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Oral</th>
                      <th style={{ width: '140px', textAlign: 'center' }}>Final Average</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.ranking.map((s, idx) => (
                      <tr key={s._id}>
                        <td style={{ textAlign: 'center' }}>{renderRankBadge(s.rank)}</td>
                        <td><strong>{s.name}</strong></td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{s.midterm}</td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{s.final}</td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{s.oral !== null ? s.oral : '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                          <span className={s.average >= 50 ? 'text-success' : 'text-danger'} style={{ fontSize: '15px' }}>
                            {s.average}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`att-badge ${s.average >= 50 ? 'badge-present' : 'badge-absent'}`}>
                            {s.average >= 50 ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

      </main>
    </div>
  )
}
