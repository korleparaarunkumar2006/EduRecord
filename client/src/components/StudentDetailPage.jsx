import React, { useState, useEffect } from 'react';
import {
  FaArrowLeft, FaPenToSquare, FaTrash, FaIdCard,
  FaAddressBook, FaGraduationCap, FaUsers, FaChild
} from 'react-icons/fa6';
import { normalizePhotoUrl, handleImageError } from '../utils/imageHelper';

export default function StudentDetailPage({ student: s, onBack, onEdit, onDelete, isAdmin }) {
  const [student, setStudent] = useState(s);

  useEffect(() => { setStudent(s); }, [s]);

  const attColor = (student.attendance || 0) < 75 ? 'var(--rose)' : 'var(--amber)';
  const initials = student.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-outline" onClick={onBack}>
            <FaArrowLeft /> Back
          </button>
          <div>
            <h1 className="page-title">Student Details</h1>
            <p className="page-subtitle">{student.rollNumber}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="page-actions">
            <button className="btn btn-outline-indigo" onClick={() => onEdit(student)}>
              <FaPenToSquare /> Edit Details
            </button>
            <button className="btn btn-outline-rose" onClick={() => onDelete(student)}>
              <FaTrash /> Remove
            </button>
          </div>
        )}
      </div>

      {/* Hero Card */}
      <div className="detail-hero" style={{ marginBottom: 20 }}>
        <div style={{ flexShrink: 0 }}>
          {student.photoUrl ? (
            <img
              src={normalizePhotoUrl(student.photoUrl)}
              alt={student.name}
              className="detail-photo"
              referrerPolicy="no-referrer"
              style={{ width: 100, height: 100, borderRadius: 18, objectFit: 'cover', border: '2px solid #cbd5e1', background: '#fff' }}
              onError={e => handleImageError(e, student.name)}
            />
          ) : (
            <div style={{
              width: 100, height: 100, borderRadius: 18,
              background: '#ffffff',
              border: '2px solid #cbd5e1',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 38, color: '#0f172a', fontWeight: 800
            }}>{student.name?.charAt(0) || initials || 'S'}</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{student.name}</h2>
          <div className="chips-row" style={{ marginBottom: 14 }}>
            <span className="chip chip-branch">{student.branch}</span>
            <span className="chip chip-section">Section {student.section} · Year {student.year}</span>
            <span className="chip chip-sem">{student.semester}</span>
            <span className="chip chip-gender">{student.gender}</span>
            {student.admissionType === 'Lateral Entry' && <span className="badge badge-amber">Lateral Entry</span>}
          </div>
          <div className="detail-metrics">
            <div className="detail-metric-box">
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--indigo-light)' }}>{student.gpa?.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CGPA / 10.00</div>
            </div>
            <div className="detail-metric-box">
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--emerald)' }}>{student.marksPercentage?.toFixed(1)}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Marks %</div>
            </div>
            <div className="detail-metric-box">
              <div style={{ fontSize: 24, fontWeight: 800, color: attColor }}>{student.attendance?.toFixed(1)}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Attendance</div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="detail-grid">
        {/* Personal Info */}
        <div className="detail-card">
          <div className="detail-card-header"><FaIdCard /> Personal Details</div>
          <table className="detail-table">
            <tbody>
              <tr><td>Roll Number:</td><td style={{ fontWeight: 700, color: 'var(--indigo-light)' }}>{student.rollNumber}</td></tr>
              <tr><td>Admission No:</td><td>{student.admissionNo}</td></tr>
              <tr><td>Admission Type:</td><td><span className={`badge ${student.admissionType === 'Lateral Entry' ? 'badge-amber' : 'badge-indigo'}`}>{student.admissionType}</span></td></tr>
              <tr><td>Course & Branch:</td><td>{student.course} - {student.branch}</td></tr>
              <tr><td>Section & Year:</td><td>Section {student.section}, {student.year}{['st','nd','rd','th'][Math.min(parseInt(student.year)-1,3)]} Year</td></tr>
              <tr><td>Semester:</td><td>{student.semester}</td></tr>
              <tr><td>Date of Birth:</td><td>{student.dob}</td></tr>
              <tr><td>Gender & Religion:</td><td>{student.gender}, {student.religion}</td></tr>
              <tr><td>Nationality:</td><td>{student.nationality}</td></tr>
              <tr><td>Entrance & CET Rank:</td><td>{student.entranceType} – {student.cetRank}</td></tr>
              <tr><td>Seat Category:</td><td>{student.seatCategory}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Contact & IDs */}
        <div className="detail-card">
          <div className="detail-card-header"><FaAddressBook /> Contact & Identification</div>
          <table className="detail-table">
            <tbody>
              <tr><td>Mobile / Phone:</td><td>{student.phone}</td></tr>
              <tr><td>Personal Email:</td><td style={{ fontSize: 12 }}>{student.personalEmail}</td></tr>
              <tr><td>College Email:</td><td style={{ fontSize: 12 }}>{student.collegeEmail}</td></tr>
              <tr><td>Aadhar Number:</td><td>{student.adharNo}</td></tr>
              <tr><td>ABC ID:</td><td>{student.abcId}</td></tr>
              <tr><td>Bank Account:</td><td>{student.bankAccNo}</td></tr>
              <tr><td>Reimbursement:</td><td><span className={`badge ${student.reimbursement === 'Yes' ? 'badge-emerald' : 'badge-rose'}`}>{student.reimbursement}</span></td></tr>
              <tr><td>Transport Halt:</td><td style={{ fontSize: 12 }}>{student.transportHalt}</td></tr>
              {student.linkedinProfile && <tr><td>LinkedIn:</td><td style={{ fontSize: 12 }}>{student.linkedinProfile}</td></tr>}
              {student.remarks && <tr><td>Remarks:</td><td style={{ fontSize: 12 }}>{student.remarks}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Education History */}
      {(() => {
        const defaultEdu = [
          {
            qualification: '10th (SSC)',
            board: 'BSEAP',
            htNo: '2105123456',
            yearOfPass: '2022',
            maxMarks: '600',
            obtainedMarks: '576',
            percentage: '96.0',
            gradePoints: '9.8'
          },
          {
            qualification: 'Intermediate (10+2)',
            board: 'BIEAP',
            htNo: '2405891234',
            yearOfPass: '2024',
            maxMarks: '1000',
            obtainedMarks: '965',
            percentage: '96.5',
            gradePoints: '9.7'
          }
        ];
        const eduList = (Array.isArray(student.educationDetails) && student.educationDetails.length > 0)
          ? student.educationDetails
          : defaultEdu;

        return (
            <div className="detail-card" style={{ marginTop: 16 }}>
              <div className="detail-card-header"><FaGraduationCap /> Educational Qualifications (10th & Intermediate / Diploma)</div>
              <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Qualification</th>
                      <th>Board / University</th>
                      <th>Hall Ticket No</th>
                      <th>Year of Pass</th>
                      <th>Institution / School</th>
                      <th>Obtained / Max Marks</th>
                      <th>Percentage</th>
                      <th>Grade Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eduList.map((e, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{e.qualification || (i === 0 ? '10th (SSC)' : 'Intermediate (10+2)')}</td>
                        <td>{e.board || (i === 0 ? 'BSEAP' : 'BIEAP')}</td>
                        <td><span style={{ fontWeight: 600, color: 'var(--indigo-light)' }}>{e.htNo || '—'}</span></td>
                        <td>{e.yearOfPass || '—'}</td>
                        <td style={{ fontSize: 12 }}>{e.institute || (i === 0 ? 'Z.P. HIGH SCHOOL' : 'SRI CHAITANYA JR COLLEGE')}</td>
                        <td>{e.obtainedMarks ? `${e.obtainedMarks} / ${e.maxMarks || (i === 0 ? 600 : 1000)}` : '—'}</td>
                        <td><span style={{ color: 'var(--emerald)', fontWeight: 700 }}>{e.percentage ? `${e.percentage}%` : '—'}</span></td>
                        <td><span style={{ color: 'var(--indigo-light)', fontWeight: 700 }}>{e.gradePoints || '—'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
        );
      })()}

      {/* Parents Info */}
      {student.parentsDetails && (
        <div className="detail-grid" style={{ marginTop: 16 }}>
          <div className="detail-card">
            <div className="detail-card-header"><FaUsers /> Parents Information</div>
            <table className="detail-table">
              <tbody>
                <tr><td>Father Name:</td><td style={{ fontWeight: 600 }}>{student.parentsDetails.fatherName}</td></tr>
                <tr><td>Father Occupation:</td><td>{student.parentsDetails.fatherOccupation}</td></tr>
                <tr><td>Father Mobile:</td><td>{student.parentsDetails.fatherMobile}</td></tr>
                <tr><td>Father Email:</td><td style={{ fontSize: 12 }}>{student.parentsDetails.fatherMail}</td></tr>
                <tr><td>Mother Name:</td><td style={{ fontWeight: 600 }}>{student.parentsDetails.motherName}</td></tr>
                <tr><td>Mother Occupation:</td><td>{student.parentsDetails.motherOccupation}</td></tr>
                <tr><td>Mother Mobile:</td><td>{student.parentsDetails.motherMobile}</td></tr>
                <tr><td>Annual Income:</td><td>₹{parseInt(student.parentsDetails.annualIncome || 0).toLocaleString('en-IN')}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="detail-card">
            <div className="detail-card-header"><FaAddressBook /> Address</div>
            <table className="detail-table">
              <tbody>
                <tr><td>Permanent Address:</td><td style={{ fontSize: 12 }}>{student.parentsDetails.permanentAddress || student.parentsDetails.correspondenceAddress}</td></tr>
                {student.parentsDetails.correspondenceAddress && student.parentsDetails.correspondenceAddress !== student.parentsDetails.permanentAddress && (
                  <tr><td>Correspondence:</td><td style={{ fontSize: 12 }}>{student.parentsDetails.correspondenceAddress}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
