import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaXmark, FaFloppyDisk, FaUserPlus, FaEye, FaEyeSlash } from 'react-icons/fa6';
import { createFaculty, updateFaculty } from '../api';
import toast from 'react-hot-toast';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Computer Science & Technology',
  'Artificial Intelligence & Machine Learning',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Data Science',
];
const DESIGNATIONS = [
  'Professor', 'Associate Professor', 'Assistant Professor',
  'HOD', 'Senior Lecturer', 'Lecturer', 'Lab Instructor'
];

export default function FacultyModal({ faculty, onClose, onSaved }) {
  const isEdit = !!faculty;

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);
  const [form, setForm] = useState({
    facultyId: faculty?.facultyId || '',
    name: faculty?.name || '',
    email: faculty?.email || '',
    phoneNumber: faculty?.phoneNumber || '',
    department: faculty?.department || DEPARTMENTS[0],
    designation: faculty?.designation || DESIGNATIONS[1],
    role: faculty?.role || 'faculty',
    password: '',
    hasChangedPassword: faculty?.hasChangedPassword ?? false,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.facultyId || !form.name) { toast.error('Faculty ID and Name are required.'); return; }
    if (!isEdit && !form.password) { toast.error('Password is required for new faculty.'); return; }
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;

      if (isEdit) {
        await updateFaculty(faculty._id || faculty.facultyId, payload);
        toast.success(`Faculty "${form.name}" updated!`);
      } else {
        await createFaculty(payload);
        toast.success(`Faculty "${form.name}" created!`);
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title"><FaUserPlus /> {isEdit ? `Edit: ${faculty.name}` : 'Add New Faculty'}</span>
          <button className="modal-close" onClick={onClose}><FaXmark /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            <div className="section-title">Faculty Information</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Faculty ID *</label>
                <input className="form-input" value={form.facultyId} onChange={e => set('facultyId', e.target.value)} required disabled={isEdit} placeholder="e.g. CSE-ADM-001" style={isEdit ? { opacity: 0.6 } : {}} />
              </div>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="faculty@institution.ac.in" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" type="tel" value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} placeholder="Mobile number" />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <select className="form-select" value={form.designation} onChange={e => set('designation', e.target.value)}>
                  {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin (HOD)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Password Changed?</label>
                <select className="form-select" value={form.hasChangedPassword ? 'true' : 'false'} onChange={e => set('hasChangedPassword', e.target.value === 'true')}>
                  <option value="false">No — Can still change password</option>
                  <option value="true">Yes — Locked (Admin only reset)</option>
                </select>
              </div>
            </div>

            <div className="section-title" style={{ marginTop: 16 }}>{isEdit ? 'Reset Password (leave blank to keep)' : 'Set Password *'}</div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-wrapper">
                <input
                  className="form-input"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder={isEdit ? 'Leave blank to keep current password' : 'Min 6 characters'}
                  required={!isEdit}
                />
                <button type="button" className="btn-eye" onClick={() => setShowPwd(p => !p)}>
                  {showPwd ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : <><FaFloppyDisk /> {isEdit ? 'Update Faculty' : 'Create Faculty'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
