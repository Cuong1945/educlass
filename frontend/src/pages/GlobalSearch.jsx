import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import axiosClient from '../api/axiosClient'

const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'KIDS', label: 'Kids' },
]

export default function GlobalSearch({ role }) {
  const location = useLocation()
  
  const [keyword, setKeyword] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterAge, setFilterAge] = useState('')

  const [classes, setClasses] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const url = role === 'ADMIN' ? '/classes' : '/classes/my-classes'
        const { data } = await axiosClient.get(url)
        setClasses(data)
      } catch { /* silent */ }
    }
    fetchClasses()
  }, [role])

  const fetchSearch = async () => {
    setLoading(true)
    setErrorMsg('')
    setHasSearched(true)

    try {
      const params = {}
      if (keyword.trim()) params.keyword = keyword.trim()
      if (filterClass) params.classId = filterClass
      if (filterLevel) params.level = filterLevel
      if (filterAge) params.ageGroup = filterAge
      
      if (role === 'ADMIN' && filterRole !== 'ALL') {
        params.role = filterRole
      }

      const { data } = await axiosClient.get('/search', { params })
      setResults(data)

    } catch (err) {
      setResults([])
      if (err.response?.status === 404) {
        setErrorMsg('No matching records found')
      } else {
        setErrorMsg(err.response?.data?.message || 'Search request timeout')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Tự động load tất cả khi vào trang
    fetchSearch()
  }, [role])

  const handleSearch = (e) => {
    e?.preventDefault()
    fetchSearch()
  }

  const handleClear = () => {
    setKeyword('')
    setFilterRole('ALL')
    setFilterLevel('')
    setFilterClass('')
    setFilterAge('')
    setResults([])
    setHasSearched(false)
    setErrorMsg('')
  }

  return (
    <div className="layout">
      <Sidebar role={role} activePath={location.pathname} />

      <main className="content">
        <header className="content-header">
          <div className="header-titles">
            <h1>Global Directory</h1>
            <p>Search and filter {role === 'ADMIN' ? 'teachers and students' : 'your students'} across the system.</p>
          </div>
        </header>

        <section className="panel card">
          <form onSubmit={handleSearch} className="filter-form">
            <div className="search-bar-mega" style={{ marginBottom: '20px', position: 'relative' }}>
              <i className="fa-solid fa-magnifying-glass search-icon" style={{ position: 'absolute', margin: '14px 16px', color: '#94a3b8' }}></i>
              <input 
                type="text" 
                placeholder={role === 'ADMIN' ? 'Search by Name, Email, or Phone Number...' : 'Search student by Name or Phone...'}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: '100%', padding: '12px 14px 12px 42px', fontSize: '16px', borderRadius: '8px', border: '2px solid #e2e8f0', outline: 'none' }}
              />
            </div>

            <div className="filter-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              {role === 'ADMIN' && (
                <div className="filter-group">
                  <label>Role</label>
                  <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                    <option value="ALL">All Roles</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>
              )}
              <div className="filter-group">
                <label>Age Group</label>
                <select value={filterAge} onChange={(e) => setFilterAge(e.target.value)}>
                  <option value="">Any Age</option>
                  <option value="KIDS">Kids (&lt; 16 &amp; KIDS Level)</option>
                  <option value="ADULTS">Adults (&ge; 16)</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Level</label>
                <select value={filterLevel} onChange={(e) => { setFilterLevel(e.target.value); setFilterClass('') }}>
                  <option value="">All Levels</option>
                  {LEVELS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Class</label>
                <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                  <option value="">All Classes</option>
                  {classes
                    .filter(c => filterLevel ? c.level === filterLevel : true)
                    .map(c => (
                      <option key={c._id} value={c._id}>{c.className}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="filter-actions" style={{ marginTop: '20px' }}>
              <button className="btn-primary" type="submit" disabled={loading} style={{ padding: '10px 24px' }}>
                {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-search" /> Search</>}
              </button>
              <button type="button" className="btn-outline" onClick={handleClear} style={{ padding: '10px 24px' }}>Clear</button>
            </div>
          </form>
        </section>

        {hasSearched && !loading && (
          <section className="panel card">
            <div className="attendance-header">
              <h3>System Directory ({results.length})</h3>
            </div>
            
            {errorMsg ? (
              <div className="alert error"><i className="fa-solid fa-circle-exclamation" /> {errorMsg}</div>
            ) : results.length > 0 ? (
              <div className="table-wrap">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th style={{ width: '100px' }}>Role</th>
                      <th>Name</th>
                      <th>Age</th>
                      <th>Class</th>
                      <th>Level</th>
                      {role === 'ADMIN' && <th>Parent Info</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={`${r.role}-${r.id}`}>
                        <td>
                          <span className={`att-badge ${r.role === 'TEACHER' ? 'badge-warning' : 'badge-present'}`}>
                            {r.role}
                          </span>
                        </td>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.age !== 'N/A' ? `${r.age} yrs` : '—'}</td>
                        <td>{r.class}</td>
                        <td>{r.level === 'N/A' ? '—' : r.level}</td>
                        {role === 'ADMIN' && <td>{r.parentInfo === 'N/A' ? '—' : r.parentInfo}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        )}
      </main>
    </div>
  )
}
