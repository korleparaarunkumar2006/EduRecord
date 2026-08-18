import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FaXmark, FaFloppyDisk, FaUserPlus, FaCloudArrowUp, FaTrash, FaLink,
  FaPenToSquare, FaEye, FaGraduationCap, FaIdCard, FaAddressBook, FaUsers
} from 'react-icons/fa6';
import { createStudent, updateStudent } from '../api';
import toast from 'react-hot-toast';

const BRANCHES = ['CSE','CST','AIML','CAI','DS','ECE','ECT','EEE','MEC','CIVIL','IT'];
const SEMESTERS = ['I Semester','II Semester','III Semester','IV Semester','V Semester','VI Semester','VII Semester','VIII Semester'];
const COURSES = ['B.Tech', 'M.Tech', 'MBA', 'MCA', 'Diploma'];
const ENTRANCE_TYPES = ['EAPCET', 'ECET', 'ICET', 'PGECET', 'JEE Main', 'SPOT', 'MANAGEMENT'];
const SEAT_CATEGORIES = ['CONVENOR', 'MANAGEMENT', 'SPOT', 'NRI'];

const DEFAULT_QUALIFICATIONS = [
  {
    qualification: '10th (SSC)',
    board: 'BSEAP',
    htNo: '',
    yearOfPass: '2021',
    institute: '',
    maxMarks: '600',
    obtainedMarks: '',
    percentage: '',
    gradePoints: ''
  },
  {
    qualification: 'Intermediate / Diploma (10+2)',
    board: 'BIEAP',
    htNo: '',
    yearOfPass: '2023',
    institute: '',
    maxMarks: '1000',
    obtainedMarks: '',
    percentage: '',
    gradePoints: ''
  }
];

const DEFAULTS = {
  rollNumber: '', name: '', admissionNo: '', admissionType: 'Regular',
  course: 'B.Tech', branch: 'CSE', section: 'A', year: '3', semester: 'V Semester',
  dob: '', gender: 'Male', religion: 'Hindu', nationality: 'Indian',
  entranceType: 'EAPCET', cetRank: '', seatCategory: 'CONVENOR',
  phone: '', personalEmail: '', collegeEmail: '', adharNo: '', abcId: '',
  bankAccNo: '', reimbursement: 'No', transportHalt: '',
  gpa: '8.0', marksPercentage: '80.0', attendance: '85.0',
  photoUrl: '', remarks: '', lastStudied: '',
  educationDetails: DEFAULT_QUALIFICATIONS,
  parentsDetails: {
    fatherName: '', fatherOccupation: '', fatherMobile: '', fatherMail: '',
    motherName: '', motherOccupation: '', motherMobile: '', motherMail: '',
    annualIncome: '', permanentAddress: '', correspondenceAddress: ''
  }
};

function buildInitial(student) {
  if (!student) return { ...DEFAULTS, parentsDetails: { ...DEFAULTS.parentsDetails }, educationDetails: DEFAULT_QUALIFICATIONS };
  const pd = student.parentsDetails || {};

  let ed = student.educationDetails;
  if (!Array.isArray(ed) || ed.length === 0) {
    ed = DEFAULT_QUALIFICATIONS;
  } else if (ed.length === 1) {
    ed = [ed[0], DEFAULT_QUALIFICATIONS[1]];
  }

  return {
    rollNumber: student.rollNumber || '', name: student.name || '',
    admissionNo: student.admissionNo || '', admissionType: student.admissionType || 'Regular',
    course: student.course || 'B.Tech', branch: student.branch || 'CSE',
    section: student.section || 'A', year: student.year || '3',
    semester: student.semester || 'V Semester',
    dob: student.dob || '', gender: student.gender || 'Male',
    religion: student.religion || 'Hindu', nationality: student.nationality || 'Indian',
    entranceType: student.entranceType || 'EAPCET', cetRank: student.cetRank || '',
    seatCategory: student.seatCategory || 'CONVENOR',
    phone: student.phone || '', personalEmail: student.personalEmail || '',
    collegeEmail: student.collegeEmail || '', adharNo: student.adharNo || '',
    abcId: student.abcId || '', bankAccNo: student.bankAccNo || '',
    reimbursement: student.reimbursement || 'No', transportHalt: student.transportHalt || '',
    gpa: String(student.gpa ?? '8.0'), marksPercentage: String(student.marksPercentage ?? '80.0'),
    attendance: String(student.attendance ?? '85.0'),
    photoUrl: student.photoUrl || '', remarks: student.remarks || '',
    lastStudied: student.lastStudied || '',
    educationDetails: ed.map(item => ({
      qualification: item.qualification || '',
      board: item.board || '',
      htNo: item.htNo || '',
      yearOfPass: item.yearOfPass || '',
      institute: item.institute || '',
      maxMarks: item.maxMarks || '',
      obtainedMarks: item.obtainedMarks || '',
      percentage: item.percentage || '',
      gradePoints: item.gradePoints || ''
    })),
    parentsDetails: {
      fatherName: pd.fatherName || '', fatherOccupation: pd.fatherOccupation || '',
      fatherMobile: pd.fatherMobile || '', fatherMail: pd.fatherMail || '',
      motherName: pd.motherName || '', motherOccupation: pd.motherOccupation || '',
      motherMobile: pd.motherMobile || '', motherMail: pd.motherMail || '',
      annualIncome: pd.annualIncome || '',
      permanentAddress: pd.permanentAddress || pd.correspondenceAddress || '',
      correspondenceAddress: pd.correspondenceAddress || pd.permanentAddress || '',
    }
  };
}

