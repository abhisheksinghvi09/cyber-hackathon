import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import vlogo from '../assets/vlogo.jpeg'
import { useAuth } from './AuthContext'
import { MessageCircle } from 'lucide-react'

const Navbar = ({ openChat }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="flex items-center justify-between py-4 px-6 shadow-md bg-white/60 backdrop-blur-md bg-gradient-to-r from-primary-100/80 via-white/70 to-blue-100/80 border-b border-primary-100">
      <Link to="/" className="flex items-center space-x-3">
        <img
          src={vlogo}
          alt="VPM Logo"
          className="h-10 w-10 rounded-xl shadow border-2 border-primary-200 object-cover"
        />
        <span className="text-2xl font-bold text-primary-700 tracking-tight">VPM</span>
      </Link>
      <div className="flex items-center space-x-4">
        {user ? (
          <>
            <Link to="/dashboard" className="btn-secondary px-4 py-2 rounded-lg font-medium text-primary-700 hover:bg-primary-100 transition-colors">Dashboard</Link>
            <Link to="/upload" className="btn-primary px-4 py-2 rounded-lg font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow">Upload Scan</Link>
            <Link to="/analytics" className="btn-secondary px-4 py-2 rounded-lg font-medium text-primary-700 hover:bg-primary-100 transition-colors">Analytics</Link>
            {openChat && (
              <button
                onClick={() => openChat()}
                className="btn-secondary px-4 py-2 rounded-lg font-medium text-primary-700 hover:bg-primary-100 transition-colors flex items-center space-x-2"
                title="Chat with AI Assistant"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat</span>
              </button>
            )}
            <div className="relative ml-4" ref={dropdownRef}>
              <button
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-800 font-semibold shadow hover:bg-primary-100 transition-colors"
                onClick={() => setDropdownOpen((open) => !open)}
              >
                <span>{user.full_name ? user.full_name : user.username}</span>
                <svg className="h-4 w-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                      navigate('/login');
                    }}
                    className="block w-full text-left px-4 py-2 text-danger-600 hover:bg-danger-50 rounded-b-lg"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="px-4 py-2 rounded-lg font-medium text-primary-700 hover:bg-primary-100 transition-colors">Login</Link>
            <Link to="/signup" className="px-4 py-2 rounded-lg font-medium text-primary-700 hover:bg-primary-100 transition-colors">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar 