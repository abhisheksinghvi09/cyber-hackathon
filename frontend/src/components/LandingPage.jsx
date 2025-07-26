import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, Shield, Zap, FileText, BarChart3, CheckCircle, UploadCloud } from 'lucide-react'
import vlogo from '../assets/vlogo.jpeg'

const features = [
  {
    icon: <UploadCloud className="h-7 w-7 text-primary-600" />,
    title: 'Easy Scan Upload',
    desc: 'Drag & drop your Nmap XML files for instant analysis.'
  },
  {
    icon: <Zap className="h-7 w-7 text-yellow-500" />,
    title: 'AI-Powered Analysis',
    desc: 'Get vulnerability insights and patch recommendations from LLMs.'
  },
  {
    icon: <FileText className="h-7 w-7 text-blue-500" />,
    title: 'Professional PDF Reports',
    desc: 'Export beautiful, shareable reports with one click.'
  },
  {
    icon: <BarChart3 className="h-7 w-7 text-green-600" />,
    title: 'Scan History Dashboard',
    desc: 'Track all your scans and risk levels in one place.'
  },
  {
    icon: <CheckCircle className="h-7 w-7 text-success-600" />,
    title: 'Automated Patch Scripts',
    desc: 'Generate ready-to-use scripts for quick remediation.'
  },
  {
    icon: <Shield className="h-7 w-7 text-purple-600" />,
    title: 'Security First',
    desc: 'Your data is processed securely and never stored.'
  }
]

const LandingPage = () => {
  const navigate = useNavigate()

  const handleScrollToDashboard = () => {
    navigate('/dashboard')
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <div className="w-full flex flex-col items-center justify-center pt-24 pb-12 px-4 text-center relative z-10">
        {/* Logo */}
        <img
          src={vlogo}
          alt="VPM Logo"
          className="h-24 w-24 mb-4 rounded-2xl shadow-xl border-4 border-white object-cover"
          style={{ margin: '0 auto' }}
        />
        {/* Removed animated shield icon */}
        <h1 className="text-5xl md:text-6xl font-extrabold text-primary-800 mb-4 drop-shadow-sm">
          VPM
        </h1>
        <p className="max-w-2xl text-xl md:text-2xl text-gray-700 mb-8 font-medium">
          AI-powered vulnerability patch management. Upload, analyze, and secure your infrastructure in minutes.
        </p>
        <button
          onClick={handleScrollToDashboard}
          className="btn-primary flex items-center space-x-2 px-8 py-4 text-xl rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          <span>Get Started</span>
          <ArrowDown className="h-6 w-6" />
        </button>
        <span className="text-sm text-gray-500 mt-2">Scroll or click to explore</span>
      </div>

      {/* Decorative Gradient Circles */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-primary-200 to-blue-200 rounded-full opacity-30 blur-2xl -z-10 animate-float-slow" style={{top: '-5rem', left: '-5rem'}} />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tr from-blue-200 to-purple-200 rounded-full opacity-20 blur-2xl -z-10 animate-float-slower" style={{bottom: '-6rem', right: '-6rem'}} />

      {/* Features Section */}
      <div className="w-full max-w-5xl mx-auto mt-20 mb-12 px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-700 mb-8 text-center">
          Why VPM?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="bg-white bg-opacity-90 rounded-xl shadow-lg p-6 flex flex-col items-center hover:shadow-2xl transition-shadow duration-200">
              <div className="mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-primary-800 mb-1">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} VPM &mdash; Built by Team Nischay
      </footer>

      {/* Custom Animations */}
      <style>{`
        .animate-bounce-slow {
          animation: bounce 2.5s infinite;
        }
        .animate-float-slow {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-slower {
          animation: float 14s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        .animate-gradient-move {
          background-size: 200% 200%;
          animation: gradientMove 8s ease-in-out infinite;
        }
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  )
}

export default LandingPage 