export default function StudentModal({ student, onClose, onSaved }) {
  const isExistingStudent = !!student;
  // Requirement: If opening existing student, default to Read-Only mode until Edit button is clicked!
  const [isEditing, setIsEditing] = useState(!isExistingStudent);

  const [form, setForm] = useState(buildInitial(student));
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('personal'); // personal | academic | qualifications | contact | parents
  const [photoMode, setPhotoMode] = useState('url'); // 'url' | 'upload'
  const photoRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setPd = (key, val) => setForm(p => ({ ...p, parentsDetails: { ...p.parentsDetails, [key]: val } }));

  const setEd = (index, field, val) => {
    setForm(p => {
      const updated = [...p.educationDetails];
      const target = { ...updated[index], [field]: val };

      // Auto calculate percentage & grade points if obtained & max marks provided
      if (field === 'obtainedMarks' || field === 'maxMarks') {
        const obtained = parseFloat(field === 'obtainedMarks' ? val : target.obtainedMarks) || 0;
        const max = parseFloat(field === 'maxMarks' ? val : target.maxMarks) || 0;
        if (obtained > 0 && max > 0) {
          const pct = ((obtained / max) * 100).toFixed(1);
          target.percentage = pct;
          target.gradePoints = (parseFloat(pct) / 10).toFixed(1);
        }
      }

      updated[index] = target;
      return { ...p, educationDetails: updated };
    });
  };

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
    if (!form.rollNumber || !form.name || !form.branch) {
      toast.error('Roll Number, Name, and Branch are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        gpa: parseFloat(form.gpa) || 0,
        marksPercentage: parseFloat(form.marksPercentage) || 0,
        attendance: parseFloat(form.attendance) || 0,
      };

      if (isExistingStudent) {
        await updateStudent(student._id, payload);
        toast.success('Student updated successfully!');
      } else {
        await createStudent(payload);
        toast.success('Student created successfully!');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save student.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Bio-Data' },
    { id: 'academic', label: 'Academic & Branch' },
    { id: 'qualifications', label: '10th & Inter Qualifications' },
    { id: 'contact', label: 'Contact & IDs' },
    { id: 'parents', label: 'Parents Info' },
  ];

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="modal-title">
              {isEditing ? <FaPenToSquare style={{ color: 'var(--amber)' }} /> : <FaEye style={{ color: 'var(--sky)' }} />}
              {isExistingStudent
                ? (isEditing ? `Edit Student: ${form.name}` : `Student Details: ${form.name}`)
                : 'Add New Student Record'
              }
            </span>
            {isExistingStudent && !isEditing && (
              <span className="badge badge-sky" style={{ fontSize: 11 }}>Read-Only View</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {isExistingStudent && !isEditing && (
              <button
                type="button"
                className="btn btn-outline-indigo btn-sm"
                onClick={() => setIsEditing(true)}
              >
                <FaPenToSquare /> Edit Details
              </button>
            )}
            <button className="modal-close" onClick={onClose}><FaXmark /></button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '0 26px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                background: 'none', border: 'none', fontFamily: 'inherit',
                padding: '12px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                color: tab === t.id ? 'var(--indigo-light)' : 'var(--text-muted)',
                borderBottom: tab === t.id ? '2px solid var(--indigo)' : '2px solid transparent',
                transition: 'all 0.15s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {/* READ-ONLY VIEW MODE */}
            {!isEditing ? (
              <div>
                {/* Hero Header */}
                <div style={{
                  display: 'flex', gap: 20, alignItems: 'center', padding: '16px 20px',
                  background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 'var(--radius-lg)', marginBottom: 20
                }}>
                  {form.photoUrl ? (
                    <img src={form.photoUrl} alt={form.name} style={{ width: 80, height: 80, borderRadius: 14, objectFit: 'cover', border: '2px solid var(--indigo)' }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: 14, background: 'linear-gradient(135deg, var(--indigo), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#fff' }}>
                      {form.name?.charAt(0)}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo-light)' }}>{form.rollNumber}</div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, margin: '2px 0 8px 0' }}>{form.name}</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge badge-indigo">{form.branch}</span>
                      <span className="badge badge-sky">Section {form.section}</span>
                      <span className="badge badge-purple">{form.year} Year</span>
                      <span className="badge badge-amber">{form.course}</span>
                      <span className="badge badge-emerald">{form.admissionType}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--indigo-light)' }}>{form.gpa}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CGPA</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--emerald)', marginTop: 4 }}>{form.attendance}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Attendance</div>
                  </div>
                </div>

                {/* Tab content in view mode */}
                {tab === 'personal' && (
                  <div className="detail-card">
                    <div className="detail-card-header"><FaIdCard /> Personal Information</div>
                    <table className="detail-table">
                      <tbody>
                        <tr><td>Roll Number:</td><td style={{ fontWeight: 700, color: 'var(--indigo-light)' }}>{form.rollNumber}</td></tr>
                        <tr><td>Student Full Name:</td><td style={{ fontWeight: 700 }}>{form.name}</td></tr>
                        <tr><td>Date of Birth:</td><td>{form.dob || '—'}</td></tr>
                        <tr><td>Gender & Religion:</td><td>{form.gender}, {form.religion}</td></tr>
                        <tr><td>Nationality:</td><td>{form.nationality}</td></tr>
                        <tr><td>Remarks:</td><td>{form.remarks || '—'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {tab === 'academic' && (
                  <div className="detail-card">
                    <div className="detail-card-header"><FaGraduationCap /> Academic Details</div>
                    <table className="detail-table">
                      <tbody>
                        <tr><td>Course:</td><td><span className="badge badge-amber">{form.course}</span></td></tr>
                        <tr><td>Branch & Section:</td><td>{form.branch} (Section {form.section})</td></tr>
                        <tr><td>Academic Year & Sem:</td><td>Year {form.year} · {form.semester}</td></tr>
                        <tr><td>Admission Type:</td><td>{form.admissionType}</td></tr>
                        <tr><td>Admission No:</td><td>{form.admissionNo || '—'}</td></tr>
                        <tr><td>Entrance Exam:</td><td><span className="badge badge-sky">{form.entranceType}</span> (Rank: {form.cetRank || '—'})</td></tr>
                        <tr><td>Seat Quota Category:</td><td><span className="badge badge-indigo">{form.seatCategory}</span></td></tr>
                        <tr><td>CGPA & Marks %:</td><td>CGPA: {form.gpa} / 10.0 · Marks: {form.marksPercentage}%</td></tr>
                        <tr><td>Attendance %:</td><td><span className={`badge ${parseFloat(form.attendance) >= 75 ? 'badge-emerald' : 'badge-rose'}`}>{form.attendance}%</span></td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {tab === 'qualifications' && (
                  <div className="detail-card">
                    <div className="detail-card-header"><FaGraduationCap /> Educational Qualifications (10th & Intermediate / Diploma)</div>
                    <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Qualification</th>
                            <th>Board / University</th>
                            <th>H.T. Roll No</th>
                            <th>Year of Pass</th>
                            <th>Institution / School</th>
                            <th>Obtained / Max</th>
                            <th>Percentage</th>
                            <th>Grade Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.educationDetails.map((q, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 700 }}>{q.qualification}</td>
                              <td>{q.board || '—'}</td>
                              <td><span style={{ fontWeight: 600, color: 'var(--indigo-light)' }}>{q.htNo || '—'}</span></td>
                              <td>{q.yearOfPass || '—'}</td>
                              <td style={{ fontSize: 12 }}>{q.institute || '—'}</td>
                              <td>{q.obtainedMarks ? `${q.obtainedMarks} / ${q.maxMarks}` : '—'}</td>
                              <td><span style={{ color: 'var(--emerald)', fontWeight: 700 }}>{q.percentage ? `${q.percentage}%` : '—'}</span></td>
                              <td><span style={{ color: 'var(--indigo-light)', fontWeight: 700 }}>{q.gradePoints || '—'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {tab === 'contact' && (
                  <div className="detail-card">
                    <div className="detail-card-header"><FaAddressBook /> Contact & Identifiers</div>
                    <table className="detail-table">
                      <tbody>
                        <tr><td>Mobile Phone:</td><td>{form.phone || '—'}</td></tr>
                        <tr><td>Personal Email:</td><td>{form.personalEmail || '—'}</td></tr>
                        <tr><td>College Email:</td><td>{form.collegeEmail || '—'}</td></tr>
                        <tr><td>Aadhaar Number:</td><td>{form.adharNo || '—'}</td></tr>
                        <tr><td>ABC ID:</td><td>{form.abcId || '—'}</td></tr>
                        <tr><td>Bank Account No:</td><td>{form.bankAccNo || '—'}</td></tr>
                        <tr><td>Fee Reimbursement:</td><td><span className={`badge ${form.reimbursement === 'Yes' ? 'badge-emerald' : 'badge-rose'}`}>{form.reimbursement}</span></td></tr>
                        <tr><td>Transport Halt:</td><td>{form.transportHalt || '—'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {tab === 'parents' && (
                  <div className="detail-card">
                    <div className="detail-card-header"><FaUsers /> Parents Details</div>
                    <table className="detail-table">
                      <tbody>
                        <tr><td>Father Name:</td><td style={{ fontWeight: 700 }}>{form.parentsDetails.fatherName || '—'}</td></tr>
                        <tr><td>Father Occupation:</td><td>{form.parentsDetails.fatherOccupation || '—'}</td></tr>
                        <tr><td>Father Mobile:</td><td>{form.parentsDetails.fatherMobile || '—'}</td></tr>
                        <tr><td>Mother Name:</td><td style={{ fontWeight: 700 }}>{form.parentsDetails.motherName || '—'}</td></tr>
                        <tr><td>Mother Occupation:</td><td>{form.parentsDetails.motherOccupation || '—'}</td></tr>
                        <tr><td>Mother Mobile:</td><td>{form.parentsDetails.motherMobile || '—'}</td></tr>
                        <tr><td>Annual Income:</td><td>₹{parseInt(form.parentsDetails.annualIncome || 0).toLocaleString('en-IN')}</td></tr>
                        <tr><td>Permanent Address:</td><td style={{ fontSize: 12 }}>{form.parentsDetails.permanentAddress || '—'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* EDITABLE FORM MODE */
              <div>
                {tab === 'personal' && (
                  <>
                    <div className="section-title">Personal Bio-Data</div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Roll Number *</label>
                        <input className="form-input" value={form.rollNumber} onChange={e => set('rollNumber', e.target.value)} required disabled={isExistingStudent} placeholder="e.g. 24A81A0629" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Student full name" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Date of Birth</label>
                        <input className="form-input" value={form.dob} onChange={e => set('dob', e.target.value)} placeholder="DD/MM/YYYY" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Gender</label>
                        <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                          <option>Male</option><option>Female</option><option>Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Religion</label>
                        <input className="form-input" value={form.religion} onChange={e => set('religion', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Nationality</label>
                        <input className="form-input" value={form.nationality} onChange={e => set('nationality', e.target.value)} />
                      </div>
                      <div className="form-group form-full">
                        <label className="form-label">Student Photo</label>
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
                                width: 80, height: 80, borderRadius: 12, flexShrink: 0,
                                background: form.photoUrl ? 'transparent' : 'var(--bg-input)',
                                border: '2px dashed var(--border-color)',
                                overflow: 'hidden', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 24, cursor: 'pointer',
                              }}
                              onClick={() => photoRef.current?.click()}
                            >
                              {form.photoUrl ? <img src={form.photoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📷'}
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
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            {form.photoUrl && <img src={form.photoUrl} alt="preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />}
                            <input className="form-input" value={form.photoUrl} onChange={e => set('photoUrl', e.target.value)} placeholder="https://example.com/photo.jpg" style={{ flex: 1 }} />
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Remarks</label>
                        <input className="form-input" value={form.remarks} onChange={e => set('remarks', e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                {tab === 'academic' && (
                  <>
                    <div className="section-title">Academic & Branch Details</div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Course *</label>
                        <select className="form-select" value={form.course} onChange={e => set('course', e.target.value)}>
                          {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Branch *</label>
                        <select className="form-select" value={form.branch} onChange={e => set('branch', e.target.value)}>
                          {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Section</label>
                        <select className="form-select" value={form.section} onChange={e => set('section', e.target.value)}>
                          {['A','B','C','D','E'].map(s => <option key={s} value={s}>Section {s}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Year of Study</label>
                        <select className="form-select" value={form.year} onChange={e => set('year', e.target.value)}>
                          <option value="1">1st Year</option><option value="2">2nd Year</option>
                          <option value="3">3rd Year</option><option value="4">4th Year</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Semester</label>
                        <select className="form-select" value={form.semester} onChange={e => set('semester', e.target.value)}>
                          {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Admission Type</label>
                        <select className="form-select" value={form.admissionType} onChange={e => set('admissionType', e.target.value)}>
                          <option value="Regular">Regular</option>
                          <option value="Lateral Entry">Lateral Entry</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Entrance Exam Type *</label>
                        <select className="form-select" value={form.entranceType} onChange={e => set('entranceType', e.target.value)}>
                          {ENTRANCE_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Seat Quota Category *</label>
                        <select className="form-select" value={form.seatCategory} onChange={e => set('seatCategory', e.target.value)}>
                          {SEAT_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">CET Rank</label>
                        <input className="form-input" value={form.cetRank} onChange={e => set('cetRank', e.target.value)} placeholder="e.g. 12450" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Admission No</label>
                        <input className="form-input" value={form.admissionNo} onChange={e => set('admissionNo', e.target.value)} placeholder="e.g. 047/CST/2024" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">CGPA (0.0 - 10.0)</label>
                        <input className="form-input" type="number" step="0.01" min="0" max="10" value={form.gpa} onChange={e => set('gpa', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Marks % (0 - 100)</label>
                        <input className="form-input" type="number" step="0.1" min="0" max="100" value={form.marksPercentage} onChange={e => set('marksPercentage', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Attendance % (0 - 100)</label>
                        <input className="form-input" type="number" step="0.1" min="0" max="100" value={form.attendance} onChange={e => set('attendance', e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                {/* EDUCATIONAL QUALIFICATIONS TAB (10th & INTERMEDIATE DETAILS) */}
                {tab === 'qualifications' && (
                  <>
                    <div className="section-title">🎓 Educational Qualifications (10th & Intermediate / Diploma)</div>
                    {form.educationDetails.map((q, idx) => (
                      <div key={idx} style={{
                        background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)', padding: 18, marginBottom: 18
                      }}>
                        <div style={{ fontWeight: 800, color: 'var(--indigo-light)', fontSize: 14, marginBottom: 12 }}>
                          {idx === 0 ? '📌 10th Class (SSC / CBSE / ICSE)' : '📌 Intermediate / Diploma (10+2)'}
                        </div>
                        <div className="form-grid">
                          <div className="form-group">
                            <label className="form-label">Qualification Name</label>
                            <input className="form-input" value={q.qualification} onChange={e => setEd(idx, 'qualification', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Board / University</label>
                            <input className="form-input" value={q.board} onChange={e => setEd(idx, 'board', e.target.value)} placeholder="e.g. BSEAP / BIEAP / CBSE" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">H.T. Roll No</label>
                            <input className="form-input" value={q.htNo} onChange={e => setEd(idx, 'htNo', e.target.value)} placeholder="Hall ticket number" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Year of Passing</label>
                            <input className="form-input" value={q.yearOfPass} onChange={e => setEd(idx, 'yearOfPass', e.target.value)} placeholder="e.g. 2022" />
                          </div>
                          <div className="form-group form-full">
                            <label className="form-label">Institution / School / College Name</label>
                            <input className="form-input" value={q.institute} onChange={e => setEd(idx, 'institute', e.target.value)} placeholder="Name of school or junior college" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Marks Obtained</label>
                            <input className="form-input" type="number" value={q.obtainedMarks} onChange={e => setEd(idx, 'obtainedMarks', e.target.value)} placeholder="e.g. 576" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Maximum Marks</label>
                            <input className="form-input" type="number" value={q.maxMarks} onChange={e => setEd(idx, 'maxMarks', e.target.value)} placeholder="e.g. 600" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Percentage (%)</label>
                            <input className="form-input" value={q.percentage} onChange={e => setEd(idx, 'percentage', e.target.value)} placeholder="e.g. 96.0" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Grade Points / CGPA</label>
                            <input className="form-input" value={q.gradePoints} onChange={e => setEd(idx, 'gradePoints', e.target.value)} placeholder="e.g. 9.8" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {tab === 'contact' && (
                  <>
                    <div className="section-title">Contact & Identification</div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Mobile / Phone</label>
                        <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Personal Email</label>
                        <input className="form-input" type="email" value={form.personalEmail} onChange={e => set('personalEmail', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">College Email</label>
                        <input className="form-input" type="email" value={form.collegeEmail} onChange={e => set('collegeEmail', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Aadhaar Number</label>
                        <input className="form-input" value={form.adharNo} onChange={e => set('adharNo', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">ABC ID</label>
                        <input className="form-input" value={form.abcId} onChange={e => set('abcId', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Bank Account No</label>
                        <input className="form-input" value={form.bankAccNo} onChange={e => set('bankAccNo', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Fee Reimbursement</label>
                        <select className="form-select" value={form.reimbursement} onChange={e => set('reimbursement', e.target.value)}>
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Transport Halt</label>
                        <input className="form-input" value={form.transportHalt} onChange={e => set('transportHalt', e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                {tab === 'parents' && (
                  <>
                    <div className="section-title">Parents & Guardian Details</div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Father Name</label>
                        <input className="form-input" value={form.parentsDetails.fatherName} onChange={e => setPd('fatherName', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Father Occupation</label>
                        <input className="form-input" value={form.parentsDetails.fatherOccupation} onChange={e => setPd('fatherOccupation', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Father Mobile</label>
                        <input className="form-input" value={form.parentsDetails.fatherMobile} onChange={e => setPd('fatherMobile', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Father Email</label>
                        <input className="form-input" value={form.parentsDetails.fatherMail} onChange={e => setPd('fatherMail', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Mother Name</label>
                        <input className="form-input" value={form.parentsDetails.motherName} onChange={e => setPd('motherName', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Mother Occupation</label>
                        <input className="form-input" value={form.parentsDetails.motherOccupation} onChange={e => setPd('motherOccupation', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Mother Mobile</label>
                        <input className="form-input" value={form.parentsDetails.motherMobile} onChange={e => setPd('motherMobile', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Annual Income (₹)</label>
                        <input className="form-input" type="number" value={form.parentsDetails.annualIncome} onChange={e => setPd('annualIncome', e.target.value)} />
                      </div>
                      <div className="form-group form-full">
                        <label className="form-label">Permanent Address</label>
                        <textarea className="form-textarea" value={form.parentsDetails.permanentAddress} onChange={e => setPd('permanentAddress', e.target.value)} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Close
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              {tabs.map(t => t.id !== tab && (
                <button key={t.id} type="button" className="btn btn-ghost btn-sm" onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {isEditing ? (
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : <><FaFloppyDisk /> {isExistingStudent ? 'Update Student Record' : 'Save Student'}</>}
              </button>
            ) : (
              <button type="button" className="btn btn-outline-indigo" onClick={() => setIsEditing(true)}>
                <FaPenToSquare /> Edit Details
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
