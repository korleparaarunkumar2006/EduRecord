import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaXmark, FaSliders, FaRotateLeft, FaCheck, FaStar, FaTriangleExclamation, FaBus } from 'react-icons/fa6';

export const DEFAULT_SMART_FILTERS = {
  minCgpa: 0,
  maxCgpa: 10,
  minAttendance: 0,
  maxAttendance: 100,
  minMarks: 0,
  maxMarks: 100,
  branch: 'ALL',
  section: 'ALL',
  year: 'ALL',
  semester: 'ALL',
  admissionType: 'ALL',
  gender: 'ALL',
  seatCategory: 'ALL',
  entranceType: 'ALL',
  transportHalt: 'ALL',
  preset: null,
};

export default function SmartFilterModal({ filters, onApply, onClose, onReset }) {
  const [localFilters, setLocalFilters] = useState(filters || DEFAULT_SMART_FILTERS);

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const set = (key, val) => {
    setLocalFilters(p => ({ ...p, [key]: val, preset: null }));
  };

  const applyPreset = (presetName) => {
    if (presetName === 'highPerformers') {
      setLocalFilters({
        ...DEFAULT_SMART_FILTERS,
        minCgpa: 8.5,
        preset: 'High Performers (CGPA ≥ 8.5)'
      });
    } else if (presetName === 'lowAttendance') {
      setLocalFilters({
        ...DEFAULT_SMART_FILTERS,
        maxAttendance: 74,
        preset: 'Low Attendance (< 75%)'
      });
    } else if (presetName === 'regularConvenor') {
      setLocalFilters({
        ...DEFAULT_SMART_FILTERS,
        admissionType: 'Regular',
        seatCategory: 'CONVENOR',
        preset: 'Regular Convenor'
      });
    } else if (presetName === 'lateralEntry') {
      setLocalFilters({
        ...DEFAULT_SMART_FILTERS,
        admissionType: 'Lateral Entry',
        preset: 'Lateral Entry'
      });
    } else if (presetName === 'managementQuota') {
      setLocalFilters({
        ...DEFAULT_SMART_FILTERS,
        seatCategory: 'MANAGEMENT',
        preset: 'Management Quota'
      });
    }
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_SMART_FILTERS);
    onReset();
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const SEMESTER_OPTIONS = [
    { value: 'I Semester', label: '1st Year: I Semester (1)' },
    { value: 'II Semester', label: '1st Year: II Semester (2)' },
    { value: 'III Semester', label: '2nd Year: III Semester (3)' },
    { value: 'IV Semester', label: '2nd Year: IV Semester (4)' },
    { value: 'V Semester', label: '3rd Year: V Semester (5)' },
    { value: 'VI Semester', label: '3rd Year: VI Semester (6)' },
    { value: 'VII Semester', label: '4th Year: VII Semester (7)' },
    { value: 'VIII Semester', label: '4th Year: VIII Semester (8)' },
  ];

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            <FaSliders style={{ color: 'var(--indigo)' }} /> Dynamic Smart Filter Engine
          </span>
          <button className="modal-close" onClick={onClose}><FaXmark /></button>
        </div>

        <div className="modal-body">
          {/* Quick Presets Bar */}
          <div className="section-title">⚡ Quick Smart Presets</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
            <button
              type="button"
              className={`btn ${localFilters.preset?.includes('High Performers') ? 'btn-amber' : 'btn-outline'}`}
              onClick={() => applyPreset('highPerformers')}
              style={{ justifyContent: 'center', padding: '9px 10px', fontSize: 13 }}
            >
              <FaStar /> High Performers (≥8.5)
            </button>
            <button
              type="button"
              className={`btn ${localFilters.preset?.includes('Low Attendance') ? 'btn-rose' : 'btn-outline'}`}
              onClick={() => applyPreset('lowAttendance')}
              style={{ justifyContent: 'center', padding: '9px 10px', fontSize: 13 }}
            >
              <FaTriangleExclamation /> Low Attendance (&lt;75%)
            </button>
            <button
              type="button"
              className={`btn ${localFilters.preset === 'Regular Convenor' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => applyPreset('regularConvenor')}
              style={{ justifyContent: 'center', padding: '9px 10px', fontSize: 13 }}
            >
              🎓 Regular Convenor
            </button>
            <button
              type="button"
              className={`btn ${localFilters.preset === 'Lateral Entry' ? 'btn-emerald' : 'btn-outline'}`}
              onClick={() => applyPreset('lateralEntry')}
              style={{ justifyContent: 'center', padding: '9px 10px', fontSize: 13 }}
            >
              🚀 Lateral Entry
            </button>
            <button
              type="button"
              className={`btn ${localFilters.preset === 'Management Quota' ? 'btn-outline-indigo' : 'btn-outline'}`}
              onClick={() => applyPreset('managementQuota')}
              style={{ justifyContent: 'center', padding: '9px 10px', fontSize: 13 }}
            >
              🎟️ Management Quota
            </button>
          </div>

          {/* Academic Metric Sliders & Ranges */}
          <div className="section-title">📊 Academic Performance Thresholds</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 22 }}>
            {/* CGPA Range */}
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--indigo-light)', fontSize: 13 }}>CGPA Range</span>
                <span style={{ fontWeight: 800, fontSize: 12 }}>
                  {localFilters.minCgpa} – {localFilters.maxCgpa}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number" step="0.1" min="0" max="10"
                  className="form-input"
                  value={localFilters.minCgpa}
                  onChange={e => set('minCgpa', parseFloat(e.target.value) || 0)}
                  placeholder="Min" style={{ textAlign: 'center' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>to</span>
                <input
                  type="number" step="0.1" min="0" max="10"
                  className="form-input"
                  value={localFilters.maxCgpa}
                  onChange={e => set('maxCgpa', parseFloat(e.target.value) || 10)}
                  placeholder="Max" style={{ textAlign: 'center' }}
                />
              </div>
            </div>

            {/* Attendance Range */}
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--amber)', fontSize: 13 }}>Attendance % Range</span>
                <span style={{ fontWeight: 800, fontSize: 12 }}>
                  {localFilters.minAttendance}% – {localFilters.maxAttendance}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number" step="1" min="0" max="100"
                  className="form-input"
                  value={localFilters.minAttendance}
                  onChange={e => set('minAttendance', parseFloat(e.target.value) || 0)}
                  placeholder="Min %" style={{ textAlign: 'center' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>to</span>
                <input
                  type="number" step="1" min="0" max="100"
                  className="form-input"
                  value={localFilters.maxAttendance}
                  onChange={e => set('maxAttendance', parseFloat(e.target.value) || 100)}
                  placeholder="Max %" style={{ textAlign: 'center' }}
                />
              </div>
            </div>

            {/* Marks Range */}
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--emerald)', fontSize: 13 }}>Marks % Range</span>
                <span style={{ fontWeight: 800, fontSize: 12 }}>
                  {localFilters.minMarks}% – {localFilters.maxMarks}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number" step="1" min="0" max="100"
                  className="form-input"
                  value={localFilters.minMarks}
                  onChange={e => set('minMarks', parseFloat(e.target.value) || 0)}
                  placeholder="Min %" style={{ textAlign: 'center' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>to</span>
                <input
                  type="number" step="1" min="0" max="100"
                  className="form-input"
                  value={localFilters.maxMarks}
                  onChange={e => set('maxMarks', parseFloat(e.target.value) || 100)}
                  placeholder="Max %" style={{ textAlign: 'center' }}
                />
              </div>
            </div>
          </div>

          {/* Categorical Dropdowns */}
          <div className="section-title">🏷️ Class & Admission Attributes</div>
          <div className="form-grid-3 mb-3">
            <div className="form-group">
              <label className="form-label">Branch</label>
              <select className="form-select" value={localFilters.branch} onChange={e => set('branch', e.target.value)}>
                <option value="ALL">All Branches</option>
                {['CSE','CST','AIML','CAI','DS','ECE','ECT','EEE','MEC','CIVIL','IT'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="form-select" value={localFilters.section} onChange={e => set('section', e.target.value)}>
                <option value="ALL">All Sections</option>
                {['A','B','C','D','E'].map(s => (
                  <option key={s} value={s}>Section {s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Year of Study</label>
              <select className="form-select" value={localFilters.year} onChange={e => set('year', e.target.value)}>
                <option value="ALL">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Semester</label>
              <select className="form-select" value={localFilters.semester} onChange={e => set('semester', e.target.value)}>
                <option value="ALL">All Semesters</option>
                {SEMESTER_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Admission Type</label>
              <select className="form-select" value={localFilters.admissionType} onChange={e => set('admissionType', e.target.value)}>
                <option value="ALL">All Admission Types</option>
                <option value="Regular">Regular</option>
                <option value="Lateral Entry">Lateral Entry</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" value={localFilters.gender} onChange={e => set('gender', e.target.value)}>
                <option value="ALL">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {/* Extended Quota & Entrance Attributes */}
          <div className="section-title">💰 Quota & Entrance Attributes</div>
          <div className="form-grid-2 mb-3">
            <div className="form-group">
              <label className="form-label">Seat Category Quota</label>
              <select className="form-select" value={localFilters.seatCategory} onChange={e => set('seatCategory', e.target.value)}>
                <option value="ALL">All Quotas</option>
                <option value="CONVENOR">CONVENOR</option>
                <option value="MANAGEMENT">MANAGEMENT</option>
                <option value="SPOT">SPOT</option>
                <option value="NRI">NRI</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Entrance Exam Type</label>
              <select className="form-select" value={localFilters.entranceType} onChange={e => set('entranceType', e.target.value)}>
                <option value="ALL">All Entrance Exams</option>
                <option value="EAPCET">EAPCET</option>
                <option value="ECET">ECET</option>
                <option value="ICET">ICET</option>
                <option value="PGECET">PGECET</option>
                <option value="SPOT">SPOT</option>
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline-rose" onClick={handleReset}>
            <FaRotateLeft /> Reset Rules
          </button>
          <button type="button" className="btn btn-primary" onClick={handleApply}>
            <FaCheck /> Apply Smart Filters
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
