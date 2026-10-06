import React, { useEffect, useState } from 'react';
import {
  FaUsers, FaStar, FaChartLine, FaClipboardCheck,
  FaTriangleExclamation, FaGraduationCap, FaArrowTrendUp, FaBan,
  FaSliders
} from 'react-icons/fa6';
import { getAnalytics } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SmartFilterModal, { DEFAULT_SMART_FILTERS } from '../components/SmartFilterModal';

export default function DashboardPage() {
  const { faculty } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSmartFilterModal, setShowSmartFilterModal] = useState(false);

  useEffect(() => {
    getAnalytics({})
      .then(res => { if (res.data.success) setAnalytics(res.data.analytics); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = analytics ? [
    {
      icon: <FaUsers />, colorClass: 'indigo',
      value: analytics.totalStudents, label: 'Total Students',
    },
    {
      icon: <FaArrowTrendUp />, colorClass: 'emerald',
      value: analytics.avgGPA, label: 'Avg. CGPA',
    },
    {
      icon: <FaChartLine />, colorClass: 'purple',
      value: `${analytics.avgMarksPercent}%`, label: 'Avg. Marks %',
    },
    {
      icon: <FaClipboardCheck />, colorClass: 'sky',
      value: `${analytics.avgAttendance}%`, label: 'Avg. Attendance',
    },
    {
      icon: <FaStar />, colorClass: 'amber',
      value: analytics.highPerformers, label: 'High Performers (≥8.5)',
    },
    {
      icon: <FaGraduationCap />, colorClass: 'emerald',
      value: analytics.eligibleCount, label: 'Exam Eligible',
    },
    {
      icon: <FaTriangleExclamation />, colorClass: 'rose',
      value: analytics.lowAttendanceCount, label: 'Low Attendance (<75%)',
    },
  ] : [];

  const handleApplySmartFilter = (filters) => {
    let queryParams = [];
    if (filters.preset === 'High Performers (CGPA ≥ 8.5)' || filters.minCgpa >= 8.5) {
      queryParams.push('eligibility=HIGH_PERFORMERS');
    }
    if (filters.preset === 'Low Attendance (< 75%)' || (filters.maxAttendance < 100 && filters.maxAttendance <= 75)) {
      queryParams.push(`maxAtt=${filters.maxAttendance}`);
      queryParams.push('eligibility=LOW_ATTENDANCE');
    } else if (filters.maxAttendance < 100) {
      queryParams.push(`maxAtt=${filters.maxAttendance}`);
    }
    if (filters.minAttendance > 0) queryParams.push(`minAtt=${filters.minAttendance}`);
    if (filters.branch && filters.branch !== 'ALL') queryParams.push(`branch=${filters.branch}`);
    if (filters.year && filters.year !== 'ALL') queryParams.push(`year=${filters.year}`);
    if (filters.semester && filters.semester !== 'ALL') queryParams.push(`semester=${encodeURIComponent(filters.semester)}`);
    navigate(`/students${queryParams.length ? '?' + queryParams.join('&') : ''}`);
  };

  return (
    <div className="fade-in">
      {/* Welcome Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 26 }}>
            Welcome back, {faculty?.name?.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">
            {faculty?.role === 'admin' ? 'HOD / Admin' : 'Faculty Member'} ·{' '}
            {faculty?.department}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline-indigo" onClick={() => setShowSmartFilterModal(true)}>
            <FaSliders /> Smart Filter Engine
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/students')}>
            <FaUsers /> View Students
          </button>
          {faculty?.role === 'admin' && (
            <button className="btn btn-outline" onClick={() => navigate('/faculty')}>
              <FaGraduationCap /> Manage Faculty
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="stat-card" style={{ flex: '1 1 160px', animation: 'pulse 1.2s infinite' }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--border-color)' }} />
              <div>
                <div style={{ height: 28, width: 60, background: 'var(--border-color)', borderRadius: 6, marginBottom: 6 }} />
                <div style={{ height: 12, width: 100, background: 'var(--border-color)', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {statCards.map((s, i) => (
            <div className="stat-card fade-in" key={i} style={{ animationDelay: `${i * 0.06}s` }}>
              <div className={`stat-icon ${s.colorClass}`}>{s.icon}</div>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          <QuickCard
            icon={<FaSliders />}
            title="Smart Filter Engine"
            desc="Filter by CGPA, Attendance, Marks & Branches"
            color="purple"
            onClick={() => setShowSmartFilterModal(true)}
          />
          <QuickCard
            icon={<FaUsers />}
            title="Student Records"
            desc="View, search, and manage all student bio-data"
            color="indigo"
            onClick={() => navigate('/students')}
          />
          {faculty?.role === 'admin' && (
            <QuickCard
              icon={<FaGraduationCap />}
              title="Faculty Management"
              desc="Add, edit, or remove faculty accounts"
              color="emerald"
              onClick={() => navigate('/faculty')}
            />
          )}
          <QuickCard
            icon={<FaStar />}
            title="High Performers"
            desc="Students with CGPA ≥ 8.5"
            color="amber"
            onClick={() => navigate('/students?eligibility=HIGH_PERFORMERS')}
          />
          <QuickCard
            icon={<FaBan />}
            title="Low Attendance"
            desc="Students below 75% attendance"
            color="rose"
            onClick={() => navigate('/students?maxAtt=74')}
          />
        </div>
      </div>

      {/* System Info */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)' }}>
          🔐 System Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, fontSize: 13 }}>
          <InfoRow label="Logged In As" value={faculty?.facultyId} />
          <InfoRow label="Role" value={faculty?.role === 'admin' ? 'Admin / HOD' : 'Faculty'} />
          <InfoRow label="Department" value={faculty?.department} />
          <InfoRow label="Designation" value={faculty?.designation} />
        </div>
      </div>

      {/* Smart Filter Modal */}
      {showSmartFilterModal && (
        <SmartFilterModal
          filters={DEFAULT_SMART_FILTERS}
          onApply={handleApplySmartFilter}
          onClose={() => setShowSmartFilterModal(false)}
          onReset={() => {}}
        />
      )}
    </div>
  );
}

function QuickCard({ icon, title, desc, color, onClick }) {
  return (
    <div
      className="card"
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `rgba(var(--${color}-rgb,99,102,241), 0.12)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, marginBottom: 12,
        ...(color === 'indigo' && { background: 'rgba(99,102,241,0.12)', color: 'var(--indigo)' }),
        ...(color === 'purple' && { background: 'rgba(167,139,250,0.12)', color: 'var(--purple)' }),
        ...(color === 'amber' && { background: 'rgba(245,158,11,0.12)', color: 'var(--amber)' }),
        ...(color === 'rose' && { background: 'rgba(244,63,94,0.12)', color: 'var(--rose)' }),
        ...(color === 'emerald' && { background: 'rgba(52,211,153,0.12)', color: 'var(--emerald)' }),
      }}>
        {icon}
      </div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{value || '—'}</div>
    </div>
  );
}
