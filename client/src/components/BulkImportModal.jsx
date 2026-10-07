import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FaXmark, FaFileImport, FaDownload, FaFileExcel,
  FaFileCsv, FaCloudArrowUp, FaTrash
} from 'react-icons/fa6';
import * as XLSX from 'xlsx';
import { bulkImportStudents } from '../api';
import toast from 'react-hot-toast';

export default function BulkImportModal({ onClose, onDone }) {
  const [mode, setMode] = useState('BOTH');
  const [inputMethod, setInputMethod] = useState('file'); // 'file' | 'paste'
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [parsedStudents, setParsedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const [showAttrGuide, setShowAttrGuide] = useState(false);

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const STUDENT_ATTRIBUTES = [
    // Personal Details
    { id: 'rollNumber', label: 'Roll Number / Hall Ticket', category: 'Personal', required: true, example: '24A81A0629', desc: 'Unique student identifier (Mandatory)' },
    { id: 'name', label: 'Student Full Name', category: 'Personal', required: true, example: 'K. ARUN KUMAR', desc: 'Full student name in capital letters' },
    { id: 'admissionNo', label: 'Admission Number', category: 'Personal', required: false, example: '047/CST/2024', desc: 'College admission register number' },
    { id: 'admissionType', label: 'Admission Type', category: 'Personal', required: false, example: 'Regular', desc: 'Regular or Lateral Entry' },
    { id: 'course', label: 'Course / Degree', category: 'Personal', required: false, example: 'B.Tech', desc: 'e.g. B.Tech' },
    { id: 'branch', label: 'Branch / Dept', category: 'Personal', required: true, example: 'CST', desc: 'CSE, CST, AIML, CAI, DS, ECE, ECT, EEE, MEC, CIVIL, IT' },
    { id: 'section', label: 'Section', category: 'Personal', required: false, example: 'A', desc: 'A, B, C, D, or E' },
    { id: 'year', label: 'Academic Year', category: 'Personal', required: false, example: '3', desc: '1, 2, 3, or 4' },
    { id: 'semester', label: 'Semester', category: 'Personal', required: false, example: 'V Semester', desc: 'Current semester' },
    { id: 'dob', label: 'Date of Birth', category: 'Personal', required: false, example: '10/05/2006', desc: 'DD/MM/YYYY or YYYY-MM-DD' },
    { id: 'gender', label: 'Gender', category: 'Personal', required: false, example: 'Male', desc: 'Male or Female' },
    { id: 'religion', label: 'Religion', category: 'Personal', required: false, example: 'Hindu', desc: 'Hindu, Muslim, Christian, etc.' },
    { id: 'nationality', label: 'Nationality', category: 'Personal', required: false, example: 'Indian', desc: 'Nationality of student' },

    // Academic & Eligibility
    { id: 'gpa', label: 'CGPA', category: 'Academic', required: false, example: '8.8', desc: 'Cumulative Grade Point Average (0.0 - 10.0)' },
    { id: 'marksPercentage', label: 'Marks Percentage %', category: 'Academic', required: false, example: '88.0', desc: 'Aggregate score percentage (0 - 100)' },
    { id: 'attendance', label: 'Attendance %', category: 'Academic', required: false, example: '91.5', desc: 'Attendance percentage (0 - 100)' },

    // Contact & Identity
    { id: 'phone', label: 'Student Mobile / Phone', category: 'Contact', required: false, example: '9573471715', desc: '10-digit primary student contact number' },
    { id: 'personalEmail', label: 'Personal Email', category: 'Contact', required: false, example: 'korleparaarunkumar@gmail.com', desc: 'Personal email address' },
    { id: 'collegeEmail', label: 'College Email', category: 'Contact', required: false, example: '24a81a0629@sves.org.in', desc: 'Institutional email address' },
    { id: 'adharNo', label: 'Aadhaar Card No', category: 'Contact', required: false, example: '892192096038', desc: '12-digit Aadhaar UID number' },
    { id: 'abcId', label: 'ABC ID', category: 'Contact', required: false, example: '255692439187', desc: 'Academic Bank of Credits ID' },
    { id: 'bankAccNo', label: 'Bank Account Number', category: 'Contact', required: false, example: '061010023000096', desc: 'Bank account number' },

    // Quota, Admission & Campus
    { id: 'entranceType', label: 'Entrance Exam Type', category: 'Quota', required: false, example: 'EAPCET', desc: 'EAPCET, ECET, JEE, Management' },
    { id: 'cetRank', label: 'CET Rank', category: 'Quota', required: false, example: '25778', desc: 'Competitive exam rank' },
    { id: 'seatCategory', label: 'Seat Quota Category', category: 'Quota', required: false, example: 'CONVENOR', desc: 'CONVENOR, MANAGEMENT, NRI, SPOT' },
    { id: 'reimbursement', label: 'Fee Reimbursement', category: 'Quota', required: false, example: 'Yes', desc: 'Yes or No' },
    { id: 'transportHalt', label: 'Transport Halt / Bus Stop', category: 'Quota', required: false, example: 'VELAGADURRU (Route: THATIPARRU-5)', desc: 'College bus boarding location' },
    { id: 'remarks', label: 'Faculty Remarks', category: 'Quota', required: false, example: 'Good academic performance', desc: 'Faculty/Mentor comments' },
    { id: 'photoUrl', label: 'Photo Link / URL', category: 'Quota', required: false, example: 'https://...', desc: 'Direct URL to student portrait photo' },

    // Parents & Address
    { id: 'fatherName', label: 'Father Name', category: 'Parents', required: false, example: 'KORLEPARA SATYA KRISHNA', desc: 'Father / primary parent full name' },
    { id: 'fatherOccupation', label: 'Father Occupation', category: 'Parents', required: false, example: 'BUSINESS', desc: 'Father profession/business' },
    { id: 'fatherMobile', label: 'Father Mobile', category: 'Parents', required: false, example: '9491015348', desc: 'Parent contact mobile number' },
    { id: 'motherName', label: 'Mother Name', category: 'Parents', required: false, example: 'KORLEPARA JYOTHI', desc: 'Mother full name' },
    { id: 'motherOccupation', label: 'Mother Occupation', category: 'Parents', required: false, example: 'HOUSE WIFE', desc: 'Mother profession' },
    { id: 'motherMobile', label: 'Mother Mobile', category: 'Parents', required: false, example: '8332956270', desc: 'Mother mobile number' },
    { id: 'annualIncome', label: 'Parents Annual Income', category: 'Parents', required: false, example: '70000', desc: 'Family gross annual income in INR' },
    { id: 'permanentAddress', label: 'Permanent Address', category: 'Parents', required: false, example: '3-8/1 MAIN ROAD VELAGADURRU WEST GODAVARI AP-534227', desc: 'Full permanent residential address' },
  ];

  const templateCSV = `rollNumber,name,admissionNo,admissionType,course,branch,section,year,semester,dob,gender,religion,nationality,gpa,marksPercentage,attendance,phone,personalEmail,collegeEmail,adharNo,abcId,bankAccNo,entranceType,cetRank,seatCategory,reimbursement,transportHalt,remarks,photoUrl,fatherName,fatherOccupation,fatherMobile,motherName,motherOccupation,motherMobile,annualIncome,permanentAddress
24A81A0629,K. ARUN KUMAR,047/CST/2024,Regular,B.Tech,CST,A,3,V Semester,10/05/2006,Male,Hindu,Indian,8.8,88.0,91.5,9573471715,korleparaarunkumar@gmail.com,24a81a0629@sves.org.in,892192096038,255692439187,061010023000096,EAPCET,25778,CONVENOR,Yes,VELAGADURRU,Good academic performance,,KORLEPARA SATYA KRISHNA,BUSINESS,9491015348,KORLEPARA JYOTHI,HOUSE WIFE,8332956270,70000,3-8/1 MAIN ROAD VELAGADURRU WEST GODAVARI AP-534227
24A81A0501,SAMPLE CSE STUDENT,048/CSE/2024,Regular,B.Tech,CSE,B,2,III Semester,15/08/2005,Female,Hindu,Indian,8.2,82.5,86.0,9876543210,sample.cse@gmail.com,24a81a0501@sves.org.in,789012345678,255692439188,061010023000097,EAPCET,18450,CONVENOR,No,TADEPALLIGUDEM,Active student,,RAMA RAO,EMPLOYEE,9876543211,LAKSHMI,TEACHER,9876543212,120000,FLAT 102 BALAJI TOWERS TADEPALLIGUDEM`;

  const downloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Main Data Template with all 37 attributes and 2 sample rows
    const headers = STUDENT_ATTRIBUTES.map(a => a.id);
    const sampleRow1 = [
      '24A81A0629', 'K. ARUN KUMAR', '047/CST/2024', 'Regular', 'B.Tech', 'CST', 'A', '3', 'V Semester',
      '10/05/2006', 'Male', 'Hindu', 'Indian',
      8.8, 88.0, 91.5,
      '9573471715', 'korleparaarunkumar@gmail.com', '24a81a0629@sves.org.in', '892192096038', '255692439187', '061010023000096',
      'EAPCET', '25778', 'CONVENOR', 'Yes', 'VELAGADURRU', 'Good academic performance', '',
      'KORLEPARA SATYA KRISHNA', 'BUSINESS', '9491015348', 'KORLEPARA JYOTHI', 'HOUSE WIFE', '8332956270', '70000',
      '3-8/1 MAIN ROAD VELAGADURRU WEST GODAVARI AP-534227'
    ];
    const sampleRow2 = [
      '24A81A0501', 'SAMPLE CSE STUDENT', '048/CSE/2024', 'Regular', 'B.Tech', 'CSE', 'B', '2', 'III Semester',
      '15/08/2005', 'Female', 'Hindu', 'Indian',
      8.2, 82.5, 86.0,
      '9876543210', 'sample.cse@gmail.com', '24a81a0501@sves.org.in', '789012345678', '255692439188', '061010023000097',
      'EAPCET', '18450', 'CONVENOR', 'No', 'TADEPALLIGUDEM', 'Active student', '',
      'RAMA RAO', 'EMPLOYEE', '9876543211', 'LAKSHMI', 'TEACHER', '9876543212', '120000',
      'FLAT 102 BALAJI TOWERS TADEPALLIGUDEM'
    ];

    const wsData = [headers, sampleRow1, sampleRow2];
    const ws1 = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Student_Template');

    // Sheet 2: Attribute Guide explaining each column
    const guideHeaders = ['Column Key', 'Display Name', 'Category', 'Required?', 'Example Value', 'Attribute Description'];
    const guideRows = STUDENT_ATTRIBUTES.map(a => [
      a.id, a.label, a.category, a.required ? 'YES (Mandatory)' : 'Optional', a.example, a.desc
    ]);
    const wsGuide = XLSX.utils.aoa_to_sheet([guideHeaders, ...guideRows]);
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Attribute_Guide');

    XLSX.writeFile(wb, 'student_bulk_import_full_template.xlsx');
    toast.success('📥 Downloaded comprehensive Excel template with all 37 student attributes!');
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'student_bulk_import_full_template.csv';
    a.click();
    toast.success('📥 Downloaded comprehensive CSV template with all 37 student attributes!');
  };

  // ─── Parse Excel / CSV file ───────────────────────────────────────────────
  const parseFile = (selectedFile) => {
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Please upload an Excel (.xlsx / .xls) or CSV (.csv) file.');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
        });

        if (rows.length === 0) {
          toast.error('The file appears to be empty. No data rows found.');
          return;
        }

        setParsedStudents(rows);
        toast.success(`✅ Parsed ${rows.length} student row(s) from "${selectedFile.name}"`);
      } catch (err) {
        toast.error('Failed to parse file. Make sure it is a valid Excel or CSV file.');
        console.error(err);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleFileInput = (e) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setParsedStudents([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ─── Parse pasted CSV text ────────────────────────────────────────────────
  const parseCsvText = () => {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return headers.reduce((obj, h, i) => { obj[h] = values[i] || ''; return obj; }, {});
    });
  };

  // ─── Run Import ───────────────────────────────────────────────────────────
  const handleImport = async () => {
    let students = [];

    if (inputMethod === 'file') {
      if (parsedStudents.length === 0) {
        toast.error('Please upload a file first.');
        return;
      }
      students = parsedStudents;
    } else {
      students = parseCsvText();
      if (students.length === 0) {
        toast.error('Please paste at least a header row and one data row.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await bulkImportStudents(mode, students);
      if (res.data.success !== false) {
        // Backend wraps counts inside res.data.summary
        const summary = res.data.summary || {};
        const flatReport = {
          ...res.data,
          insertedCount: summary.insertedCount ?? res.data.insertedCount ?? 0,
          updatedCount: summary.updatedCount ?? res.data.updatedCount ?? 0,
          skippedCount: summary.skippedCount ?? res.data.skippedCount ?? 0,
          errors: summary.errors ?? res.data.errors ?? [],
          totalReceived: summary.totalReceived ?? res.data.totalReceived ?? students.length,
        };
        setReport(flatReport);
        const added = flatReport.insertedCount;
        const updated = flatReport.updatedCount;
        const skipped = flatReport.skippedCount;
        toast.success(
          `✅ Import done!  ➕ ${added} added · ♻️ ${updated} updated · ⏭️ ${skipped} skipped`
        );
      } else {
        toast.error(res.data.message || 'Import failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const canImport = inputMethod === 'file'
    ? parsedStudents.length > 0
    : text.trim().split('\n').filter(Boolean).length >= 2;

  const categories = ['Personal', 'Academic', 'Contact', 'Quota', 'Parents'];

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title"><FaFileImport /> Bulk Import / Update Students</span>
          <button className="modal-close" onClick={onClose}><FaXmark /></button>
        </div>

        <div className="modal-body">
          {!report ? (
            <>
              {/* Import Mode */}
              <div className="section-title">Import Mode</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {[
                  { value: 'ADD', label: 'Add New Only', desc: 'Skip existing records' },
                  { value: 'UPDATE', label: 'Update Only', desc: 'Only update existing' },
                  { value: 'BOTH', label: 'Smart Merge', desc: 'Add new + update existing' },
                ].map(m => (
                  <button
                    key={m.value} type="button"
                    className={`btn ${mode === m.value ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setMode(m.value)}
                    style={{ flex: 1, flexDirection: 'column', gap: 3, padding: '10px 8px', alignItems: 'center' }}
                  >
                    <span style={{ fontWeight: 700 }}>{m.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>{m.desc}</span>
                  </button>
                ))}
              </div>

              {/* Template Download Box (Prominent & with all 37 attributes) */}
              <div style={{
                background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: 18
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Excel & CSV Templates
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={downloadExcelTemplate}
                      style={{ background: 'linear-gradient(135deg, var(--emerald), #059669)', border: 'none' }}
                    >
                      <FaFileExcel /> Download Excel Template (.xlsx)
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={downloadCsvTemplate}
                    >
                      <FaFileCsv /> Download CSV (.csv)
                    </button>
                  </div>
                </div>
              </div>

              {/* Input Method Toggle */}
              <div className="section-title">Import Source</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${inputMethod === 'file' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setInputMethod('file')}
                >
                  <FaFileExcel /> Upload File (Excel / CSV)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${inputMethod === 'paste' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setInputMethod('paste')}
                >
                  <FaFileCsv /> Paste CSV Text
                </button>
              </div>

              {/* ── FILE UPLOAD ── */}
              {inputMethod === 'file' && (
                <>
                  {!file ? (
                    <div
                      className="file-drop-zone"
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: `2px dashed ${dragOver ? '#0f172a' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-lg)',
                        padding: '40px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: dragOver ? 'rgba(0,0,0,0.02)' : 'var(--bg-input)',
                        marginBottom: 14,
                      }}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileInput}
                        style={{ display: 'none' }}
                      />
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                        Drop your Excel or CSV file here
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
                        Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> files with all student attributes
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                      >
                        <FaCloudArrowUp /> Browse File
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: 14
                    }}>
                      <div style={{ fontSize: 32 }}>📊</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{file.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {(file.size / 1024).toFixed(1)} KB · {parsedStudents.length} student rows found
                        </div>
                      </div>
                      <button className="btn btn-outline-rose btn-sm" onClick={clearFile}>
                        <FaTrash /> Remove
                      </button>
                    </div>
                  )}

                  {parsedStudents.length > 0 && (
                    <div style={{
                      background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, marginBottom: 10
                    }}>
                      <strong>Preview (first 3 rows):</strong>
                      <div style={{ marginTop: 8, overflowX: 'auto' }}>
                        <table style={{ fontSize: 11, borderCollapse: 'collapse', width: '100%' }}>
                          <thead>
                            <tr>
                              {Object.keys(parsedStudents[0]).slice(0, 8).map(k => (
                                <th key={k} style={{ padding: '4px 8px', textAlign: 'left', color: '#0f172a', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-color)' }}>{k}</th>
                              ))}
                              {Object.keys(parsedStudents[0]).length > 8 && <th style={{ color: 'var(--text-muted)' }}>+{Object.keys(parsedStudents[0]).length - 8} more</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {parsedStudents.slice(0, 3).map((row, i) => (
                              <tr key={i}>
                                {Object.values(row).slice(0, 8).map((v, j) => (
                                  <td key={j} style={{ padding: '4px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-color)' }}>{String(v).slice(0, 20)}{String(v).length > 20 ? '…' : ''}</td>
                                ))}
                                {Object.values(row).length > 8 && <td style={{ color: 'var(--text-muted)' }}>…</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── PASTE CSV ── */}
              {inputMethod === 'paste' && (
                <>
                  <div style={{
                    background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 14, fontSize: 13
                  }}>
                    <strong>💡 Tip:</strong> First row must be the header. Required columns: <code>rollNumber</code>, <code>name</code>, <code>branch</code>.
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ float: 'right' }}
                      onClick={downloadCsvTemplate}
                    >
                      <FaDownload /> CSV Template
                    </button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Paste CSV Data (header row + student rows)</label>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: 180, fontFamily: 'monospace', fontSize: 12 }}
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder={templateCSV}
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            /* ── IMPORT REPORT ── */
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Import Complete!</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  {report.totalReceived || 0} row{(report.totalReceived || 0) !== 1 ? 's' : ''} processed in <strong>{report.mode || 'BOTH'}</strong> mode
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Total Rows', value: report.totalReceived || 0, color: 'var(--text-primary)', icon: '📋' },
                  { label: 'Added', value: report.insertedCount || 0, color: 'var(--emerald)', icon: '➕' },
                  { label: 'Updated', value: report.updatedCount || 0, color: 'var(--indigo)', icon: '♻️' },
                  { label: 'Skipped', value: report.skippedCount || 0, color: 'var(--amber)', icon: '⏭️' },
                ].map(r => (
                  <div key={r.label} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', padding: '14px 10px', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 20 }}>{r.icon}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: r.color, lineHeight: 1.2 }}>{r.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{r.label}</div>
                  </div>
                ))}
              </div>

              {report.errors && report.errors.length > 0 && (
                <div style={{
                  background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)',
                  borderRadius: 'var(--radius-sm)', padding: 14
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--rose)', marginBottom: 8 }}>
                    ⚠️ {report.errors.length} Row Error{report.errors.length > 1 ? 's' : ''}
                  </div>
                  <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    {report.errors.slice(0, 10).map((e, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>
                        • {typeof e === 'string' ? e : JSON.stringify(e)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          {!report ? (
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={loading || !canImport}
            >
              {loading
                ? <><div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Importing...</>
                : <><FaFileImport /> Import {parsedStudents.length > 0 || text ? `(${inputMethod === 'file' ? parsedStudents.length : parseCsvText().length} rows)` : ''}</>
              }
            </button>
          ) : (
            <button className="btn btn-emerald" onClick={onDone}>
              ✅ Done & Refresh Students
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
