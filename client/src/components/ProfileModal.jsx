import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FaUserGear, FaXmark, FaFloppyDisk, FaIdBadge,
  FaBuilding, FaBriefcase, FaPhone, FaEnvelope, FaKey, FaEye, FaEyeSlash
} from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api';
import toast from 'react-hot-toast';

export default function ProfileModal({ onClose }) {
  const { faculty, login, updateFacultyData } = useAuth();
  const token = sessionStorage.getItem('edurecord_token') || localStorage.getItem('edurecord_token');

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const [form, setForm] = useState({
    name: faculty?.name || '',
    email: faculty?.email || '',
    phoneNumber: faculty?.phoneNumber || '',
    department: faculty?.department || '',
    designation: faculty?.designation || '',
    password: '',
    confirmPassword: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = faculty?.role === 'admin';
  const canChangePassword = isAdmin || !faculty?.hasChangedPassword;

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (form.password && form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phoneNumber: form.phoneNumber,
      };
      if (isAdmin) {
        payload.department = form.department;
        payload.designation = form.designation;
      }
      if (form.password) payload.password = form.password;

      const res = await updateProfile(payload);
      if (res.data.success) {
        if (res.data.token) {
          login(res.data.token, res.data.faculty);
        } else {
          updateFacultyData(res.data.faculty);
        }
        toast.success('Profile updated successfully!');
        onClose();
      } else {
        toast.error(res.data.message || 'Update failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title"><FaUserGear /> My Profile & Security</span>
          <button className="modal-close" onClick={onClose}><FaXmark /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Hero */}
            <div className="profile-hero">
              <div className="profile-avatar"><FaUserGear /></div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{faculty?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{faculty?.facultyId}</div>
                <span className={`badge mt-2 ${faculty?.role === 'admin' ? 'badge-admin' : 'badge-faculty'}`}>
                  {faculty?.role === 'admin' ? '● Admin (HOD)' : '● Faculty Member'}
                </span>
              </div>
            </div>

            <div className="section-title"><FaIdBadge /> Personal Information</div>
            <div className="form-grid mb-3">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label"><FaIdBadge /> Faculty ID</label>
                <input className="form-input" value={faculty?.facultyId || ''} disabled style={{ opacity: 0.5 }} />
              </div>
              <div className="form-group">
                <label className="form-label"><FaEnvelope /> Email</label>
                <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label"><FaPhone /> Phone</label>
                <input className="form-input" type="tel" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} />
              </div>
            </div>

            {isAdmin && (
              <>
                <div className="section-title"><FaBuilding /> Department Info</div>
                <div className="form-grid mb-3">
                  <div className="form-group">
                    <label className="form-label"><FaBuilding /> Department</label>
                    <input className="form-input" name="department" value={form.department} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label"><FaBriefcase /> Designation</label>
                    <input className="form-input" name="designation" value={form.designation} onChange={handleChange} />
                  </div>
                </div>
              </>
            )}

            <div className="section-title"><FaKey /> Change Password</div>
            {!canChangePassword && (
              <div style={{
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 12,
                fontSize: 13, color: 'var(--amber)'
              }}>
                ⚠️ You've already used your one-time password change. Contact an Admin to reset.
              </div>
            )}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="password-wrapper">
                  <input
                    className="form-input"
                    type={showPwd ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={!canChangePassword}
                    placeholder="Leave blank to keep current"
                  />
                  <button type="button" className="btn-eye" onClick={() => setShowPwd(p => !p)}>
                    {showPwd ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  className="form-input"
                  type={showPwd ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  disabled={!canChangePassword}
                  placeholder="Re-enter new password"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : <><FaFloppyDisk /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
