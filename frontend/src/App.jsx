import React, { useContext, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Shield, Upload, FileText, Settings, BarChart3, Download, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import FileUpload from './components/FileUpload'
import ScanResults from './components/ScanResults'
import Dashboard from './components/Dashboard'
import Navbar from './components/Navbar'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import Signup from './components/Signup'
import { AuthProvider, useAuth } from './components/AuthContext'
import Analytics from './components/Analytics'
import ChatBot from './components/ChatBot'
import ChatButton from './components/ChatButton'

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState({ scanId: null, serviceIndex: null });

  const openChat = (scanId = null, serviceIndex = null) => {
    setChatContext({ scanId, serviceIndex });
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 40%, #fef9c3 100%)' }}>
      {/* Animated Gradient Overlay */}
      <div className="absolute inset-0 -z-20 animate-gradient-move" style={{background: 'linear-gradient(120deg, #a5b4fc 0%, #f472b6 50%, #facc15 100%)', opacity: 0.18}} />
      {/* SVG Geometric Overlay */}
      <svg className="absolute top-0 left-0 w-full h-64 -z-10 opacity-30" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill="#818cf8" fillOpacity="0.25" d="M0,160L60,170.7C120,181,240,203,360,197.3C480,192,600,160,720,133.3C840,107,960,85,1080,101.3C1200,117,1320,171,1380,197.3L1440,224L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z" />
      </svg>
      {/* Decorative Gradient Circles */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-primary-200 to-blue-200 rounded-full opacity-30 blur-2xl -z-10 animate-float-slow" style={{top: '-5rem', left: '-5rem'}} />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tr from-blue-200 to-purple-200 rounded-full opacity-20 blur-2xl -z-10 animate-float-slower" style={{bottom: '-6rem', right: '-6rem'}} />
      <Navbar openChat={openChat} />
      <div className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard scans={[]} openChat={openChat} /></RequireAuth>} />
          <Route path="/upload" element={<RequireAuth><FileUpload /></RequireAuth>} />
          <Route path="/scan/:scanId" element={<RequireAuth><ScanResults openChat={openChat} /></RequireAuth>} />
          <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
        </Routes>
      </div>
      
      {/* Chat Components */}
      {user && (
        <>
          <ChatButton onClick={() => openChat()} isOpen={isChatOpen} />
          <ChatBot 
            isOpen={isChatOpen}
            onClose={closeChat}
            scanId={chatContext.scanId}
            serviceIndex={chatContext.serviceIndex}
          />
        </>
      )}
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
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
