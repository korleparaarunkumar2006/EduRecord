import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FaXmark, FaDownload, FaFileExcel, FaFileCsv,
  FaCheckDouble, FaSquareCheck, FaSquare
} from 'react-icons/fa6';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const ALL_FIELDS = [
  { id: 'rollNumber', label: 'Roll Number', category: 'Personal' },
  { id: 'name', label: 'Student Name', category: 'Personal' },
  { id: 'admissionNo', label: 'Admission Number', category: 'Personal' },
  { id: 'admissionType', label: 'Admission Type (Regular / Lateral)', category: 'Personal' },
  { id: 'course', label: 'Course', category: 'Personal' },
  { id: 'branch', label: 'Branch / Dept', category: 'Personal' },
  { id: 'section', label: 'Section', category: 'Personal' },
  { id: 'year', label: 'Academic Year', category: 'Personal' },
  { id: 'semester', label: 'Semester', category: 'Personal' },
  { id: 'dob', label: 'Date of Birth', category: 'Personal' },
  { id: 'gender', label: 'Gender', category: 'Personal' },
  { id: 'religion', label: 'Religion', category: 'Personal' },
  { id: 'nationality', label: 'Nationality', category: 'Personal' },

  { id: 'gpa', label: 'CGPA', category: 'Academic' },
  { id: 'marksPercentage', label: 'Marks Percentage %', category: 'Academic' },
  { id: 'attendance', label: 'Attendance %', category: 'Academic' },

  { id: 'sscBoard', label: '10th (SSC) Board', category: 'Qualifications' },
  { id: 'sscHtNo', label: '10th Hall Ticket No', category: 'Qualifications' },
  { id: 'sscYear', label: '10th Year of Passing', category: 'Qualifications' },
  { id: 'sscInstitute', label: '10th School Name', category: 'Qualifications' },
  { id: 'sscMarks', label: '10th Marks (Obtained/Max)', category: 'Qualifications' },
  { id: 'sscPercentage', label: '10th Percentage %', category: 'Qualifications' },
  { id: 'sscGradePoints', label: '10th Grade Points (CGPA)', category: 'Qualifications' },

  { id: 'interBoard', label: 'Intermediate Board', category: 'Qualifications' },
  { id: 'interHtNo', label: 'Intermediate Hall Ticket No', category: 'Qualifications' },
  { id: 'interYear', label: 'Intermediate Year of Pass', category: 'Qualifications' },
  { id: 'interInstitute', label: 'Intermediate Junior College', category: 'Qualifications' },
  { id: 'interMarks', label: 'Intermediate Marks', category: 'Qualifications' },
  { id: 'interPercentage', label: 'Intermediate Percentage %', category: 'Qualifications' },
  { id: 'interGradePoints', label: 'Intermediate CGPA', category: 'Qualifications' },

  { id: 'phone', label: 'Mobile / Phone Number', category: 'Contact' },
  { id: 'personalEmail', label: 'Personal Email', category: 'Contact' },
  { id: 'collegeEmail', label: 'College Email', category: 'Contact' },
  { id: 'adharNo', label: 'Aadhaar Number', category: 'Contact' },
  { id: 'abcId', label: 'ABC ID', category: 'Contact' },
  { id: 'bankAccNo', label: 'Bank Account Number', category: 'Contact' },

  { id: 'entranceType', label: 'Entrance Exam Type', category: 'Quota' },
  { id: 'cetRank', label: 'CET Rank', category: 'Quota' },
  { id: 'seatCategory', label: 'Seat Quota Category', category: 'Quota' },
  { id: 'reimbursement', label: 'Fee Reimbursement Status', category: 'Quota' },
  { id: 'transportHalt', label: 'Transport Halt / Bus Stop', category: 'Quota' },
  { id: 'remarks', label: 'Faculty Remarks', category: 'Quota' },

  { id: 'fatherName', label: 'Father Name', category: 'Parents' },
  { id: 'fatherOccupation', label: 'Father Occupation', category: 'Parents' },
  { id: 'fatherMobile', label: 'Father Mobile', category: 'Parents' },
  { id: 'motherName', label: 'Mother Name', category: 'Parents' },
  { id: 'motherOccupation', label: 'Mother Occupation', category: 'Parents' },
  { id: 'motherMobile', label: 'Mother Mobile', category: 'Parents' },
  { id: 'annualIncome', label: 'Parents Annual Income', category: 'Parents' },
  { id: 'permanentAddress', label: 'Permanent Address', category: 'Parents' },
];

