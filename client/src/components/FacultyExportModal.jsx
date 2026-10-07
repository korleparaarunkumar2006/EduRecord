import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FaXmark, FaDownload, FaFileExcel, FaFileCsv,
  FaCheckDouble, FaSquareCheck, FaSquare
} from 'react-icons/fa6';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const FACULTY_FIELDS = [
  { id: 'facultyId', label: 'Faculty ID' },
  { id: 'name', label: 'Faculty Name' },
  { id: 'email', label: 'Email Address' },
  { id: 'phoneNumber', label: 'Phone Number' },
  { id: 'department', label: 'Department' },
  { id: 'designation', label: 'Designation' },
  { id: 'role', label: 'System Role' },
  { id: 'hasChangedPassword', label: 'Password Setup Status' },
  { id: 'lastLogin', label: 'Last Login' },
  { id: 'createdAt', label: 'Account Created Date' },
];

export default function FacultyExportModal({ facultyList = [], selectedFacultyList = [], onClose }) {
  const [scope, setScope] = useState(() => (selectedFacultyList && selectedFacultyList.length > 0 ? 'selected' : 'all'));
  const [format, setFormat] = useState('xlsx'); // 'xlsx' | 'csv'
  const [selectedFields, setSelectedFields] = useState(FACULTY_FIELDS.map(f => f.id));
  const [isExporting, setIsExporting] = useState(false);

  const targetFaculty = scope === 'selected' && selectedFacultyList.length > 0 ? selectedFacultyList : facultyList;

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const toggleField = (fieldId) => {
    setSelectedFields(prev =>
      prev.includes(fieldId) ? prev.filter(f => f !== fieldId) : [...prev, fieldId]
    );
  };

  const selectAll = () => setSelectedFields(FACULTY_FIELDS.map(f => f.id));
  const selectNone = () => setSelectedFields(['facultyId', 'name', 'department', 'designation', 'email']);

  const getFieldValue = (f, id) => {
    if (id === 'hasChangedPassword') {
      return f.hasChangedPassword ? 'Password Set' : 'Default Password';
    }
    if (id === 'lastLogin') {
      return f.lastLogin ? new Date(f.lastLogin).toLocaleString() : 'Never';
    }
    if (id === 'createdAt') {
      return f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '';
    }
    return f[id] !== undefined && f[id] !== null ? String(f[id]) : '';
  };

  const handleExport = () => {
    if (!targetFaculty || targetFaculty.length === 0) {
      toast.error('No faculty records available to export.');
      return;
    }
    if (selectedFields.length === 0) {
      toast.error('Please select at least one attribute to export.');
      return;
    }

    setIsExporting(true);

    try {
      const activeFieldDefs = FACULTY_FIELDS.filter(f => selectedFields.includes(f.id));
      const scopePrefix = scope === 'selected' ? 'Selected_' : '';
      const fileName = `Faculty_Records_${scopePrefix}Export_${new Date().toISOString().slice(0, 10)}.${format}`;

      const rows = targetFaculty.map(f => {
        const row = {};
        activeFieldDefs.forEach(def => {
          row[def.label] = getFieldValue(f, def.id);
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Faculty_Export');

      if (format === 'csv') {
        XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
      } else {
        XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
      }

      toast.success(`🎉 Exported ${targetFaculty.length} ${scope === 'selected' ? 'selected ' : ''}faculty record(s) to ${fileName}!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate faculty export file.');
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            <FaDownload style={{ color: 'var(--emerald)' }} /> Export Faculty Details
          </span>
          <button className="modal-close" onClick={onClose}><FaXmark /></button>
        </div>

        <div className="modal-body">
          {/* Target Scope Selection */}
          <div className="section-title">1. Export Target Scope</div>
          <div style={{ display: 'grid', gridTemplateColumns: selectedFacultyList.length > 0 ? 'repeat(2, 1fr)' : '1fr', gap: 10, marginBottom: 18 }}>
            <button
              type="button"
              className={`btn ${scope === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setScope('all')}
              style={{ padding: '12px', justifyContent: 'center', gap: 8, fontSize: 13 }}
            >
              All Matching Faculty ({facultyList.length})
            </button>
            {selectedFacultyList.length > 0 && (
              <button
                type="button"
                className={`btn ${scope === 'selected' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setScope('selected')}
                style={{ padding: '12px', justifyContent: 'center', gap: 8, fontSize: 13 }}
              >
                Selected Faculty Only ({selectedFacultyList.length})
              </button>
            )}
          </div>

          {/* Format Selection */}
          <div className="section-title">2. Select File Format</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
            <button
              type="button"
              className={`btn ${format === 'xlsx' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFormat('xlsx')}
              style={{ padding: '14px', justifyContent: 'center', gap: 8, fontSize: 13 }}
            >
              <FaFileExcel style={{ fontSize: 18, color: format === 'xlsx' ? '#fff' : 'var(--emerald)' }} />
              Excel Sheet (.xlsx)
            </button>
            <button
              type="button"
              className={`btn ${format === 'csv' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFormat('csv')}
              style={{ padding: '14px', justifyContent: 'center', gap: 8, fontSize: 13 }}
            >
              <FaFileCsv style={{ fontSize: 18, color: format === 'csv' ? '#fff' : 'var(--sky)' }} />
              CSV File (.csv)
            </button>
          </div>

          {/* Dataset Info Box */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                Target: {targetFaculty.length} Faculty Member(s) {scope === 'selected' ? '(Selected Only)' : '(All Filtered)'}
              </span>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {scope === 'selected'
                  ? `Exporting only the ${selectedFacultyList.length} faculty members selected.`
                  : 'Applies current department and designation filters.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={selectAll}>
                <FaCheckDouble /> Select All
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={selectNone}>
                Core Fields
              </button>
            </div>
          </div>

          {/* Fields Selection */}
          <div className="section-title">3. Select Faculty Attributes to Include</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 10 }}>
            {FACULTY_FIELDS.map(f => {
              const checked = selectedFields.includes(f.id);
              return (
                <div
                  key={f.id}
                  onClick={() => toggleField(f.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    background: checked ? 'rgba(79,70,229,0.08)' : 'var(--bg-input)',
                    border: checked ? '1px solid #4f46e5' : '1px solid var(--border-color)',
                    transition: 'all 0.15s', fontSize: 13
                  }}
                >
                  {checked ? (
                    <FaSquareCheck style={{ color: '#4f46e5', fontSize: 16 }} />
                  ) : (
                    <FaSquare style={{ color: 'var(--text-muted)', fontSize: 16 }} />
                  )}
                  <span style={{ fontWeight: checked ? 600 : 400, color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {f.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {selectedFields.length} field(s) selected
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExporting || targetFaculty.length === 0 || selectedFields.length === 0}
            style={{ background: 'linear-gradient(135deg, var(--emerald), #059669)', border: 'none' }}
          >
            <FaDownload /> {isExporting ? 'Generating...' : `Export ${targetFaculty.length} Record(s) to ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
