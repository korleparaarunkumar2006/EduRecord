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

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const templateCSV = `rollNumber,name,branch,section,year,semester,gpa,attendance,marksPercentage,phone,admissionType
24A81A9001,SAMPLE STUDENT,CSE,A,3,V Semester,8.5,88.0,85.0,9876543210,Regular
24A81A9002,ANOTHER STUDENT,ECE,B,2,III Semester,7.9,82.0,79.0,9876543211,Regular`;

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
          updatedCount:  summary.updatedCount  ?? res.data.updatedCount  ?? 0,
          skippedCount:  summary.skippedCount  ?? res.data.skippedCount  ?? 0,
          errors:        summary.errors        ?? res.data.errors        ?? [],
          totalReceived: summary.totalReceived ?? res.data.totalReceived ?? students.length,
        };
        setReport(flatReport);
        const added   = flatReport.insertedCount;
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
                        border: `2px dashed ${dragOver ? 'var(--indigo)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-lg)',
                        padding: '40px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: dragOver ? 'rgba(99,102,241,0.06)' : 'var(--bg-input)',
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
                        Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> files
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-indigo"
                        onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                      >
                        <FaCloudArrowUp /> Browse File
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: 'rgba(52,211,153,0.07)',
                      border: '1px solid rgba(52,211,153,0.3)',
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
                      background: 'rgba(99,102,241,0.06)', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, marginBottom: 10
                    }}>
                      <strong>Preview (first 3 rows):</strong>
                      <div style={{ marginTop: 8, overflowX: 'auto' }}>
                        <table style={{ fontSize: 11, borderCollapse: 'collapse', width: '100%' }}>
                          <thead>
                            <tr>
                              {Object.keys(parsedStudents[0]).slice(0, 8).map(k => (
                                <th key={k} style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--indigo-light)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-color)' }}>{k}</th>
                              ))}
                              {Object.keys(parsedStudents[0]).length > 8 && <th style={{ color: 'var(--text-muted)' }}>+{Object.keys(parsedStudents[0]).length - 8} more</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {parsedStudents.slice(0, 3).map((row, i) => (
                              <tr key={i}>
                                {Object.values(row).slice(0, 8).map((v, j) => (
                                  <td key={j} style={{ padding: '4px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(99,102,241,0.05)' }}>{String(v).slice(0, 20)}{String(v).length > 20 ? '…' : ''}</td>
                                ))}
                                {Object.values(row).length > 8 && <td style={{ color: 'var(--text-muted)' }}>…</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Template Download */}
                  <div style={{
                    background: 'rgba(99,102,241,0.05)', border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>💡 Need a template?</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ float: 'right' }}
                      onClick={() => {
                        const wb = XLSX.utils.book_new();
                        const ws = XLSX.utils.aoa_to_sheet([
                          ['rollNumber','name','branch','section','year','semester','gpa','attendance','marksPercentage','phone','admissionType','dob','gender'],
                          ['24A81A9001','SAMPLE STUDENT','CSE','A','3','V Semester','8.5','88.0','85.0','9876543210','Regular','15/03/2006','Male'],
                        ]);
                        XLSX.utils.book_append_sheet(wb, ws, 'Students');
                        XLSX.writeFile(wb, 'student_import_template.xlsx');
                      }}
                    >
                      <FaDownload /> Download Excel Template
                    </button>
                  </div>
                </>
              )}

              {/* ── PASTE CSV ── */}
              {inputMethod === 'paste' && (
                <>
                  <div style={{
                    background: 'rgba(99,102,241,0.07)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 14, fontSize: 13
                  }}>
                    <strong>💡 Tip:</strong> First row must be the header. Required columns: <code>rollNumber</code>, <code>name</code>, <code>branch</code>.
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ float: 'right' }}
                      onClick={() => {
                        const blob = new Blob([templateCSV], { type: 'text/csv' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = 'student_import_template.csv';
                        a.click();
                      }}
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
                  { label: 'Total Rows',   value: report.totalReceived || 0, color: 'var(--text-primary)', icon: '📋' },
                  { label: 'Added',        value: report.insertedCount || 0, color: 'var(--emerald)',      icon: '➕' },
                  { label: 'Updated',      value: report.updatedCount  || 0, color: 'var(--indigo)',       icon: '♻️' },
                  { label: 'Skipped',      value: report.skippedCount  || 0, color: 'var(--amber)',        icon: '⏭️' },
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
