import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaXmark, FaFloppyDisk, FaUserPlus, FaEye, FaEyeSlash, FaCloudArrowUp, FaLink, FaTrash } from 'react-icons/fa6';
import { createFaculty, updateFaculty } from '../api';
import { normalizePhotoUrl, handleImageError } from '../utils/imageHelper';
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
    photoUrl: faculty?.photoUrl || '',
    password: '',
    hasChangedPassword: faculty?.hasChangedPassword ?? false,
  });
  const [photoMode, setPhotoMode] = useState(
    faculty && faculty.photoUrl && faculty.photoUrl.startsWith('data:') ? 'upload' : 'url'
  );
  const photoRef = useRef(null);

  const [showPwd, setShowPwd] = useState(false);
  const [changePwd, setChangePwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be under 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { set('photoUrl', ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.facultyId || !form.name) { toast.error('Faculty ID and Name are required.'); return; }
    if (!isEdit && !form.password) { toast.error('Password is required for new faculty.'); return; }
    if (isEdit && changePwd && form.password && form.password.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        photoUrl: normalizePhotoUrl(form.photoUrl)
      };
      if (isEdit) {
        if (!changePwd || !payload.password) delete payload.password;
      }

      let savedFaculty;
      if (isEdit) {
        const res = await updateFaculty(faculty._id || faculty.facultyId, payload);
        savedFaculty = res.data?.faculty;
        toast.success(`Faculty "${form.name}" updated!`);
      } else {
        const res = await createFaculty(payload);
        savedFaculty = res.data?.faculty;
        toast.success(`Faculty "${form.name}" created!`);
      }
      onSaved(savedFaculty || payload);
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

              {/* Photo Input Field */}
              <div className="form-group form-full">
                <label className="form-label">Faculty Photo</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <button type="button" className={`btn btn-sm ${photoMode === 'upload' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPhotoMode('upload')}>
                    <FaCloudArrowUp /> Upload Photo
                  </button>
                  <button type="button" className={`btn btn-sm ${photoMode === 'url' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPhotoMode('url')}>
                    <FaLink /> Paste URL
                  </button>
                </div>
                {photoMode === 'upload' && (
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 70, height: 70, borderRadius: 12, flexShrink: 0,
                        background: form.photoUrl ? 'transparent' : 'var(--bg-input)',
                        border: '2px dashed var(--border-color)',
                        overflow: 'hidden', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 24, cursor: 'pointer',
                      }}
                      onClick={() => photoRef.current?.click()}
                    >
                      {form.photoUrl ? (
                        <img
                          src={normalizePhotoUrl(form.photoUrl)}
                          alt="preview"
                          referrerPolicy="no-referrer"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => handleImageError(e, form.name)}
                        />
                      ) : '👨‍🏫'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                      <button type="button" className="btn btn-outline-indigo btn-sm" onClick={() => photoRef.current?.click()} style={{ marginBottom: 8 }}>
                        <FaCloudArrowUp /> Choose Photo
                      </button>
                      {form.photoUrl && (
                        <button type="button" className="btn btn-outline-rose btn-sm" onClick={() => set('photoUrl', '')}>
                          <FaTrash /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {photoMode === 'url' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {form.photoUrl && (
                        <img
                          src={normalizePhotoUrl(form.photoUrl)}
                          alt="preview"
                          referrerPolicy="no-referrer"
                          style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0 }}
                          onError={(e) => handleImageError(e, form.name)}
                        />
                      )}
                      <input
                        className="form-input"
                        value={form.photoUrl}
                        onChange={e => {
                          const val = e.target.value;
                          set('photoUrl', normalizePhotoUrl(val));
                        }}
                        placeholder="Paste image URL (Google Drive, Dropbox, web image...)"
                        style={{ flex: 1 }}
                      />
                      {form.photoUrl && (
                        <button type="button" className="btn btn-outline-rose btn-sm" onClick={() => set('photoUrl', '')} title="Clear photo">
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Password Section */}
            {isEdit ? (
              <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Password Security</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {changePwd ? 'Enter a new password below to update.' : 'Password is secure and protected.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${changePwd ? 'btn-outline-rose' : 'btn-outline-indigo'}`}
                    onClick={() => {
                      setChangePwd(p => !p);
                      set('password', '');
                    }}
                  >
                    {changePwd ? 'Cancel' : 'Edit Password'}
                  </button>
                </div>

                {changePwd && (
                  <div className="form-group" style={{ marginTop: 14 }}>
                    <label className="form-label">New Password *</label>
                    <div className="password-wrapper">
                      <input
                        className="form-input"
                        type={showPwd ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => set('password', e.target.value)}
                        placeholder="Enter new password (min 6 characters)"
                        autoComplete="new-password"
                        autoFocus
                      />
                      <button type="button" className="btn-eye" onClick={() => setShowPwd(p => !p)}>
                        {showPwd ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <div className="section-title">Set Password *</div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div className="password-wrapper">
                    <input
                      className="form-input"
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="Min 6 characters"
                      autoComplete="new-password"
                      required
                    />
                    <button type="button" className="btn-eye" onClick={() => setShowPwd(p => !p)}>
                      {showPwd ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
