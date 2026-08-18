import React from 'react';
import {
  FaArrowLeft, FaChalkboardUser, FaEnvelope, FaPhone,
  FaBuildingUser, FaUserTie, FaShieldHalved, FaKey,
  FaPenToSquare, FaTrash, FaCheck, FaXmark
} from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';

export default function FacultyDetailPage({ faculty, onBack, onEdit, onDelete }) {
  const { faculty: me } = useAuth();
  if (!faculty) return null;

  const isAdmin = me?.role === 'admin';
  const isSelf = me?.facultyId === faculty.facultyId;

  return (
    <div className="fade-in">
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button className="btn btn-outline" onClick={onBack}>
          <FaArrowLeft /> Back to Faculty List
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => onEdit(faculty)}>
              <FaPenToSquare /> Edit Faculty Profile
            </button>
          )}
          {isAdmin && !isSelf && (
            <button className="btn btn-outline-rose" onClick={() => onDelete(faculty)}>
              <FaTrash /> Delete Account
            </button>
          )}
        </div>
      </div>

      {/* Hero Banner */}
      <div className="detail-hero">
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 20,
            background: 'linear-gradient(135deg, var(--purple), var(--indigo))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 44,
            color: '#fff',
            flexShrink: 0,
            boxShadow: 'var(--shadow-indigo)'
          }}
        >
          🎓
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>{faculty.name}</h1>
            <span className={`badge ${faculty.role === 'admin' ? 'badge-admin' : 'badge-faculty'}`}>
              <FaShieldHalved /> {faculty.role === 'admin' ? 'System Admin' : 'Faculty'}
            </span>
          </div>

          <div style={{ fontSize: 14, color: 'var(--indigo-light)', fontWeight: 700, marginBottom: 8 }}>
            Faculty ID: {faculty.facultyId}
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
            <span><FaBuildingUser style={{ color: 'var(--indigo-light)', marginRight: 6 }} /> {faculty.department}</span>
            <span><FaUserTie style={{ color: 'var(--purple)', marginRight: 6 }} /> {faculty.designation}</span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Contact Information */}
        <div className="card">
          <div className="section-title"><FaEnvelope style={{ color: 'var(--indigo)' }} /> Contact Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="stat-icon indigo" style={{ width: 40, height: 40, fontSize: 18 }}><FaEnvelope /></div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Email Address</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{faculty.email || 'Not provided'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="stat-icon emerald" style={{ width: 40, height: 40, fontSize: 18 }}><FaPhone /></div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Phone Number</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{faculty.phoneNumber || 'Not provided'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Academic & Department Details */}
        <div className="card">
          <div className="section-title"><FaBuildingUser style={{ color: 'var(--purple)' }} /> Role & Department</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Department:</span>
              <span style={{ fontWeight: 700 }}>{faculty.department}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Designation:</span>
              <span style={{ fontWeight: 700 }}>{faculty.designation}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>System Role:</span>
              <span style={{ fontWeight: 700, textTransform: 'uppercase', color: faculty.role === 'admin' ? 'var(--purple)' : 'var(--indigo-light)' }}>
                {faculty.role}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Password Status */}
        <div className="card">
          <div className="section-title"><FaKey style={{ color: 'var(--amber)' }} /> Security Status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>One-Time Password Changed:</span>
              <span className={`badge ${faculty.hasChangedPassword ? 'badge-emerald' : 'badge-amber'}`}>
                {faculty.hasChangedPassword ? <><FaCheck /> Changed</> : <><FaXmark /> Default Password</>}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Authentication Mode:</span>
              <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>High Security JWT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
