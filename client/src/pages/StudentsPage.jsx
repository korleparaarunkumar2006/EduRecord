import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaUsers, FaMagnifyingGlass, FaXmark, FaUserPlus, FaFileImport,
  FaFileExport, FaTrash, FaGrip, FaList, FaPenToSquare, FaEye,
  FaFilter, FaFilterCircleXmark, FaSliders, FaDownload
} from 'react-icons/fa6';
import { searchStudents, deleteStudent, bulkDeleteStudents } from '../api';
import { useAuth } from '../context/AuthContext';
import StudentModal from '../components/StudentModal';
import StudentDetailPage from '../components/StudentDetailPage';
import BulkImportModal from '../components/BulkImportModal';
import ExportModal from '../components/ExportModal';
import SmartFilterModal, { DEFAULT_SMART_FILTERS } from '../components/SmartFilterModal';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { normalizePhotoUrl, handleImageError } from '../utils/imageHelper';

const BRANCHES = ['CSE','CST','AIML','CAI','DS','ECE','ECT','EEE','MEC','CIVIL','IT'];
const SECTIONS = ['A','B','C','D','E'];
const YEARS = ['1','2','3','4'];
const SEMESTERS = ['I Semester','II Semester','III Semester','IV Semester','V Semester','VI Semester','VII Semester','VIII Semester'];

