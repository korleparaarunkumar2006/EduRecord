import React, { useState, useEffect } from 'react';
import {
  FaArrowLeft, FaChalkboardUser, FaEnvelope, FaPhone,
  FaBuildingUser, FaUserTie, FaShieldHalved, FaKey,
  FaPenToSquare, FaTrash, FaCheck, FaXmark, FaEye, FaEyeSlash, FaFloppyDisk
} from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';
import { normalizePhotoUrl, handleImageError } from '../utils/imageHelper';
import { getFacultyById, updateFaculty } from '../api';
import toast from 'react-hot-toast';

export default function FacultyDetailPage({ faculty: initialFaculty, onBack, onEdit, onDelete }) {
  const { faculty: me } = useAuth();
  const [faculty, setFaculty] = useState(initialFaculty);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ password: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    setFaculty(initialFaculty);
    const fid = initialFaculty?._id || initialFaculty?.facultyId;
    if (fid) {
      getFacultyById(fid)
        .then(res => {
          if (res.data?.success && res.data?.faculty) {
            setFaculty(res.data.faculty);
          }
        })
        .catch(() => { });
    }
  }, [initialFaculty]);

  if (!faculty) return null;

  const isAdmin = me?.role === 'admin';
  const isSelf = me?.facultyId === faculty.facultyId;

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!pwdForm.password) {
      toast.error('Please enter a new password.');
      return;
    }
    if (pwdForm.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (pwdForm.password !== pwdForm.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      await updateFaculty(faculty._id || faculty.facultyId, { password: pwdForm.password });
      toast.success(`Password for ${faculty.name} updated successfully!`);
      setPasswordModalOpen(false);
      setPwdForm({ password: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button className="btn btn-outline" onClick={onBack}>
          <FaArrowLeft /> Back to Faculty List
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && !isSelf && (
            <button className="btn btn-outline-rose" onClick={() => onDelete(faculty)}>
              <FaTrash /> Delete Account
            </button>
          )}
        </div>
      </div>

      {/* Hero Banner */}
      <div className="detail-hero">
        {faculty?.photoUrl ? (
          <img
            src={normalizePhotoUrl(faculty.photoUrl)}
            alt={faculty.name}
            referrerPolicy="no-referrer"
            style={{
              width: 90,
              height: 90,
              borderRadius: 18,
              objectFit: 'cover',
              border: '2px solid #cbd5e1',
              flexShrink: 0,
              boxShadow: 'var(--shadow-sm)',
              background: '#fff'
            }}
            onError={(e) => handleImageError(e, faculty.name)}
          />
        ) : (
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: 18,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              color: '#0f172a',
              flexShrink: 0,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            👨‍🏫
          </div>
        )}

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
          <div className="section-title"> Contact Details</div>
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
          <div className="section-title"> Role & Department</div>
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
          <div className="section-title"> Security & Access</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>


            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Account Status:</span>
              <span className="badge badge-emerald">
                <FaCheck /> Active & Verified
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Authentication Mode:</span>
              <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>High Security JWT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Password Modal */}
      {passwordModalOpen && (
        <div className="modal-overlay" onClick={() => setPasswordModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><FaKey /> Edit Faculty Password</span>
              <button className="modal-close" onClick={() => setPasswordModalOpen(false)}><FaXmark /></button>
            </div>
            <form onSubmit={handlePasswordSave}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Set a new secure password for <strong>{faculty.name}</strong> ({faculty.facultyId}).
                </p>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">New Password *</label>
                  <div className="password-wrapper">
                    <input
                      className="form-input"
                      type={showPwd ? 'text' : 'password'}
                      value={pwdForm.password}
                      onChange={e => setPwdForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Minimum 6 characters"
                      autoComplete="new-password"
                      required
                    />
                    <button type="button" className="btn-eye" onClick={() => setShowPwd(p => !p)}>
                      {showPwd ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password *</label>
                  <input
                    className="form-input"
                    type={showPwd ? 'text' : 'password'}
                    value={pwdForm.confirmPassword}
                    onChange={e => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setPasswordModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={pwdLoading}>
                  {pwdLoading ? 'Updating...' : <><FaFloppyDisk /> Update Password</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
