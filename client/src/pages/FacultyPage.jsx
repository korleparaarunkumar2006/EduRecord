import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaChalkboardUser, FaMagnifyingGlass, FaXmark, FaUserPlus,
  FaPenToSquare, FaTrash, FaGrip, FaList, FaFilterCircleXmark, FaEye
} from 'react-icons/fa6';
import { getAllFaculty, deleteFaculty } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import FacultyModal from '../components/FacultyModal';
import FacultyDetailPage from '../components/FacultyDetailPage';

export default function FacultyPage() {
  const { faculty: me } = useAuth();
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ department: 'ALL', designation: 'ALL' });
  const [modal, setModal] = useState({ open: false, faculty: null });
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const searchTimer = useRef(null);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        q: search || undefined,
        department: filters.department !== 'ALL' ? filters.department : undefined,
        designation: filters.designation !== 'ALL' ? filters.designation : undefined,
      };
      const res = await getAllFaculty(params);
      if (res.data.success) setFacultyList(res.data.faculty || []);
    } catch (e) {
      if (e.response?.status === 403) toast.error('Admin access required to view faculty.');
      else toast.error('Failed to load faculty records.');
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(fetchFaculty, 300);
  }, [fetchFaculty]);

  const handleDelete = async (f) => {
    if (f.facultyId === me?.facultyId) { toast.error("You can't delete your own account!"); return; }
    if (!window.confirm(`Delete faculty "${f.name}" (${f.facultyId})?`)) return;
    try {
      await deleteFaculty(f._id || f.facultyId);
      toast.success('Faculty member deleted.');
      if (selectedFaculty?.facultyId === f.facultyId) setSelectedFaculty(null);
      fetchFaculty();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed.');
    }
  };

  const departments = [...new Set(facultyList.map(f => f.department).filter(Boolean))];
  const designations = [...new Set(facultyList.map(f => f.designation).filter(Boolean))];

  // If a faculty member is selected for full detail page view:
  if (selectedFaculty) {
    return (
      <FacultyDetailPage
        faculty={selectedFaculty}
        onBack={() => setSelectedFaculty(null)}
        onEdit={(f) => setModal({ open: true, faculty: f })}
        onDelete={(f) => handleDelete(f)}
      />
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><FaChalkboardUser /> Faculty Management</h1>
          <p className="page-subtitle">{loading ? 'Loading...' : `${facultyList.length} faculty member${facultyList.length !== 1 ? 's' : ''}`} · Admin Only</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-emerald" onClick={() => setModal({ open: true, faculty: null })}>
            <FaUserPlus /> Add Faculty
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <FaMagnifyingGlass className="search-icon-left" />
          <input
            className="search-input"
            placeholder="Search by name, ID, dept, designation..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setSearch('')}>
              <FaXmark />
            </button>
          )}
        </div>

        <select className="filter-select" value={filters.department} onChange={e => setFilters(p => ({ ...p, department: e.target.value }))}>
          <option value="ALL">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="filter-select" value={filters.designation} onChange={e => setFilters(p => ({ ...p, designation: e.target.value }))}>
          <option value="ALL">All Designations</option>
          {designations.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {(filters.department !== 'ALL' || filters.designation !== 'ALL') && (
          <button className="btn btn-outline-rose btn-sm" onClick={() => setFilters({ department: 'ALL', designation: 'ALL' })}>
            <FaFilterCircleXmark /> Reset
          </button>
        )}

        {/* View Toggle */}
        <div className="view-toggle">
          <button className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}><FaList /></button>
          <button className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><FaGrip /></button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="empty-state"><div className="loading-spinner" style={{ width: 36, height: 36 }} /><p>Loading faculty...</p></div>
      ) : facultyList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👨‍🏫</div>
          <h3>No Faculty Records Found</h3>
          <button className="btn btn-emerald mt-3" onClick={() => setModal({ open: true, faculty: null })}><FaUserPlus /> Add Faculty Member</button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Faculty ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Role</th>
                <th>Pwd Changed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {facultyList.map(f => (
                <tr
                  key={f._id || f.facultyId}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedFaculty(f)}
                >
                  <td><span style={{ fontWeight: 700, color: 'var(--indigo-light)', fontSize: 12 }}>{f.facultyId}</span></td>
                  <td style={{ fontWeight: 600 }}>{f.name}</td>
                  <td style={{ fontSize: 12 }}>{f.email || '—'}</td>
                  <td style={{ fontSize: 12 }}>{f.phoneNumber || '—'}</td>
                  <td style={{ fontSize: 12 }}>{f.department}</td>
                  <td style={{ fontSize: 12 }}>{f.designation}</td>
                  <td><span className={`badge ${f.role === 'admin' ? 'badge-admin' : 'badge-faculty'}`}>{f.role}</span></td>
                  <td>
                    <span className={`badge ${f.hasChangedPassword ? 'badge-emerald' : 'badge-amber'}`}>
                      {f.hasChangedPassword ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" title="View Full Page Details" onClick={() => setSelectedFaculty(f)}><FaEye /></button>
                      <button className="btn btn-ghost btn-sm" title="Edit Account" onClick={() => setModal({ open: true, faculty: f })}><FaPenToSquare /></button>
                      <button className="btn btn-outline-rose btn-sm" title="Delete Account" onClick={() => handleDelete(f)} disabled={f.facultyId === me?.facultyId}><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="faculty-cards-grid">
          {facultyList.map(f => (
            <div className="faculty-card" key={f._id || f.facultyId} onClick={() => setSelectedFaculty(f)} style={{ cursor: 'pointer' }}>
              <div className="faculty-card-avatar">🎓</div>
              <div className="faculty-card-name">{f.name}</div>
              <div className="faculty-card-id">{f.facultyId}</div>
              <span className={`badge ${f.role === 'admin' ? 'badge-admin' : 'badge-faculty'}`} style={{ marginBottom: 6 }}>{f.role}</span>
              <div className="faculty-card-dept">{f.department}<br /><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{f.designation}</span></div>
              <div className="faculty-card-actions" onClick={e => e.stopPropagation()}>
                <button className="btn btn-outline-indigo btn-sm" onClick={() => setSelectedFaculty(f)}><FaEye /> View</button>
                <button className="btn btn-outline-indigo btn-sm" onClick={() => setModal({ open: true, faculty: f })}><FaPenToSquare /> Edit</button>
                <button className="btn btn-outline-rose btn-sm" onClick={() => handleDelete(f)} disabled={f.facultyId === me?.facultyId}><FaTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <FacultyModal
          faculty={modal.faculty}
          onClose={() => setModal({ open: false, faculty: null })}
          onSaved={() => {
            setModal({ open: false, faculty: null });
            fetchFaculty();
          }}
        />
      )}
    </div>
  );
}