export default function StudentsPage() {
  const { faculty } = useAuth();
  const isAdmin = faculty?.role === 'admin';
  const location = useLocation();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid | table
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ branch: 'ALL', section: 'ALL', year: 'ALL', semester: 'ALL', admissionType: 'ALL' });
  const [smartFilters, setSmartFilters] = useState(DEFAULT_SMART_FILTERS);
  const [showSmartFilterModal, setShowSmartFilterModal] = useState(false);

  const [detailStudent, setDetailStudent] = useState(null);
  const [addEditModal, setAddEditModal] = useState({ open: false, student: null });
  const [importModal, setImportModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const searchTimer = useRef(null);

  // Parse URL params for quick filter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eligibility = params.get('eligibility');
    const maxAtt = params.get('maxAtt') || params.get('maxAttendance');
    const minAtt = params.get('minAtt') || params.get('minAttendance');
    if (eligibility === 'HIGH_PERFORMERS') {
      setSmartFilters(p => ({ ...p, minCgpa: 8.5, preset: 'High Performers (CGPA ≥ 8.5)' }));
    } else if (eligibility === 'LOW_ATTENDANCE' || maxAtt) {
      setSmartFilters(p => ({ ...p, maxAttendance: parseFloat(maxAtt) || 74, preset: 'Low Attendance (< 75%)' }));
    } else if (minAtt) {
      setSmartFilters(p => ({ ...p, minAttendance: parseFloat(minAtt) || 0 }));
    }
  }, [location.search]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        q: search || undefined,
        branch: filters.branch !== 'ALL' ? filters.branch : (smartFilters.branch !== 'ALL' ? smartFilters.branch : undefined),
        section: filters.section !== 'ALL' ? filters.section : (smartFilters.section !== 'ALL' ? smartFilters.section : undefined),
        year: filters.year !== 'ALL' ? filters.year : (smartFilters.year !== 'ALL' ? smartFilters.year : undefined),
        semester: filters.semester !== 'ALL' ? filters.semester : (smartFilters.semester !== 'ALL' ? smartFilters.semester : undefined),
        admissionType: filters.admissionType !== 'ALL' ? filters.admissionType : (smartFilters.admissionType !== 'ALL' ? smartFilters.admissionType : undefined),
        gender: smartFilters.gender !== 'ALL' ? smartFilters.gender : undefined,
        seatCategory: smartFilters.seatCategory !== 'ALL' ? smartFilters.seatCategory : undefined,
        entranceType: smartFilters.entranceType !== 'ALL' ? smartFilters.entranceType : undefined,
        minGpa: smartFilters.minCgpa > 0 ? smartFilters.minCgpa : undefined,
        maxGpa: smartFilters.maxCgpa < 10 ? smartFilters.maxCgpa : undefined,
        minAtt: smartFilters.minAttendance > 0 ? smartFilters.minAttendance : undefined,
        maxAtt: smartFilters.maxAttendance < 100 ? smartFilters.maxAttendance : undefined,
        minAttendance: smartFilters.minAttendance > 0 ? smartFilters.minAttendance : undefined,
        maxAttendance: smartFilters.maxAttendance < 100 ? smartFilters.maxAttendance : undefined,
        minMarks: smartFilters.minMarks > 0 ? smartFilters.minMarks : undefined,
        maxMarks: smartFilters.maxMarks < 100 ? smartFilters.maxMarks : undefined,
      };
      const res = await searchStudents(params);
      if (res.data.success) {
        let list = res.data.students || [];
        // Ensure robust filter on client side as well:
        if (smartFilters.maxAttendance < 100) {
          list = list.filter(s => (s.attendance || 0) <= smartFilters.maxAttendance);
        }
        if (smartFilters.minAttendance > 0) {
          list = list.filter(s => (s.attendance || 0) >= smartFilters.minAttendance);
        }
        if (smartFilters.minCgpa > 0) {
          list = list.filter(s => (s.gpa || 0) >= smartFilters.minCgpa);
        }
        if (smartFilters.maxCgpa < 10) {
          list = list.filter(s => (s.gpa || 0) <= smartFilters.maxCgpa);
        }
        setStudents(list);
      }
    } catch (e) {
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [search, filters, smartFilters]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchStudents(), 250);
  }, [fetchStudents]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete student "${name}"? This cannot be undone.`)) return;
    try {
      await deleteStudent(id);
      toast.success('Student deleted successfully.');
      fetchStudents();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed.');
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) { toast('No students selected.'); return; }
    if (!window.confirm(`Delete ${selected.size} selected student(s)? This cannot be undone.`)) return;
    try {
      await bulkDeleteStudents([...selected]);
      toast.success(`Deleted ${selected.size} student(s).`);
      setSelected(new Set());
      fetchStudents();
    } catch (e) {
      toast.error('Bulk delete failed.');
    }
  };

  const toggleSelect = (rollNumber) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(rollNumber)) n.delete(rollNumber); else n.add(rollNumber);
      return n;
    });
  };

  const isSmartFiltered =
    smartFilters.minCgpa > 0 || smartFilters.maxCgpa < 10 ||
    smartFilters.minAttendance > 0 || smartFilters.maxAttendance < 100 ||
    smartFilters.minMarks > 0 || smartFilters.maxMarks < 100 ||
    smartFilters.gender !== 'ALL' || smartFilters.seatCategory !== 'ALL' ||
    smartFilters.entranceType !== 'ALL' ||
    smartFilters.preset;

  const activeFilterCount =
    Object.values(filters).filter(v => v !== 'ALL').length +
    (search ? 1 : 0) +
    (isSmartFiltered ? 1 : 0);

  const resetAllFilters = () => {
    setFilters({ branch: 'ALL', section: 'ALL', year: 'ALL', semester: 'ALL', admissionType: 'ALL' });
    setSmartFilters(DEFAULT_SMART_FILTERS);
    setSearch('');
  };

  if (detailStudent) {
    return (
      <StudentDetailPage
        student={detailStudent}
        onBack={() => setDetailStudent(null)}
        onEdit={(s) => { setAddEditModal({ open: true, student: s }); setDetailStudent(null); }}
        onDelete={(s) => { handleDelete(s._id, s.name); setDetailStudent(null); }}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title"><FaUsers /> Student Records</h1>
          <p className="page-subtitle">
            {loading ? 'Loading...' : `${students.length} student${students.length !== 1 ? 's' : ''} found`}
            {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
          </p>
        </div>
        <div className="page-actions">
          <button
            className={`btn ${isSmartFiltered ? 'btn-amber' : 'btn-outline-indigo'}`}
            onClick={() => setShowSmartFilterModal(true)}
          >
            <FaSliders /> {smartFilters.preset ? smartFilters.preset : 'Smart Filters Engine'}
          </button>
          <button className="btn btn-outline" onClick={() => setExportModal(true)}>
            <FaDownload /> Export Data
          </button>
          {isAdmin && selected.size > 0 && (
            <button className="btn btn-rose" onClick={handleBulkDelete}>
              <FaTrash /> Delete Selected ({selected.size})
            </button>
          )}
          {isAdmin && (
            <>
              <button className="btn btn-outline" onClick={() => setImportModal(true)}>
                <FaFileImport /> Bulk Import
              </button>
              <button className="btn btn-emerald" onClick={() => setAddEditModal({ open: true, student: null })}>
                <FaUserPlus /> Add Student
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Smart Filter Banner */}
      {isSmartFiltered && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16, fontSize: 13
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaSliders style={{ color: 'var(--amber)' }} />
            <span>
              <strong>Smart Filter Active:</strong> {smartFilters.preset || `CGPA (${smartFilters.minCgpa}-${smartFilters.maxCgpa}), Attendance (${smartFilters.minAttendance}%-${smartFilters.maxAttendance}%)`}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setSmartFilters(DEFAULT_SMART_FILTERS)}>
            <FaXmark /> Clear Smart Filter
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        {/* Search */}
        <div className="search-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <FaMagnifyingGlass className="search-icon-left" />
          <input
            className="search-input"
            placeholder="Search by name, roll no, branch, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => setSearch('')}
            >
              <FaXmark />
            </button>
          )}
        </div>

        {/* Filters */}
        <select className="filter-select" value={filters.branch} onChange={e => setFilters(p => ({ ...p, branch: e.target.value }))}>
          <option value="ALL">All Branches</option>
          {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="filter-select" value={filters.section} onChange={e => setFilters(p => ({ ...p, section: e.target.value }))}>
          <option value="ALL">All Sections</option>
          {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
        </select>
        <select className="filter-select" value={filters.year} onChange={e => setFilters(p => ({ ...p, year: e.target.value }))}>
          <option value="ALL">All Years</option>
          {YEARS.map(y => <option key={y} value={y}>{y === '1' ? '1st' : y === '2' ? '2nd' : y === '3' ? '3rd' : '4th'} Year</option>)}
        </select>
        <select className="filter-select" value={filters.semester} onChange={e => setFilters(p => ({ ...p, semester: e.target.value }))}>
          <option value="ALL">All Semesters</option>
          <optgroup label="1st Year">
            <option value="I Semester">I Semester (1)</option>
            <option value="II Semester">II Semester (2)</option>
          </optgroup>
          <optgroup label="2nd Year">
            <option value="III Semester">III Semester (3)</option>
            <option value="IV Semester">IV Semester (4)</option>
          </optgroup>
          <optgroup label="3rd Year">
            <option value="V Semester">V Semester (5)</option>
            <option value="VI Semester">VI Semester (6)</option>
          </optgroup>
          <optgroup label="4th Year">
            <option value="VII Semester">VII Semester (7)</option>
            <option value="VIII Semester">VIII Semester (8)</option>
          </optgroup>
        </select>
        <select className="filter-select" value={filters.admissionType} onChange={e => setFilters(p => ({ ...p, admissionType: e.target.value }))}>
          <option value="ALL">All Admission Types</option>
          <option value="Regular">Regular</option>
          <option value="Lateral Entry">Lateral Entry</option>
        </select>

        {activeFilterCount > 0 && (
          <button className="btn btn-outline-rose btn-sm" onClick={resetAllFilters}>
            <FaFilterCircleXmark /> Reset All
          </button>
        )}

        {/* View Toggle */}
        <div className="view-toggle">
          <button className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><FaGrip /></button>
          <button className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}><FaList /></button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="empty-state">
          <div className="loading-spinner" style={{ width: 36, height: 36 }} />
          <p>Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>No Students Found</h3>
          <p>Try adjusting your search or filters.</p>
          {activeFilterCount > 0 && (
            <button className="btn btn-outline-rose mt-2" onClick={resetAllFilters}>
              Clear Active Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="students-grid">
          {students.map(s => (
            <StudentCard
              key={s._id}
              student={s}
              isAdmin={isAdmin}
              selected={selected.has(s.rollNumber)}
              onToggleSelect={() => toggleSelect(s.rollNumber)}
              onView={() => setDetailStudent(s)}
              onEdit={() => setAddEditModal({ open: true, student: s })}
              onDelete={() => handleDelete(s._id, s.name)}
            />
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {isAdmin && <th><input type="checkbox" onChange={e => { if (e.target.checked) setSelected(new Set(students.map(s => s.rollNumber))); else setSelected(new Set()); }} /></th>}
                <th>Roll No</th>
                <th>Name</th>
                <th>Branch</th>
                <th>Sec / Year</th>
                <th>Semester</th>
                <th>CGPA</th>
                <th>Marks %</th>
                <th>Attendance</th>
                <th>Mobile</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s._id} onClick={() => setDetailStudent(s)} style={{ cursor: 'pointer' }}>
                  {isAdmin && <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(s.rollNumber)} onChange={() => toggleSelect(s.rollNumber)} /></td>}
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--indigo-light)', fontSize: 12 }}>{s.rollNumber}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {s.photoUrl ? (
                        <img
                          src={normalizePhotoUrl(s.photoUrl)}
                          alt={s.name}
                          referrerPolicy="no-referrer"
                          style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0 }}
                          onError={(e) => handleImageError(e, s.name)}
                        />
                      ) : (
                        <div style={{
                          width: 30, height: 30, borderRadius: 8,
                          background: 'linear-gradient(135deg, var(--indigo), var(--purple))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, color: '#fff', fontSize: 12, flexShrink: 0
                        }}>
                          {s.name?.charAt(0)}
                        </div>
                      )}
                      <span>{s.name}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-indigo">{s.branch}</span></td>
                  <td>{s.section} / {s.year}Y</td>
                  <td>{s.semester}</td>
                  <td><span style={{ color: 'var(--indigo-light)', fontWeight: 700 }}>{s.gpa?.toFixed(2)}</span></td>
                  <td><span style={{ color: 'var(--emerald)', fontWeight: 700 }}>{s.marksPercentage?.toFixed(1)}%</span></td>
                  <td>
                    <span className={`badge ${s.attendance >= 75 ? 'badge-emerald' : 'badge-rose'}`}>
                      {s.attendance?.toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.phone || '—'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => setDetailStudent(s)} title="View Details"><FaEye /></button>
                      {isAdmin && (
                        <>
                          <button className="btn-icon text-indigo" onClick={() => setAddEditModal({ open: true, student: s })} title="Edit"><FaPenToSquare /></button>
                          <button className="btn-icon text-rose" onClick={() => handleDelete(s._id, s.name)} title="Delete"><FaTrash /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {addEditModal.open && (
        <StudentModal
          student={addEditModal.student}
          onClose={() => setAddEditModal({ open: false, student: null })}
          onSaved={() => { setAddEditModal({ open: false, student: null }); fetchStudents(); }}
        />
      )}

      {importModal && (
        <BulkImportModal
          onClose={() => setImportModal(false)}
          onDone={() => { setImportModal(false); fetchStudents(); }}
        />
      )}

      {exportModal && (
        <ExportModal
          students={students}
          onClose={() => setExportModal(false)}
        />
      )}

      {showSmartFilterModal && (
        <SmartFilterModal
          filters={smartFilters}
          onApply={setSmartFilters}
          onClose={() => setShowSmartFilterModal(false)}
          onReset={() => setSmartFilters(DEFAULT_SMART_FILTERS)}
        />
      )}
    </div>
  );
}

function StudentCard({ student: s, isAdmin, selected, onToggleSelect, onView, onEdit, onDelete }) {
  const isEligible = (s.attendance || 0) >= 75 && (s.gpa || 0) >= 6.5;

  return (
    <div className={`card student-card ${selected ? 'selected-card' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {isAdmin && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              style={{ cursor: 'pointer', width: 16, height: 16 }}
            />
          )}
          {s.photoUrl ? (
            <img
              src={normalizePhotoUrl(s.photoUrl)}
              alt={s.name}
              referrerPolicy="no-referrer"
              style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--indigo)' }}
              onError={(e) => handleImageError(e, s.name)}
            />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--indigo), var(--purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, color: '#fff', fontSize: 16
            }}>
              {s.name?.charAt(0)}
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--indigo-light)' }}>{s.rollNumber}</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
          </div>
        </div>
        <span className={`badge ${isEligible ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: 10 }}>
          {isEligible ? 'Eligible' : 'Detained Risk'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="badge badge-indigo">{s.branch}</span>
        <span className="badge badge-sky">Sec {s.section}</span>
        <span className="badge badge-purple">{s.year} Year</span>
        <span className="badge badge-amber">{s.admissionType || 'Regular'}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '10px', background: 'var(--bg-input)', borderRadius: 8, textAlign: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>CGPA</div>
          <div style={{ fontWeight: 800, color: 'var(--indigo-light)', fontSize: 14 }}>{s.gpa?.toFixed(2)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>MARKS</div>
          <div style={{ fontWeight: 800, color: 'var(--emerald)', fontSize: 14 }}>{s.marksPercentage?.toFixed(1)}%</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ATTENDANCE</div>
          <div style={{ fontWeight: 800, color: s.attendance >= 75 ? 'var(--emerald)' : 'var(--rose)', fontSize: 14 }}>
            {s.attendance?.toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={onView}>
          <FaEye /> View Profile
        </button>
        {isAdmin && (
          <>
            <button className="btn btn-outline-indigo btn-sm" onClick={onEdit} title="Edit Student">
              <FaPenToSquare />
            </button>
            <button className="btn btn-outline-rose btn-sm" onClick={onDelete} title="Delete Student">
              <FaTrash />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
