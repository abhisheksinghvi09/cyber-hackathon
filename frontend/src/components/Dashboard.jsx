import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, Upload, Clock, AlertTriangle, CheckCircle, XCircle, MessageCircle } from 'lucide-react'
import { useAuth } from './AuthContext'
import FileUpload from './FileUpload'

const Dashboard = ({ openChat }) => {
  const { token } = useAuth();
  const navigate = useNavigate()
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchScans = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/scans', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()
      setScans(data.scans || [])
    } catch (error) {
      setScans([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScans()
    // eslint-disable-next-line
  }, [token])

  const handleScanComplete = () => {
    fetchScans()
  }

  const totalScans = scans.length
  const totalServices = scans.reduce((sum, scan) => sum + (scan.summary?.total_services || 0), 0)
  const highRiskCount = scans.reduce((sum, scan) => sum + (scan.summary?.high_risk_count || 0), 0)
  const mediumRiskCount = scans.reduce((sum, scan) => sum + (scan.summary?.medium_risk_count || 0), 0)

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High': return 'text-danger-600 bg-danger-100'
      case 'Medium': return 'text-warning-600 bg-warning-100'
      case 'Low': return 'text-success-600 bg-success-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Vulnerability Patch Management Dashboard
        </h1>
        <p className="text-gray-600 text-lg">
          Monitor your security scans and vulnerability assessments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-100 p-3 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Scans</p>
              <p className="text-2xl font-bold text-gray-900">{totalScans}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-success-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Services Found</p>
              <p className="text-2xl font-bold text-gray-900">{totalServices}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-danger-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-danger-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-gray-900">{highRiskCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-warning-100 p-3 rounded-lg">
              <XCircle className="h-6 w-6 text-warning-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Medium Risk</p>
              <p className="text-2xl font-bold text-gray-900">{mediumRiskCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/upload"
            className="btn-primary flex items-center space-x-2"
          >
            <Upload className="h-5 w-5" />
            <span>Upload New Scan</span>
          </Link>
          {openChat && (
            <button
              onClick={() => openChat()}
              className="btn-secondary flex items-center space-x-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Chat with AI</span>
            </button>
          )}
        </div>
      </div>

      {/* Recent Scans */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Scans</h2>
          {scans.length > 0 && (
            <Link
              to="/upload"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading scans...</div>
        ) : scans.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scans yet</h3>
            <p className="text-gray-600 mb-6">
              Upload your first Nmap XML scan to get started
            </p>
            <Link to="/upload" className="btn-primary">
              Upload First Scan
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {scans.slice(0, 5).map((scan) => (
              <div
                key={scan.scan_id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => navigate(`/scan/${scan.scan_id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary-100 p-2 rounded-lg">
                      <Clock className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Scan {scan.scan_id.slice(0, 8)}...
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(scan.timestamp)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {scan.summary?.total_services || 0} services
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        {scan.summary?.high_risk_count > 0 && (
                          <span className="px-2 py-1 text-xs font-medium bg-danger-100 text-danger-800 rounded">
                            {scan.summary.high_risk_count} High
                          </span>
                        )}
                        {scan.summary?.medium_risk_count > 0 && (
                          <span className="px-2 py-1 text-xs font-medium bg-warning-100 text-warning-800 rounded">
                            {scan.summary.medium_risk_count} Medium
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard 