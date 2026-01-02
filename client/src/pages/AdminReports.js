import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'

const formatDateInput = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const AdminReports = () => {
  const navigate = useNavigate()
  const [from, setFrom] = useState(() => {
    const t = new Date()
    const s = new Date(t)
    s.setDate(s.getDate() - 6)
    return formatDateInput(s)
  })
  const [to, setTo] = useState(() => formatDateInput(new Date()))
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const [isAdmin, setIsAdmin] = useState(true)
  const [sessionInfo, setSessionInfo] = useState({ role: null, hasToken: false })

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      setIsAdmin(false)
      setError('You must be logged in as admin to view reports')
      return
    }
    try {
      const user = JSON.parse(userStr)
      if (user.role !== 'admin') {
        setIsAdmin(false)
        setError('Access denied: admin only')
        setSessionInfo({ role: user.role, hasToken: !!localStorage.getItem('token') })
        return
      }
      setIsAdmin(true)
      setSessionInfo({ role: user.role, hasToken: !!localStorage.getItem('token') })
      fetchData()
    } catch (e) {
      setIsAdmin(false)
      setError('Invalid user session')
      setSessionInfo({ role: null, hasToken: !!localStorage.getItem('token') })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/admin/reports/overview', { params: { from, to }, skipAuthRedirect: true })
      setData(res.data)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const currency = (data?.revenue?.currency || 'bdt').toUpperCase()
  const totalRevenue = data?.revenue?.total || 0
  const occupancyPct = data ? Math.round((data.usage.averageOccupancyRate || 0) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] text-gray-800">
      <div className="max-w-7xl mx-auto px-4 lg:px-0 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">← Back to Home</Link>
          <h1 className="text-3xl font-bold text-indigo-900">Admin Reports</h1>
          <div className="w-24"></div>
        </div>

        <div className="mb-4">
          <div className="inline-flex items-center space-x-3 px-3 py-2 rounded-md border border-indigo-100 bg-white shadow-sm">
            <span className="text-xs text-gray-600">Session:</span>
            <span className="text-xs text-gray-800">role: {sessionInfo.role || 'unknown'}</span>
            <span className="text-xs text-gray-800">token: {sessionInfo.hasToken ? 'present' : 'missing'}</span>
          </div>
        </div>

        {!isAdmin && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-4xl mb-4">🚫</div>
            <p className="text-gray-800 font-semibold">{error || 'Access denied'}</p>
            <p className="text-gray-600 mt-2">Please log in as an admin to view this page.</p>
            <div className="mt-4">
              <Link to="/login" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Go to Login</Link>
            </div>
          </div>
        )}

        {isAdmin && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm text-gray-600">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 border rounded px-3 py-2" />
            </div>
            <button onClick={fetchData} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Refresh</button>
          </div>
          {error && <p className="text-red-600 mt-3">{error}</p>}
        </div>
        )}

        {isAdmin && (loading ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading report...</p>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500">Total Revenue</div>
                <div className="text-3xl font-bold mt-2">{currency} {totalRevenue.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500">Average Occupancy</div>
                <div className="text-3xl font-bold mt-2">{occupancyPct}%</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500">Repeat Customers</div>
                <div className="text-3xl font-bold mt-2">
                  {data.customers.repeatCustomers.count}
                  <span className="text-base text-gray-500 ml-2">({Math.round((data.customers.repeatCustomers.percentage || 0) * 100)}%)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Daily Revenue</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-indigo-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-indigo-900 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-indigo-900 uppercase">Transactions</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-indigo-900 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(data.revenue.daily || []).map(r => (
                        <tr key={r.date}>
                          <td className="px-4 py-2">{r.date}</td>
                          <td className="px-4 py-2">{r.count}</td>
                          <td className="px-4 py-2">{currency} {Number(r.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Peak Usage Hours</h2>
                </div>
                <div>
                  {data.usage.peakHours.map(h => (
                    <div key={h.hour} className="flex items-center mb-2">
                      <div className="w-16 text-sm text-gray-600">{String(h.hour).padStart(2, '0')}:00</div>
                      <div className="flex-1 bg-gray-100 h-4 rounded">
                        <div className="bg-indigo-600 h-4 rounded" style={{ width: `${Math.min(100, (h.count || 0) * 5)}%` }}></div>
                      </div>
                      <div className="w-12 text-right text-sm text-gray-600 ml-2">{h.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">New Users Per Day</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-indigo-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-indigo-900 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-indigo-900 uppercase">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(data.customers.newUsersDaily || []).map(r => (
                        <tr key={r.date}>
                          <td className="px-4 py-2">{r.date}</td>
                          <td className="px-4 py-2">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Vehicle Type Distribution</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-indigo-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-indigo-900 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-indigo-900 uppercase">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(data.customers.vehicleTypeDistribution || []).map(v => (
                        <tr key={v.type}>
                          <td className="px-4 py-2">{v.type}</td>
                          <td className="px-4 py-2">{v.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600">No data</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminReports
