import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useAuth } from './AuthContext'

const FileUpload = ({ onScanComplete }) => {
  const [uploadStatus, setUploadStatus] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { token } = useAuth();

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!file.name.endsWith('.xml')) {
      setError('Please upload an XML file')
      return
    }

    setLoading(true)
    setError(null)
    setUploadStatus('uploading')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/parse-scan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setUploadStatus('success')
        if (onScanComplete) onScanComplete(data)
        setTimeout(() => {
          if (data.scan_id) {
            window.location.href = `/scan/${data.scan_id}`
          }
        }, 1500)
      } else {
        setError(data.message || 'Upload failed')
        setUploadStatus('error')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setUploadStatus('error')
    } finally {
      setLoading(false)
    }
  }, [onScanComplete, token])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/xml': ['.xml'],
      'text/xml': ['.xml']
    },
    multiple: false
  })

  const getStatusIcon = () => {
    if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
    if (uploadStatus === 'success') return <CheckCircle className="h-8 w-8 text-success-600" />
    if (uploadStatus === 'error') return <AlertCircle className="h-8 w-8 text-danger-600" />
    return <Upload className="h-8 w-8 text-gray-400" />
  }

  const getStatusText = () => {
    if (loading) return 'Processing scan...'
    if (uploadStatus === 'success') return 'Scan processed successfully!'
    if (uploadStatus === 'error') return 'Upload failed'
    return 'Upload Nmap XML file'
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Vulnerability Patch Management
        </h1>
        <p className="text-gray-600 text-lg">
          Upload your Nmap XML scan to get AI-powered vulnerability analysis and patch recommendations
        </p>
      </div>

      <div className="card">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
            isDragActive
              ? 'border-primary-400 bg-primary-50'
              : uploadStatus === 'success'
              ? 'border-success-400 bg-success-50'
              : uploadStatus === 'error'
              ? 'border-danger-400 bg-danger-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center space-y-4">
            {getStatusIcon()}
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {getStatusText()}
              </h3>
              <p className="text-gray-600">
                {isDragActive
                  ? 'Drop the XML file here'
                  : 'Drag & drop an Nmap XML file here, or click to select'}
              </p>
            </div>

            {!loading && uploadStatus !== 'success' && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FileText className="h-4 w-4" />
                <span>Supports .xml files only</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-danger-50 border border-danger-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-danger-600" />
              <span className="text-danger-800">{error}</span>
            </div>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-success-600" />
              <span className="text-success-800">
                Scan processed successfully! Redirecting to results...
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How it works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="text-primary-600 font-bold">1</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Upload Scan</h4>
            <p className="text-gray-600 text-sm">
              Upload your Nmap XML scan file
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="text-primary-600 font-bold">2</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">AI Analysis</h4>
            <p className="text-gray-600 text-sm">
              LLM analyzes vulnerabilities and generates recommendations
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="text-primary-600 font-bold">3</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Get Patches</h4>
            <p className="text-gray-600 text-sm">
              Receive detailed patch instructions and automated scripts
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileUpload 