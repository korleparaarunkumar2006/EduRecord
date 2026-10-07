import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaGraduationCap, FaBars, FaXmark, FaRightFromBracket,
  FaHouse, FaUsers, FaChalkboardUser, FaUserGear
} from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ProfileModal from './ProfileModal';
import { normalizePhotoUrl, handleImageError } from '../utils/imageHelper';

export default function Navbar() {
  const { faculty, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  const tabs = [
    { path: '/', label: 'Dashboard', icon: <FaHouse /> },
    { path: '/students', label: 'Students', icon: <FaUsers /> },
    ...(faculty?.role === 'admin'
      ? [{ path: '/faculty', label: 'Faculty', icon: <FaChalkboardUser /> }]
      : []),
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav className="navbar">
        {/* Brand */}
        <div className="nav-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="nav-logo"><FaGraduationCap /></div>
          <div>
            <div className="nav-title">EduRecord</div>
            <div className="nav-subtitle">Student Information System</div>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="nav-tabs">
          {tabs.map(t => (
            <button
              key={t.path}
              className={`nav-tab ${isActive(t.path) ? 'active' : ''}`}
              onClick={() => navigate(t.path)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Right Side */}
        <div className="nav-right">

          {/* Faculty Pill */}
          <div className="faculty-pill" onClick={() => setProfileOpen(true)}>
            {faculty?.photoUrl ? (
              <img
                src={normalizePhotoUrl(faculty.photoUrl)}
                alt={faculty.name}
                referrerPolicy="no-referrer"
                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1', flexShrink: 0 }}
                onError={(e) => handleImageError(e, faculty.name)}
              />
            ) : (
              <div className="faculty-pill-avatar" style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}>
                <FaUserGear />
              </div>
            )}
            <div>
              <div className="faculty-pill-name">{faculty?.name || 'Faculty'}</div>
              <div className="faculty-pill-role">{faculty?.role === 'admin' ? '● Admin' : '● Faculty'}</div>
            </div>
          </div>

          <button className="btn btn-outline-rose btn-sm" onClick={handleLogout}>
            <FaRightFromBracket /> Logout
          </button>

          {/* Mobile hamburger */}
          <button
            className="btn btn-ghost btn-sm"
            style={{ display: 'none' }}
            onClick={() => setMobileOpen(p => !p)}
            id="mobile-menu-btn"
          >
            {mobileOpen ? <FaXmark /> : <FaBars />}
          </button>
        </div>
      </nav>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
        }} onClick={() => setMobileOpen(false)}>
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: '260px', background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border-color)',
            padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px',
            animation: 'slideInRight 0.25s ease'
          }} onClick={e => e.stopPropagation()}>
            {tabs.map(t => (
              <button
                key={t.path}
                className={`btn btn-block ${isActive(t.path) ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { navigate(t.path); setMobileOpen(false); }}
              >
                {t.icon} {t.label}
              </button>
            ))}
            <div style={{ height: 1, background: 'var(--border-color)', margin: '8px 0' }} />
            <button className="btn btn-outline btn-block" onClick={() => { setProfileOpen(true); setMobileOpen(false); }}>
              <FaUserGear /> My Profile
            </button>
            <button className="btn btn-outline-rose btn-block" onClick={handleLogout}>
              <FaRightFromBracket /> Logout
            </button>
          </div>
        </div>
      )}

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </>
  );
}