export default function ExportModal({ students, onClose }) {
  const [format, setFormat] = useState('xlsx'); // 'xlsx' | 'csv'
  const [selectedFields, setSelectedFields] = useState(ALL_FIELDS.map(f => f.id));
  const [isExporting, setIsExporting] = useState(false);

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

  const selectAll = () => setSelectedFields(ALL_FIELDS.map(f => f.id));
  const selectNone = () => setSelectedFields(['rollNumber', 'name', 'branch', 'section', 'gpa', 'attendance']);

  const getFieldValue = (s, id) => {
    const ssc = (Array.isArray(s.educationDetails) && s.educationDetails[0]) || {};
    const inter = (Array.isArray(s.educationDetails) && s.educationDetails[1]) || {};

    if (id === 'sscBoard') return ssc.board || '';
    if (id === 'sscHtNo') return ssc.htNo || '';
    if (id === 'sscYear') return ssc.yearOfPass || '';
    if (id === 'sscInstitute') return ssc.institute || '';
    if (id === 'sscMarks') return ssc.obtainedMarks ? `${ssc.obtainedMarks}/${ssc.maxMarks || 600}` : '';
    if (id === 'sscPercentage') return ssc.percentage ? `${ssc.percentage}%` : '';
    if (id === 'sscGradePoints') return ssc.gradePoints || '';

    if (id === 'interBoard') return inter.board || '';
    if (id === 'interHtNo') return inter.htNo || '';
    if (id === 'interYear') return inter.yearOfPass || '';
    if (id === 'interInstitute') return inter.institute || '';
    if (id === 'interMarks') return inter.obtainedMarks ? `${inter.obtainedMarks}/${inter.maxMarks || 1000}` : '';
    if (id === 'interPercentage') return inter.percentage ? `${inter.percentage}%` : '';
    if (id === 'interGradePoints') return inter.gradePoints || '';

    if (['fatherName', 'fatherOccupation', 'fatherMobile', 'motherName', 'motherOccupation', 'motherMobile', 'annualIncome', 'permanentAddress'].includes(id)) {
      return (s.parentsDetails && s.parentsDetails[id]) || s[id] || '';
    }

    return s[id] !== undefined && s[id] !== null ? String(s[id]) : '';
  };

  const handleExport = () => {
    if (!students || students.length === 0) {
      toast.error('No student records available to export.');
      return;
    }
    if (selectedFields.length === 0) {
      toast.error('Please select at least one attribute to export.');
      return;
    }

    setIsExporting(true);

    try {
      const activeFieldDefs = ALL_FIELDS.filter(f => selectedFields.includes(f.id));
      const fileName = `Student_Records_Export_${new Date().toISOString().slice(0, 10)}.${format}`;

      const rows = students.map(s => {
        const row = {};
        activeFieldDefs.forEach(def => {
          row[def.label] = getFieldValue(s, def.id);
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Export');

      if (format === 'csv') {
        XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
      } else {
        XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
      }

      toast.success(`🎉 Exported ${students.length} student record(s) to ${fileName}!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate export file.');
    } finally {
      setIsExporting(false);
    }
  };

  const categories = ['Personal', 'Academic', 'Qualifications', 'Contact', 'Quota', 'Parents'];

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            <FaDownload style={{ color: 'var(--emerald)' }} /> Export Student Bio-Data Records
          </span>
          <button className="modal-close" onClick={onClose}><FaXmark /></button>
        </div>

        <div className="modal-body">
          {/* Format Selection */}
          <div className="section-title">Select File Format</div>
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

          {/* Export Scope Info */}
          <div style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--indigo-light)' }}>
                Target Dataset: {students.length} Student Record(s)
              </span>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Applies current filter, search, and branch selection criteria.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={selectAll}>
                <FaCheckDouble /> Select All ({ALL_FIELDS.length})
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={selectNone}>
                Reset to Core
              </button>
            </div>
          </div>

          {/* Fields Selection by Category */}
          <div className="section-title">Select Student Attributes to Include</div>
          {categories.map(cat => {
            const catFields = ALL_FIELDS.filter(f => f.category === cat);
            return (
              <div key={cat} style={{ marginBottom: 18 }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em'
                }}>
                  {cat} Attributes ({catFields.filter(f => selectedFields.includes(f.id)).length} / {catFields.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {catFields.map(f => {
                    const checked = selectedFields.includes(f.id);
                    return (
                      <div
                        key={f.id}
                        onClick={() => toggleField(f.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                          background: checked ? 'rgba(99,102,241,0.12)' : 'var(--bg-input)',
                          border: checked ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border-color)',
                          transition: 'all 0.15s', fontSize: 13
                        }}
                      >
                        {checked ? (
                          <FaSquareCheck style={{ color: 'var(--indigo-light)', fontSize: 16 }} />
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
            );
          })}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {selectedFields.length} attribute(s) selected
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExporting || students.length === 0 || selectedFields.length === 0}
            style={{ background: 'linear-gradient(135deg, var(--emerald), #059669)', border: 'none' }}
          >
            <FaDownload /> {isExporting ? 'Generating...' : `Export to ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
