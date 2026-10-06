const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const { getDBState, getMemoryStudents, setMemoryStudents } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// All routes require faculty token authentication
router.use(verifyToken);

// Middleware to enforce Single HOD/Admin Faculty privileges for Add, Edit, Delete
const requireAdmin = (req, res, next) => {
  if (!req.faculty || req.faculty.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Editing, adding, or removing student records is restricted strictly to HOD / Admin Faculty.'
    });
  }
  next();
};

function normalizePhotoUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;

  // Google Drive sharing links
  const gDriveMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=view&)?id=)|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${gDriveMatch[1]}&sz=w1000`;
  }

  // Dropbox
  if (url.includes('dropbox.com')) {
    if (url.includes('dl=0')) return url.replace('dl=0', 'raw=1');
    if (!url.includes('raw=1')) return url.includes('?') ? `${url}&raw=1` : `${url}?raw=1`;
    return url;
  }

  // GitHub
  const githubMatch = url.match(/https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/);
  if (githubMatch) {
    return `https://raw.githubusercontent.com/${githubMatch[1]}/${githubMatch[2]}/${githubMatch[3]}/${githubMatch[4]}`;
  }

  // Imgur
  const imgurMatch = url.match(/^https?:\/\/(?:i\.)?imgur\.com\/([a-zA-Z0-9]+)$/);
  if (imgurMatch) return `https://i.imgur.com/${imgurMatch[1]}.jpg`;

  return url;
}

// Normalizes any branch name variant to the canonical abbreviation used by filters
function normalizeBranch(raw) {
  if (!raw) return 'ECE';
  const b = String(raw).trim().toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9 &]/g, '');

  const KNOWN = ['CSE','CST','AIML','CAI','DS','ECE','ECT','EEE','MEC','CIVIL','IT'];
  if (KNOWN.includes(b)) return b;

  const MAP = [
    ['COMPUTER SCIENCE AND ENGINEERING', 'CSE'],
    ['COMPUTER SCIENCE & ENGINEERING', 'CSE'],
    ['COMPUTER SCIENCE ENGINEERING', 'CSE'],
    ['B.TECH CSE', 'CSE'],
    ['BTECH CSE', 'CSE'],
    ['COMPUTER SCIENCE AND TECHNOLOGY', 'CST'],
    ['COMPUTER SCIENCE & TECHNOLOGY', 'CST'],
    ['COMPUTER SCIENCE TECHNOLOGY', 'CST'],
    ['ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING', 'AIML'],
    ['ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', 'AIML'],
    ['AI AND ML', 'AIML'],
    ['AI & ML', 'AIML'],
    ['COMPUTER AND ARTIFICIAL INTELLIGENCE', 'CAI'],
    ['COMPUTER & ARTIFICIAL INTELLIGENCE', 'CAI'],
    ['COMPUTER ARTIFICIAL INTELLIGENCE', 'CAI'],
    ['DATA SCIENCE AND ENGINEERING', 'DS'],
    ['DATA SCIENCE & ENGINEERING', 'DS'],
    ['DATA SCIENCE', 'DS'],
    ['ELECTRONICS AND COMMUNICATION ENGINEERING', 'ECE'],
    ['ELECTRONICS & COMMUNICATION ENGINEERING', 'ECE'],
    ['ELECTRONICS AND COMMUNICATION', 'ECE'],
    ['ELECTRONICS & COMMUNICATION', 'ECE'],
    ['ELECTRONICS COMMUNICATION ENGINEERING', 'ECE'],
    ['ELECTRONICS AND COMPUTER TECHNOLOGY', 'ECT'],
    ['ELECTRONICS & COMPUTER TECHNOLOGY', 'ECT'],
    ['ELECTRONICS COMPUTER TECHNOLOGY', 'ECT'],
    ['ELECTRONICS AND COMMUNICATION TECHNOLOGY', 'ECT'],
    ['ELECTRICAL AND ELECTRONICS ENGINEERING', 'EEE'],
    ['ELECTRICAL & ELECTRONICS ENGINEERING', 'EEE'],
    ['ELECTRICAL ELECTRONICS ENGINEERING', 'EEE'],
    ['ELECTRICAL AND ELECTRONICS', 'EEE'],
    ['MECHANICAL ENGINEERING', 'MEC'],
    ['MECHANICAL', 'MEC'],
    ['MECH', 'MEC'],
    ['CIVIL ENGINEERING', 'CIVIL'],
    ['CIVIL ENGG', 'CIVIL'],
    ['INFORMATION TECHNOLOGY', 'IT'],
    ['INFORMATION TECH', 'IT'],
  ];

  for (const [pattern, abbr] of MAP) {
    if (b === pattern || b.includes(pattern)) return abbr;
  }

  // Last resort: strip spaces and check against known list
  const stripped = b.replace(/\s+/g, '');
  if (KNOWN.includes(stripped)) return stripped;

  return stripped.slice(0, 10) || 'ECE';
}

// Returns all known aliases (full names + abbreviation) for a canonical branch abbreviation.
// Used in search/analytics to match students whose branch was stored as a full name.
function getBranchVariants(abbr) {
  const ALIASES = {
    CSE:   ['CSE', 'Computer Science and Engineering', 'Computer Science & Engineering', 'Computer Science Engineering', 'COMPUTER SCIENCE AND ENGINEERING', 'COMPUTER SCIENCE & ENGINEERING', 'COMPUTER SCIENCE ENGINEERING', 'B.Tech CSE', 'BTech CSE'],
    CST:   ['CST', 'Computer Science and Technology', 'Computer Science & Technology', 'Computer Science Technology', 'COMPUTER SCIENCE AND TECHNOLOGY', 'COMPUTER SCIENCE & TECHNOLOGY'],
    AIML:  ['AIML', 'Artificial Intelligence and Machine Learning', 'Artificial Intelligence & Machine Learning', 'AI and ML', 'AI & ML', 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING', 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING'],
    CAI:   ['CAI', 'Computer and Artificial Intelligence', 'Computer & Artificial Intelligence', 'Computer Artificial Intelligence', 'COMPUTER AND ARTIFICIAL INTELLIGENCE'],
    DS:    ['DS', 'Data Science', 'Data Science and Engineering', 'Data Science & Engineering', 'DATA SCIENCE', 'DATA SCIENCE AND ENGINEERING'],
    ECE:   ['ECE', 'Electronics and Communication Engineering', 'Electronics & Communication Engineering', 'Electronics and Communication', 'Electronics Communication Engineering', 'ELECTRONICS AND COMMUNICATION ENGINEERING', 'ELECTRONICS & COMMUNICATION ENGINEERING', 'ELECTRONICS AND COMMUNICATION'],
    ECT:   ['ECT', 'Electronics and Computer Technology', 'Electronics & Computer Technology', 'Electronics Computer Technology', 'Electronics and Communication Technology', 'ELECTRONICS AND COMPUTER TECHNOLOGY', 'ELECTRONICS AND COMMUNICATION TECHNOLOGY'],
    EEE:   ['EEE', 'Electrical and Electronics Engineering', 'Electrical & Electronics Engineering', 'Electrical Electronics Engineering', 'Electrical and Electronics', 'ELECTRICAL AND ELECTRONICS ENGINEERING', 'ELECTRICAL & ELECTRONICS ENGINEERING'],
    MEC:   ['MEC', 'Mechanical Engineering', 'Mechanical', 'MECH', 'MECHANICAL ENGINEERING', 'MECHANICAL'],
    CIVIL: ['CIVIL', 'Civil Engineering', 'Civil Engg', 'CIVIL ENGINEERING', 'CIVIL ENGG'],
    IT:    ['IT', 'Information Technology', 'Information Tech', 'INFORMATION TECHNOLOGY', 'INFORMATION TECH'],
  };
  const canon = normalizeBranch(abbr);
  return ALIASES[canon] || [abbr];
}

function jsonToCSV(items, selectedFields = null) {
  if (!items || items.length === 0) return '';

  const allFieldDefinitions = [
    { key: 'rollNumber', label: 'Roll Number' },
    { key: 'name', label: 'Student Name' },
    { key: 'admissionNo', label: 'Admission Number' },
    { key: 'admissionType', label: 'Admission Type' },
    { key: 'course', label: 'Course' },
    { key: 'branch', label: 'Branch' },
    { key: 'section', label: 'Section' },
    { key: 'year', label: 'Academic Year' },
    { key: 'semester', label: 'Semester' },
    { key: 'gpa', label: 'CGPA' },
    { key: 'marksPercentage', label: 'Marks Percentage' },
    { key: 'attendance', label: 'Attendance %' },
    { key: 'phone', label: 'Mobile / Phone' },
    { key: 'personalEmail', label: 'Personal Email' },
    { key: 'collegeEmail', label: 'College Email' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'gender', label: 'Gender' },
    { key: 'religion', label: 'Religion' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'entranceType', label: 'Entrance Type' },
    { key: 'cetRank', label: 'CET Rank' },
    { key: 'seatCategory', label: 'Seat Category' },
    { key: 'adharNo', label: 'Aadhar Number' },
    { key: 'abcId', label: 'ABC ID' },
    { key: 'bankAccNo', label: 'Bank Account No' },
    { key: 'reimbursement', label: 'Fee Reimbursement' },
    { key: 'transportHalt', label: 'Transport Halt' },
    { key: 'remarks', label: 'Faculty Remarks' },
    { key: 'fatherName', label: 'Father Name', getVal: s => (s.parentsDetails && s.parentsDetails.fatherName) || '' },
    { key: 'fatherOccupation', label: 'Father Occupation', getVal: s => (s.parentsDetails && s.parentsDetails.fatherOccupation) || '' },
    { key: 'fatherMobile', label: 'Father Mobile', getVal: s => (s.parentsDetails && s.parentsDetails.fatherMobile) || '' },
    { key: 'motherName', label: 'Mother Name', getVal: s => (s.parentsDetails && s.parentsDetails.motherName) || '' },
    { key: 'motherOccupation', label: 'Mother Occupation', getVal: s => (s.parentsDetails && s.parentsDetails.motherOccupation) || '' },
    { key: 'motherMobile', label: 'Mother Mobile', getVal: s => (s.parentsDetails && s.parentsDetails.motherMobile) || '' },
    { key: 'annualIncome', label: 'Parents Annual Income', getVal: s => (s.parentsDetails && s.parentsDetails.annualIncome) || '' },
    { key: 'permanentAddress', label: 'Address', getVal: s => (s.parentsDetails && (s.parentsDetails.permanentAddress || s.parentsDetails.correspondenceAddress)) || '' }
  ];

  let targetDefs = allFieldDefinitions;
  if (Array.isArray(selectedFields) && selectedFields.length > 0) {
    const fieldSet = new Set(selectedFields);
    targetDefs = allFieldDefinitions.filter(f => fieldSet.has(f.key));
  }

  const header = targetDefs.map(d => d.label).join(',');
  const rows = items.map(item => {
    return targetDefs.map(def => {
      let val = '';
      if (def.getVal) {
        val = def.getVal(item);
      } else {
        val = item[def.key] !== undefined && item[def.key] !== null ? String(item[def.key]) : '';
      }
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`;
      }
      return val;
    }).join(',');
  });
  return [header, ...rows].join('\n');
}

// @route   GET /api/students/analytics
// @desc    Get aggregate metrics dynamically calculated for selected Branch, Section, Year, Semester & Range Filters
router.get('/analytics', async (req, res) => {
  try {
    const { branch, section, year, semester, eligibility, minGpa, maxGpa, minAtt, maxAtt, minAttendance, maxAttendance, minCgpa, maxCgpa, admissionType } = req.query;
    const effectiveMinAtt = minAtt !== undefined && minAtt !== '' ? minAtt : minAttendance;
    const effectiveMaxAtt = maxAtt !== undefined && maxAtt !== '' ? maxAtt : maxAttendance;
    const effectiveMinGpa = minGpa !== undefined && minGpa !== '' ? minGpa : minCgpa;
    const effectiveMaxGpa = maxGpa !== undefined && maxGpa !== '' ? maxGpa : maxCgpa;
    const isMongo = getDBState();
    let students = [];

    if (isMongo) {
      let filter = {};
      if (branch && branch !== 'ALL') filter.branch = { $in: getBranchVariants(branch) };
      if (section && section !== 'ALL') filter.section = section;
      if (year && year !== 'ALL') filter.year = String(year);
      if (semester && semester !== 'ALL') filter.semester = semester;
      if (admissionType && admissionType !== 'ALL') filter.admissionType = admissionType;
      students = await Student.find(filter).lean();
    } else {
      const canonBranch = branch && branch !== 'ALL' ? normalizeBranch(branch) : null;
      students = getMemoryStudents().filter(s => {
        const matchesBranch = !canonBranch || normalizeBranch(s.branch) === canonBranch;
        const matchesSection = !section || section === 'ALL' || s.section === section;
        const matchesYear = !year || year === 'ALL' || String(s.year) === String(year);
        const matchesSem = !semester || semester === 'ALL' || s.semester === semester;
        const matchesType = !admissionType || admissionType === 'ALL' || s.admissionType === admissionType;
        return matchesBranch && matchesSection && matchesYear && matchesSem && matchesType;
      });
    }

    if (eligibility && eligibility !== 'ALL') {
      if (eligibility === 'ELIGIBLE') {
        students = students.filter(s => (s.attendance || 0) >= 75 && (s.gpa || 0) >= 6.5);
      } else if (eligibility === 'INELIGIBLE') {
        students = students.filter(s => (s.attendance || 0) < 75 || (s.gpa || 0) < 6.5);
      } else if (eligibility === 'HIGH_PERFORMERS') {
        students = students.filter(s => (s.gpa || 0) >= 8.5);
      } else if (eligibility === 'LOW_ATTENDANCE') {
        students = students.filter(s => (s.attendance || 0) < 75);
      }
    }

    if (effectiveMinGpa !== undefined && effectiveMinGpa !== '') {
      const minG = parseFloat(effectiveMinGpa);
      students = students.filter(s => (s.gpa || 0) >= minG);
    }
    if (effectiveMaxGpa !== undefined && effectiveMaxGpa !== '') {
      const maxG = parseFloat(effectiveMaxGpa);
      students = students.filter(s => (s.gpa || 0) <= maxG);
    }
    if (effectiveMinAtt !== undefined && effectiveMinAtt !== '') {
      const minA = parseFloat(effectiveMinAtt);
      students = students.filter(s => (s.attendance || 0) >= minA);
    }
    if (effectiveMaxAtt !== undefined && effectiveMaxAtt !== '') {
      const maxA = parseFloat(effectiveMaxAtt);
      students = students.filter(s => (s.attendance || 0) <= maxA);
    }

    const totalStudents = students.length;
    const avgGPA = totalStudents > 0 ? (students.reduce((acc, s) => acc + (s.gpa || 0), 0) / totalStudents).toFixed(2) : '0.00';
    const avgMarksPercent = totalStudents > 0 ? (students.reduce((acc, s) => acc + (s.marksPercentage || ((s.gpa || 0) * 10)), 0) / totalStudents).toFixed(1) : '0.0';
    const avgAttendance = totalStudents > 0 ? (students.reduce((acc, s) => acc + (s.attendance || 0), 0) / totalStudents).toFixed(1) : '0.0';
    const highPerformers = students.filter(s => (s.gpa || 0) >= 8.5).length;
    const eligibleCount = students.filter(s => (s.attendance || 0) >= 75 && (s.gpa || 0) >= 6.5).length;
    const lowAttendanceCount = students.filter(s => (s.attendance || 0) < 75).length;

    res.json({
      success: true,
      analytics: {
        totalStudents,
        avgGPA,
        avgMarksPercent,
        avgAttendance,
        highPerformers,
        eligibleCount,
        lowAttendanceCount,
        selectedBranch: branch || 'ALL',
        selectedSection: section || 'ALL',
        selectedYear: year || 'ALL',
        selectedSemester: semester || 'ALL',
        selectedEligibility: eligibility || 'ALL'
      }
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute branch & semester analytics.' });
  }
});

// @route   GET & POST /api/students/export/excel
const handleExcelExport = async (req, res) => {
  try {
    const isMongo = getDBState();
    let students = [];
    if (isMongo) {
      students = await Student.find().sort({ rollNumber: 1 }).lean();
    } else {
      students = getMemoryStudents().sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
    }

    let fields = null;
    if (req.method === 'POST' && req.body && Array.isArray(req.body.fields)) {
      fields = req.body.fields;
    } else if (req.query && req.query.fields) {
      fields = req.query.fields.split(',').map(f => f.trim()).filter(Boolean);
    }

    res.json({ success: true, students, fields });
  } catch (error) {
    console.error('Excel Export Error:', error);
    res.status(500).json({ success: false, message: 'Failed to export Excel student data.' });
  }
};

router.get('/export/excel', handleExcelExport);
router.post('/export/excel', handleExcelExport);
router.get('/export/csv', handleExcelExport);
router.post('/export/csv', handleExcelExport);

function getAgeFromDob(dobStr) {
  if (!dobStr) return null;
  let birthDate = null;
  if (typeof dobStr === 'string') {
    if (dobStr.includes('/')) {
      const parts = dobStr.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else if (parts[0].length === 4) {
          birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
      }
    } else if (dobStr.includes('-')) {
      const parts = dobStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else if (parts[2].length === 4) {
          birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
    }
  }
  if (!birthDate || isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// @route   GET /api/students/filter-options
// @desc    Get dynamic distinct filter values present in DB & schema field metadata
router.get('/filter-options', async (req, res) => {
  try {
    const isMongo = getDBState();
    let allStudents = [];
    if (isMongo) {
      allStudents = await Student.find().lean();
    } else {
      allStudents = getMemoryStudents();
    }

    const getDistinct = (key) => {
      const set = new Set();
      allStudents.forEach(s => {
        if (s[key] !== undefined && s[key] !== null && String(s[key]).trim() !== '') {
          set.add(String(s[key]).trim());
        }
      });
      return Array.from(set).sort();
    };

    const genders = getDistinct('gender');
    const branches = getDistinct('branch');
    const sections = getDistinct('section');
    const years = getDistinct('year');
    const semesters = getDistinct('semester');
    const admissionTypes = getDistinct('admissionType');

    const entranceTypes = getDistinct('entranceType');
    const seatCategories = getDistinct('seatCategory');
    const religions = getDistinct('religion');
    const reimbursements = getDistinct('reimbursement');

    const fields = [
      { key: 'admissionType', label: 'Admission Type (Regular / Lateral Entry)', type: 'categorical', options: Array.from(new Set(admissionTypes)).sort() },
      { key: 'gender', label: 'Gender (Male / Female)', type: 'categorical', options: Array.from(new Set(genders)).sort() },
      { key: 'age', label: 'Age (in Years)', type: 'numeric', min: 15, max: 50 },
      { key: 'branch', label: 'Branch / Department', type: 'categorical', options: branches },
      { key: 'section', label: 'Section', type: 'categorical', options: sections },
      { key: 'year', label: 'Academic Year', type: 'categorical', options: years },
      { key: 'semester', label: 'Semester', type: 'categorical', options: semesters },
      { key: 'gpa', label: 'CGPA (0.0 - 10.0)', type: 'numeric', min: 0, max: 10 },
      { key: 'attendance', label: 'Attendance %', type: 'numeric', min: 0, max: 100 },
      { key: 'marksPercentage', label: 'Marks Percentage %', type: 'numeric', min: 0, max: 100 },
      { key: 'cetRank', label: 'Entrance CET Rank', type: 'numeric', min: 1, max: 200000 },
      { key: 'annualIncome', label: 'Parents Annual Income (₹)', type: 'numeric', min: 0, max: 5000000 },
      { key: 'entranceType', label: 'Entrance Type', type: 'categorical', options: entranceTypes },
      { key: 'seatCategory', label: 'Seat Quota Category', type: 'categorical', options: seatCategories },
      { key: 'religion', label: 'Religion', type: 'categorical', options: religions },
      { key: 'reimbursement', label: 'Fee Reimbursement Status', type: 'categorical', options: reimbursements },
      { key: 'eligibility', label: 'Performance Status (Eligible / Ineligible / High Performers)', type: 'categorical', options: ['ELIGIBLE', 'INELIGIBLE', 'HIGH_PERFORMERS'] }
    ];

    res.json({
      success: true,
      fields
    });
  } catch (error) {
    console.error('Filter options error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch filter options.' });
  }
});

// @route   GET /api/students/search
router.get('/search', async (req, res) => {
  try {
    const {
      q, branch, section, year, semester, eligibility, admissionType,
      minGpa, maxGpa, minAtt, maxAtt, minMarks, maxMarks,
      minAttendance, maxAttendance, minCgpa, maxCgpa,
      gender, minAge, maxAge, entranceType, seatCategory, religion, reimbursement,
      minCetRank, maxCetRank
    } = req.query;

    const effectiveMinAtt = minAtt !== undefined && minAtt !== '' ? minAtt : minAttendance;
    const effectiveMaxAtt = maxAtt !== undefined && maxAtt !== '' ? maxAtt : maxAttendance;
    const effectiveMinGpa = minGpa !== undefined && minGpa !== '' ? minGpa : minCgpa;
    const effectiveMaxGpa = maxGpa !== undefined && maxGpa !== '' ? maxGpa : maxCgpa;

    const queryStr = (q || '').trim().toLowerCase();
    const isMongo = getDBState();
    let students = [];

    if (isMongo) {
      let filter = {};
      if (branch && branch !== 'ALL') filter.branch = { $in: getBranchVariants(branch) };
      if (section && section !== 'ALL') filter.section = section;
      if (year && year !== 'ALL') filter.year = String(year);
      if (semester && semester !== 'ALL') filter.semester = semester;
      if (admissionType && admissionType !== 'ALL') filter.admissionType = admissionType;
      if (gender && gender !== 'ALL') filter.gender = { $regex: new RegExp(`^${gender}$`, 'i') };
      if (entranceType && entranceType !== 'ALL') filter.entranceType = entranceType;
      if (seatCategory && seatCategory !== 'ALL') filter.seatCategory = seatCategory;
      if (religion && religion !== 'ALL') filter.religion = religion;
      if (reimbursement && reimbursement !== 'ALL') filter.reimbursement = reimbursement;

      students = await Student.find(filter).sort({ rollNumber: 1 }).lean();
    } else {
      const canonBranch = branch && branch !== 'ALL' ? normalizeBranch(branch) : null;
      students = getMemoryStudents().filter(s => {
        const matchesBranch = !canonBranch || normalizeBranch(s.branch) === canonBranch;
        const matchesSection = !section || section === 'ALL' || s.section === section;
        const matchesYear = !year || year === 'ALL' || String(s.year) === String(year);
        const matchesSem = !semester || semester === 'ALL' || s.semester === semester;
        const matchesType = !admissionType || admissionType === 'ALL' || (s.admissionType && s.admissionType.toLowerCase() === admissionType.toLowerCase());
        const matchesGender = !gender || gender === 'ALL' || (s.gender && s.gender.toLowerCase() === gender.toLowerCase());
        const matchesEntrance = !entranceType || entranceType === 'ALL' || s.entranceType === entranceType;
        const matchesSeat = !seatCategory || seatCategory === 'ALL' || s.seatCategory === seatCategory;
        const matchesReligion = !religion || religion === 'ALL' || s.religion === religion;
        const matchesReimbursement = !reimbursement || reimbursement === 'ALL' || s.reimbursement === reimbursement;

        return matchesBranch && matchesSection && matchesYear && matchesSem && matchesType && matchesGender && matchesEntrance && matchesSeat && matchesReligion && matchesReimbursement;
      });
    }

    students = students.filter(s => {
      if (queryStr) {
        const ageVal = getAgeFromDob(s.dob);
        const matchesQ =
          (s.rollNumber && s.rollNumber.toLowerCase().includes(queryStr)) ||
          (s.name && s.name.toLowerCase().includes(queryStr)) ||
          (s.branch && s.branch.toLowerCase().includes(queryStr)) ||
          (s.admissionType && s.admissionType.toLowerCase().includes(queryStr)) ||
          (s.phone && s.phone.includes(queryStr)) ||
          (s.collegeEmail && s.collegeEmail.toLowerCase().includes(queryStr)) ||
          (s.adharNo && s.adharNo.includes(queryStr)) ||
          (s.gender && s.gender.toLowerCase().includes(queryStr)) ||
          (s.religion && s.religion.toLowerCase().includes(queryStr)) ||
          (s.entranceType && s.entranceType.toLowerCase().includes(queryStr)) ||
          (s.seatCategory && s.seatCategory.toLowerCase().includes(queryStr)) ||
          (ageVal !== null && String(ageVal) === queryStr);

        if (!matchesQ) return false;
      }

      if (eligibility && eligibility !== 'ALL') {
        if (eligibility === 'ELIGIBLE') {
          if (!((s.attendance || 0) >= 75 && (s.gpa || 0) >= 6.5)) return false;
        } else if (eligibility === 'INELIGIBLE') {
          if (!((s.attendance || 0) < 75 || (s.gpa || 0) < 6.5)) return false;
        } else if (eligibility === 'HIGH_PERFORMERS') {
          if (!((s.gpa || 0) >= 8.5)) return false;
        } else if (eligibility === 'LOW_ATTENDANCE') {
          if (!((s.attendance || 0) < 75)) return false;
        }
      }

      if (effectiveMinGpa !== undefined && effectiveMinGpa !== '') {
        if ((s.gpa || 0) < parseFloat(effectiveMinGpa)) return false;
      }
      if (effectiveMaxGpa !== undefined && effectiveMaxGpa !== '') {
        if ((s.gpa || 0) > parseFloat(effectiveMaxGpa)) return false;
      }

      if (effectiveMinAtt !== undefined && effectiveMinAtt !== '') {
        if ((s.attendance || 0) < parseFloat(effectiveMinAtt)) return false;
      }
      if (effectiveMaxAtt !== undefined && effectiveMaxAtt !== '') {
        if ((s.attendance || 0) > parseFloat(effectiveMaxAtt)) return false;
      }

      const marksVal = s.marksPercentage !== undefined ? s.marksPercentage : ((s.gpa || 0) * 10);
      if (minMarks !== undefined && minMarks !== '') {
        if (marksVal < parseFloat(minMarks)) return false;
      }
      if (maxMarks !== undefined && maxMarks !== '') {
        if (marksVal > parseFloat(maxMarks)) return false;
      }

      if ((minAge !== undefined && minAge !== '') || (maxAge !== undefined && maxAge !== '')) {
        const studentAge = getAgeFromDob(s.dob);
        if (studentAge === null) return false;
        if (minAge !== undefined && minAge !== '' && studentAge < parseInt(minAge)) return false;
        if (maxAge !== undefined && maxAge !== '' && studentAge > parseInt(maxAge)) return false;
      }

      if ((minCetRank !== undefined && minCetRank !== '') || (maxCetRank !== undefined && maxCetRank !== '')) {
        const rank = parseInt(s.cetRank || '0');
        if (minCetRank !== undefined && minCetRank !== '' && rank < parseInt(minCetRank)) return false;
        if (maxCetRank !== undefined && maxCetRank !== '' && rank > parseInt(maxCetRank)) return false;
      }

      const { minIncome, maxIncome } = req.query;
      if ((minIncome !== undefined && minIncome !== '') || (maxIncome !== undefined && maxIncome !== '')) {
        const income = parseInt((s.parentsDetails && s.parentsDetails.annualIncome) || '0');
        if (minIncome !== undefined && minIncome !== '' && income < parseInt(minIncome)) return false;
        if (maxIncome !== undefined && maxIncome !== '' && income > parseInt(maxIncome)) return false;
      }

      return true;
    });

    res.json({
      success: true,
      count: students.length,
      students
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Search execution error.' });
  }
});

// @route   POST /api/students/bulk-delete (Restricted to HOD / Admin Faculty)
// @desc    Delete all student records matching passed rollNumbers or active filter parameters
router.post('/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const { rollNumbers } = req.body;

    if (!Array.isArray(rollNumbers) || rollNumbers.length === 0) {
      return res.status(400).json({ success: false, message: 'No student roll numbers provided for bulk deletion.' });
    }

    const uppercaseRolls = rollNumbers.map(r => String(r).toUpperCase().trim());
    const isMongo = getDBState();
    let deletedCount = 0;

    if (isMongo) {
      const result = await Student.deleteMany({ rollNumber: { $in: uppercaseRolls } });
      deletedCount = result.deletedCount || 0;
    } else {
      let list = getMemoryStudents();
      const initialCount = list.length;
      const rollSet = new Set(uppercaseRolls);
      list = list.filter(s => !rollSet.has(s.rollNumber.toUpperCase()));
      deletedCount = initialCount - list.length;
      setMemoryStudents(list);
    }

    return res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} student record(s).`,
      deletedCount
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to perform bulk deletion.' });
  }
});

// @route   GET /api/students/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isMongo = getDBState();
    let student = null;

    if (isMongo) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        student = await Student.findById(id).lean();
      }
      if (!student) {
        student = await Student.findOne({ rollNumber: { $regex: new RegExp(`^${id}$`, 'i') } }).lean();
      }
    } else {
      const list = getMemoryStudents();
      student = list.find(s => s._id === id || s.rollNumber.toUpperCase() === id.toUpperCase());
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    res.json({
      success: true,
      student
    });
  } catch (error) {
    console.error('Detail Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving student details.' });
  }
});

// @route   POST /api/students (Restricted to HOD / Admin Faculty)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    if (!body.rollNumber || !body.name || !body.branch) {
      return res.status(400).json({ success: false, message: 'Roll Number, Name, and Branch are required.' });
    }

    const formattedRoll = body.rollNumber.trim().toUpperCase();
    if (body.photoUrl) {
      body.photoUrl = normalizePhotoUrl(body.photoUrl);
    }
    if (body.branch) {
      body.branch = normalizeBranch(body.branch);
    }
    const isMongo = getDBState();

    if (isMongo) {
      const existing = await Student.findOne({ rollNumber: formattedRoll });
      if (existing) {
        return res.status(400).json({ success: false, message: `Student with Roll Number '${formattedRoll}' already exists!` });
      }

      const newStudent = await Student.create({
        ...body,
        rollNumber: formattedRoll
      });

      return res.status(201).json({
        success: true,
        message: 'Student BIO-DATA created successfully.',
        student: newStudent
      });
    } else {
      const list = getMemoryStudents();
      const existing = list.find(s => s.rollNumber.toUpperCase() === formattedRoll);
      if (existing) {
        return res.status(400).json({ success: false, message: `Student with Roll Number '${formattedRoll}' already exists!` });
      }

      const newStudent = {
        _id: String(Date.now()),
        ...body,
        rollNumber: formattedRoll
      };

      list.unshift(newStudent);
      setMemoryStudents(list);

      return res.status(201).json({
        success: true,
        message: 'Student BIO-DATA created successfully.',
        student: newStudent
      });
    }
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ success: false, message: 'Failed to create student record.' });
  }
});

// @route   PUT /api/students/:id (Restricted to HOD / Admin Faculty)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.body.photoUrl !== undefined) {
      req.body.photoUrl = normalizePhotoUrl(req.body.photoUrl);
    }
    if (req.body.branch !== undefined) {
      req.body.branch = normalizeBranch(req.body.branch);
    }
    const isMongo = getDBState();

    if (isMongo) {
      let updatedStudent = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        updatedStudent = await Student.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
      }
      if (!updatedStudent) {
        updatedStudent = await Student.findOneAndUpdate({ rollNumber: { $regex: new RegExp(`^${id}$`, 'i') } }, req.body, { new: true, runValidators: true });
      }
      if (!updatedStudent) {
        return res.status(404).json({ success: false, message: 'Student record not found.' });
      }
      return res.json({
        success: true,
        message: 'Student BIO-DATA updated successfully.',
        student: updatedStudent
      });
    } else {
      let list = getMemoryStudents();
      const index = list.findIndex(s => s._id === id || s.rollNumber.toUpperCase() === id.toUpperCase());
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Student record not found.' });
      }

      list[index] = { ...list[index], ...req.body };
      setMemoryStudents(list);

      return res.json({
        success: true,
        message: 'Student BIO-DATA updated successfully.',
        student: list[index]
      });
    }
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ success: false, message: 'Failed to update student record.' });
  }
});

// @route   DELETE /api/students/:id (Restricted to HOD / Admin Faculty)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const isMongo = getDBState();

    if (isMongo) {
      let deleted = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        deleted = await Student.findByIdAndDelete(id);
      }
      if (!deleted) {
        deleted = await Student.findOneAndDelete({ rollNumber: { $regex: new RegExp(`^${id}$`, 'i') } });
      }
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Student record not found.' });
      }
      return res.json({
        success: true,
        message: 'Student BIO-DATA record deleted successfully.'
      });
    } else {
      let list = getMemoryStudents();
      const initialLen = list.length;
      list = list.filter(s => s._id !== id && s.rollNumber.toUpperCase() !== id.toUpperCase());
      if (list.length === initialLen) {
        return res.status(404).json({ success: false, message: 'Student record not found.' });
      }

      setMemoryStudents(list);
      return res.json({
        success: true,
        message: 'Student BIO-DATA record deleted successfully.'
      });
    }
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete student record.' });
  }
});

// @route   POST /api/students/bulk-import (Restricted to HOD / Admin Faculty)
router.post('/bulk-import', requireAdmin, async (req, res) => {
  try {
    const { mode, students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'No student records provided for bulk import.' });
    }

    const importMode = (mode || 'BOTH').toUpperCase();
    const isMongo = getDBState();

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const skippedRollNumbers = [];
    const errors = [];

    const normalizeKey = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9%]/g, '');

    const getVal = (data, keys) => {
      if (!data || typeof data !== 'object') return undefined;

      // 1. Direct match check
      for (let k of keys) {
        if (data[k] !== undefined && data[k] !== null) {
          const strVal = String(data[k]).trim();
          if (strVal !== '') return strVal;
        }
      }

      // 2. Normalized match check
      const normalizedDataMap = new Map();
      for (let dk of Object.keys(data)) {
        normalizedDataMap.set(normalizeKey(dk), data[dk]);
      }

      for (let k of keys) {
        const normK = normalizeKey(k);
        if (normalizedDataMap.has(normK)) {
          const rawVal = normalizedDataMap.get(normK);
          if (rawVal !== undefined && rawVal !== null) {
            const strVal = String(rawVal).trim();
            if (strVal !== '') return strVal;
          }
        }
      }

      return undefined;
    };

    // Maps full branch names / common variants → canonical abbreviation
    const normalizeBranch = (raw) => {
      if (!raw) return 'ECE';
      const b = raw.trim().toUpperCase()
        .replace(/\s+/g, ' ')
        .replace(/[^A-Z0-9 &]/g, '');

      // Already a known abbreviation
      const KNOWN = ['CSE','CST','AIML','CAI','DS','ECE','ECT','EEE','MEC','CIVIL','IT'];
      if (KNOWN.includes(b)) return b;

      // Full-name / alias mapping (order matters — longer/more-specific first)
      const MAP = [
        // CSE variants
        ['COMPUTER SCIENCE AND ENGINEERING', 'CSE'],
        ['COMPUTER SCIENCE & ENGINEERING', 'CSE'],
        ['COMPUTER SCIENCE ENGINEERING', 'CSE'],
        ['B.TECH CSE', 'CSE'],
        ['BTECH CSE', 'CSE'],
        // CST variants
        ['COMPUTER SCIENCE AND TECHNOLOGY', 'CST'],
        ['COMPUTER SCIENCE & TECHNOLOGY', 'CST'],
        ['COMPUTER SCIENCE TECHNOLOGY', 'CST'],
        // AIML variants
        ['ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING', 'AIML'],
        ['ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', 'AIML'],
        ['AI AND ML', 'AIML'],
        ['AI & ML', 'AIML'],
        ['AIML', 'AIML'],
        // CAI variants
        ['COMPUTER AND ARTIFICIAL INTELLIGENCE', 'CAI'],
        ['COMPUTER & ARTIFICIAL INTELLIGENCE', 'CAI'],
        ['COMPUTER ARTIFICIAL INTELLIGENCE', 'CAI'],
        // Data Science variants
        ['DATA SCIENCE', 'DS'],
        ['DATA SCIENCE AND ENGINEERING', 'DS'],
        ['DATA SCIENCE & ENGINEERING', 'DS'],
        // ECE variants
        ['ELECTRONICS AND COMMUNICATION ENGINEERING', 'ECE'],
        ['ELECTRONICS & COMMUNICATION ENGINEERING', 'ECE'],
        ['ELECTRONICS AND COMMUNICATION', 'ECE'],
        ['ELECTRONICS & COMMUNICATION', 'ECE'],
        ['ELECTRONICS COMMUNICATION ENGINEERING', 'ECE'],
        // ECT variants
        ['ELECTRONICS AND COMPUTER TECHNOLOGY', 'ECT'],
        ['ELECTRONICS & COMPUTER TECHNOLOGY', 'ECT'],
        ['ELECTRONICS COMPUTER TECHNOLOGY', 'ECT'],
        ['ELECTRONICS AND COMMUNICATION TECHNOLOGY', 'ECT'],
        // EEE variants
        ['ELECTRICAL AND ELECTRONICS ENGINEERING', 'EEE'],
        ['ELECTRICAL & ELECTRONICS ENGINEERING', 'EEE'],
        ['ELECTRICAL ELECTRONICS ENGINEERING', 'EEE'],
        ['ELECTRICAL AND ELECTRONICS', 'EEE'],
        // Mechanical variants
        ['MECHANICAL ENGINEERING', 'MEC'],
        ['MECHANICAL', 'MEC'],
        ['MECH', 'MEC'],
        // Civil variants
        ['CIVIL ENGINEERING', 'CIVIL'],
        ['CIVIL ENGG', 'CIVIL'],
        // IT variants
        ['INFORMATION TECHNOLOGY', 'IT'],
        ['INFORMATION TECH', 'IT'],
      ];

      for (const [pattern, abbr] of MAP) {
        if (b === pattern || b.startsWith(pattern + ' ') || b.endsWith(' ' + pattern) || b.includes(pattern)) {
          return abbr;
        }
      }

      // Partial abbreviation fallback — take only uppercase letters if short enough
      const lettersOnly = b.replace(/[^A-Z]/g, '');
      if (lettersOnly.length <= 5 && KNOWN.includes(lettersOnly)) return lettersOnly;

      // Return cleaned-up version as-is (won't match filters but won't crash)
      return b.replace(/\s+/g, '').slice(0, 10);
    };

    const sanitizeStudentData = (data) => {
      const rollNo = getVal(data, ['rollNumber', 'Roll Number', 'Roll No', 'rollNo', 'ROLL NO', 'Roll', 'ht_no', 'hallticket_no', 'roll_number']);
      if (!rollNo) return null;

      const formattedRoll = rollNo.toUpperCase();
      const rawBranch = normalizeBranch(getVal(data, ['branch', 'Branch', 'Department', 'department']));

      const rawSec = (getVal(data, ['section', 'Section', 'sec']) || 'A').toUpperCase();
      const secMatch = rawSec.match(/[A-E]/);
      const sectionVal = secMatch ? secMatch[0] : 'A';

      const rawYear = String(getVal(data, ['year', 'Year', 'Academic Year', 'academic_year']) || '1');
      const yearMatch = rawYear.match(/[1-4]/);
      const yearVal = yearMatch ? yearMatch[0] : '1';

      const rawType = (getVal(data, ['admissionType', 'Admission Type', 'admission_type']) || 'Regular').toLowerCase();
      const admissionTypeVal = rawType.includes('lateral') ? 'Lateral Entry' : 'Regular';

      const studentObj = {
        rollNumber: formattedRoll,
        name: (getVal(data, ['name', 'Name', 'Student Name', 'student_name']) || 'STUDENT NAME').toUpperCase(),
        admissionNo: getVal(data, ['admissionNo', 'Admission Number', 'Admission No', 'admission_no']) || `088/${rawBranch}/2023`,
        admissionType: admissionTypeVal,
        course: getVal(data, ['course', 'Course']) || 'B.Tech',
        branch: rawBranch,
        section: sectionVal,
        year: yearVal,
        semester: getVal(data, ['semester', 'Semester', 'sem']) || 'I Semester',
        dob: getVal(data, ['dob', 'Date of Birth', 'DOB', 'date_of_birth']) || '2005-01-01',
        gender: (getVal(data, ['gender', 'Gender', 'sex']) || 'Male').toLowerCase().startsWith('f') ? 'Female' : 'Male',
        religion: getVal(data, ['religion', 'Religion']) || 'Hindu',
        nationality: getVal(data, ['nationality', 'Nationality']) || 'Indian',
        entranceType: getVal(data, ['entranceType', 'Entrance Type', 'entrance_type']) || 'EAPCET',
        cetRank: getVal(data, ['cetRank', 'CET Rank', 'Entrance CET Rank', 'rank', 'cet_rank']) || '0',
        phone: getVal(data, ['phone', 'Mobile', 'Phone', 'Mobile Number', 'Contact Number', 'Student Mobile', 'mobile_number', 'mobile']) || '',
        personalEmail: getVal(data, ['personalEmail', 'Personal Email', 'Email', 'personal_email']) || '',
        collegeEmail: getVal(data, ['collegeEmail', 'College Email', 'college_email']) || `${formattedRoll.toLowerCase()}@sves.org.in`,
        adharNo: getVal(data, ['adharNo', 'Aadhar Number', 'Aadhar No', 'Aadhar', 'aadhar_no']) || '',
        abcId: getVal(data, ['abcId', 'ABC ID', 'abc_id']) || '',
        bankAccNo: getVal(data, ['bankAccNo', 'bankAccountNo', 'Bank Account', 'Bank Account No', 'Bank Account Number', 'bank_acc_no']) || '',
        reimbursement: getVal(data, ['reimbursement', 'Reimbursement', 'Fee Reimbursement', 'Fee Reimbursement Status', 'fee_reimbursement']) || 'No',
        transportHalt: getVal(data, ['transportHalt', 'Transport Halt', 'transport_halt']) || '',
        gpa: Math.min(Math.max(parseFloat(getVal(data, ['gpa', 'CGPA', 'GPA', 'cgpa']) || '8.0') || 8.0, 0), 10),
        attendance: Math.min(Math.max(parseFloat(getVal(data, ['attendance', 'Attendance', 'Attendance %', 'attendance_percent']) || '85.0') || 85.0, 0), 100),
        marksPercentage: Math.min(Math.max(parseFloat(getVal(data, ['marksPercentage', 'Marks Percentage', 'Marks %', 'Percentage', 'marks_percentage']) || '80.0') || 80.0, 0), 100),
        seatCategory: getVal(data, ['seatCategory', 'Seat Category', 'Quota', 'Seat Quota Category', 'seat_category']) || 'CONVENOR',
        remarks: getVal(data, ['remarks', 'Faculty Remarks', 'Remarks', 'faculty_remarks']) || '',
        photoUrl: normalizePhotoUrl(getVal(data, ['photoUrl', 'Photo URL', 'Photo Link', 'photo_url', 'Photo', 'photo', 'Image', 'image', 'Student Photo']) || ''),
        parentsDetails: {
          fatherName: (getVal(data, ['fatherName', 'Father Name', 'father_name']) || (data.parentsDetails && data.parentsDetails.fatherName) || '').toUpperCase(),
          fatherOccupation: getVal(data, ['fatherOccupation', 'Father Occupation', 'father_occupation']) || '',
          fatherMobile: getVal(data, ['fatherMobile', 'Father Mobile', 'father_mobile']) || '',
          motherName: (getVal(data, ['motherName', 'Mother Name', 'mother_name']) || (data.parentsDetails && data.parentsDetails.motherName) || '').toUpperCase(),
          motherOccupation: getVal(data, ['motherOccupation', 'Mother Occupation', 'mother_occupation']) || '',
          motherMobile: getVal(data, ['motherMobile', 'Mother Mobile', 'mother_mobile']) || '',
          annualIncome: getVal(data, ['annualIncome', 'Parents Annual Income', 'Annual Income', 'Income', 'annual_income']) || '150000',
          permanentAddress: getVal(data, ['permanentAddress', 'Permanent Address', 'Address', 'permanent_address']) || ''
        }
      };

      return studentObj;
    };

    const buildPartialUpdatePayload = (data) => {
      const payload = {};
      const check = (dbKey, keys, transformFn) => {
        const val = getVal(data, keys);
        if (val !== undefined) {
          const transformed = transformFn ? transformFn(val) : val;
          if (transformed !== undefined && transformed !== null) {
            payload[dbKey] = transformed;
          }
        }
      };

      check('name', ['name', 'Name', 'Student Name', 'student_name'], v => String(v).trim().toUpperCase());
      check('admissionNo', ['admissionNo', 'Admission Number', 'Admission No', 'admission_no']);
      check('admissionType', ['admissionType', 'Admission Type', 'admission_type'], v => {
        const s = String(v).toLowerCase();
        if (s.includes('lateral')) return 'Lateral Entry';
        if (s.includes('regular')) return 'Regular';
        return undefined;
      });
      check('course', ['course', 'Course']);
      check('branch', ['branch', 'Branch', 'Department', 'department'], v => String(v).trim().toUpperCase());
      check('section', ['section', 'Section', 'sec'], v => {
        const m = String(v).toUpperCase().match(/[A-E]/);
        return m ? m[0] : undefined;
      });
      check('year', ['year', 'Year', 'Academic Year', 'academic_year'], v => {
        const m = String(v).match(/[1-4]/);
        return m ? m[0] : undefined;
      });
      check('semester', ['semester', 'Semester', 'sem']);
      check('dob', ['dob', 'Date of Birth', 'DOB', 'date_of_birth']);
      check('gender', ['gender', 'Gender', 'sex'], v => {
        const s = String(v).toLowerCase();
        if (s.startsWith('f') || s.includes('female')) return 'Female';
        if (s.startsWith('m') || s.includes('male')) return 'Male';
        return undefined;
      });
      check('religion', ['religion', 'Religion']);
      check('nationality', ['nationality', 'Nationality']);
      check('entranceType', ['entranceType', 'Entrance Type', 'entrance_type']);
      check('cetRank', ['cetRank', 'CET Rank', 'Entrance CET Rank', 'cet_rank', 'rank']);
      check('phone', ['phone', 'Mobile', 'Phone', 'Mobile Number', 'Contact Number', 'Student Mobile', 'mobile_number', 'mobile']);
      check('personalEmail', ['personalEmail', 'Personal Email', 'Email', 'personal_email']);
      check('collegeEmail', ['collegeEmail', 'College Email', 'college_email']);
      check('adharNo', ['adharNo', 'Aadhar Number', 'Aadhar No', 'Aadhar', 'aadhar_no']);
      check('abcId', ['abcId', 'ABC ID', 'abc_id']);
      check('bankAccNo', ['bankAccNo', 'bankAccountNo', 'Bank Account', 'Bank Account No', 'Bank Account Number', 'bank_acc_no']);
      check('reimbursement', ['reimbursement', 'Reimbursement', 'Fee Reimbursement', 'Fee Reimbursement Status', 'fee_reimbursement'], v => {
        const s = String(v).toLowerCase();
        if (s.startsWith('y') || s === 'true') return 'Yes';
        if (s.startsWith('n') || s === 'false') return 'No';
        return undefined;
      });
      check('transportHalt', ['transportHalt', 'Transport Halt', 'transport_halt']);
      check('gpa', ['gpa', 'CGPA', 'GPA', 'cgpa'], v => {
        const num = parseFloat(v);
        return isNaN(num) ? undefined : Math.min(Math.max(num, 0), 10);
      });
      check('attendance', ['attendance', 'Attendance', 'Attendance %', 'attendance_percent'], v => {
        const num = parseFloat(v);
        return isNaN(num) ? undefined : Math.min(Math.max(num, 0), 100);
      });
      check('marksPercentage', ['marksPercentage', 'Marks Percentage', 'Marks %', 'Percentage', 'marks_percentage'], v => {
        const num = parseFloat(v);
        return isNaN(num) ? undefined : Math.min(Math.max(num, 0), 100);
      });
      check('seatCategory', ['seatCategory', 'Seat Category', 'Quota', 'Seat Quota Category', 'seat_category']);
      check('remarks', ['remarks', 'Faculty Remarks', 'Remarks', 'faculty_remarks']);
      check('photoUrl', ['photoUrl', 'Photo URL', 'Photo Link', 'photo_url', 'Photo', 'photo', 'Image', 'image', 'Student Photo'], v => normalizePhotoUrl(String(v || '')));

      const parentObj = {};
      const checkParent = (pKey, keys, transformFn) => {
        const val = getVal(data, keys);
        if (val !== undefined) {
          const transformed = transformFn ? transformFn(val) : val;
          if (transformed !== undefined && transformed !== null) {
            parentObj[pKey] = transformed;
          }
        }
      };

      checkParent('fatherName', ['fatherName', 'Father Name', 'father_name'], v => String(v).trim().toUpperCase());
      checkParent('fatherOccupation', ['fatherOccupation', 'Father Occupation', 'father_occupation']);
      checkParent('fatherMobile', ['fatherMobile', 'Father Mobile', 'father_mobile']);
      checkParent('motherName', ['motherName', 'Mother Name', 'mother_name'], v => String(v).trim().toUpperCase());
      checkParent('motherOccupation', ['motherOccupation', 'Mother Occupation', 'mother_occupation']);
      checkParent('motherMobile', ['motherMobile', 'Mother Mobile', 'mother_mobile']);
      checkParent('annualIncome', ['annualIncome', 'Parents Annual Income', 'Annual Income', 'Income', 'annual_income']);
      checkParent('permanentAddress', ['permanentAddress', 'Permanent Address', 'Address', 'permanent_address']);

      if (Object.keys(parentObj).length > 0) {
        payload.parentObj = parentObj;
      }

      return payload;
    };

    if (isMongo) {
      const existingStudents = await Student.find({}, 'rollNumber').lean();
      const existingRollSet = new Set(existingStudents.map(s => (s && s.rollNumber) ? String(s.rollNumber).trim().toUpperCase() : '').filter(Boolean));

      for (let rawData of students) {
        try {
          const studentObj = sanitizeStudentData(rawData);
          if (!studentObj) {
            skippedCount++;
            errors.push(`Row skipped: Roll Number missing.`);
            continue;
          }

          const exists = existingRollSet.has(studentObj.rollNumber);
          const rollRegex = new RegExp(`^${studentObj.rollNumber.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');

          if (importMode === 'UPDATE') {
            if (!exists) {
              skippedCount++;
              skippedRollNumbers.push(studentObj.rollNumber);
              continue;
            }
            const partial = buildPartialUpdatePayload(rawData);
            if (partial.parentObj) {
              for (let [pk, pv] of Object.entries(partial.parentObj)) {
                partial[`parentsDetails.${pk}`] = pv;
              }
              delete partial.parentObj;
            }
            if (Object.keys(partial).length > 0) {
              const updatedDoc = await Student.findOneAndUpdate(
                { rollNumber: { $regex: rollRegex } },
                { $set: partial },
                { new: true }
              );
              if (updatedDoc) {
                updatedCount++;
              } else {
                skippedCount++;
                skippedRollNumbers.push(studentObj.rollNumber);
              }
            } else {
              skippedCount++;
              skippedRollNumbers.push(studentObj.rollNumber);
            }
          } else if (importMode === 'ADD') {
            if (exists) {
              skippedCount++;
              skippedRollNumbers.push(studentObj.rollNumber);
              continue;
            }
            await Student.create(studentObj);
            existingRollSet.add(studentObj.rollNumber);
            insertedCount++;
          } else {
            // BOTH mode
            if (exists) {
              const partial = buildPartialUpdatePayload(rawData);
              if (partial.parentObj) {
                for (let [pk, pv] of Object.entries(partial.parentObj)) {
                  partial[`parentsDetails.${pk}`] = pv;
                }
                delete partial.parentObj;
              }
              if (Object.keys(partial).length > 0) {
                const updatedDoc = await Student.findOneAndUpdate(
                  { rollNumber: { $regex: rollRegex } },
                  { $set: partial },
                  { new: true }
                );
                if (updatedDoc) {
                  updatedCount++;
                } else {
                  skippedCount++;
                  skippedRollNumbers.push(studentObj.rollNumber);
                }
              } else {
                skippedCount++;
                skippedRollNumbers.push(studentObj.rollNumber);
              }
            } else {
              await Student.create(studentObj);
              existingRollSet.add(studentObj.rollNumber);
              insertedCount++;
            }
          }
        } catch (rowError) {
          console.error('Row process error:', rowError.message);
          skippedCount++;
          const roll = String(rawData['Roll Number'] || rawData.rollNumber || 'UNKNOWN').toUpperCase();
          skippedRollNumbers.push(roll);
          errors.push(`${roll}: ${rowError.message}`);
        }
      }
    } else {
      // Memory DB mode
      let memList = getMemoryStudents();
      const existingRollMap = new Map(memList.filter(s => s && s.rollNumber).map(s => [String(s.rollNumber).trim().toUpperCase(), s]));

      for (let rawData of students) {
        try {
          const studentObj = sanitizeStudentData(rawData);
          if (!studentObj) {
            skippedCount++;
            errors.push(`Row skipped: Roll Number missing.`);
            continue;
          }

          const existingRecord = existingRollMap.get(studentObj.rollNumber);

          if (importMode === 'UPDATE') {
            if (!existingRecord) {
              skippedCount++;
              skippedRollNumbers.push(studentObj.rollNumber);
              continue;
            }
            const partial = buildPartialUpdatePayload(rawData);
            const parentUpdates = partial.parentObj;
            delete partial.parentObj;

            if (Object.keys(partial).length > 0 || (parentUpdates && Object.keys(parentUpdates).length > 0)) {
              Object.assign(existingRecord, partial);
              if (parentUpdates) {
                existingRecord.parentsDetails = {
                  ...(existingRecord.parentsDetails || {}),
                  ...parentUpdates
                };
              }
              updatedCount++;
            } else {
              skippedCount++;
              skippedRollNumbers.push(studentObj.rollNumber);
            }
          } else if (importMode === 'ADD') {
            if (existingRecord) {
              skippedCount++;
              skippedRollNumbers.push(studentObj.rollNumber);
              continue;
            }
            const newStudent = { _id: studentObj.rollNumber, ...studentObj };
            memList.push(newStudent);
            existingRollMap.set(studentObj.rollNumber, newStudent);
            insertedCount++;
          } else {
            // BOTH mode
            if (existingRecord) {
              const partial = buildPartialUpdatePayload(rawData);
              const parentUpdates = partial.parentObj;
              delete partial.parentObj;

              if (Object.keys(partial).length > 0 || (parentUpdates && Object.keys(parentUpdates).length > 0)) {
                Object.assign(existingRecord, partial);
                if (parentUpdates) {
                  existingRecord.parentsDetails = {
                    ...(existingRecord.parentsDetails || {}),
                    ...parentUpdates
                  };
                }
                updatedCount++;
              } else {
                skippedCount++;
                skippedRollNumbers.push(studentObj.rollNumber);
              }
            } else {
              const newStudent = { _id: studentObj.rollNumber, ...studentObj };
              memList.push(newStudent);
              existingRollMap.set(studentObj.rollNumber, newStudent);
              insertedCount++;
            }
          }
        } catch (rowError) {
          console.error('Memory row process error:', rowError.message);
          skippedCount++;
          const roll = String(rawData['Roll Number'] || rawData.rollNumber || 'UNKNOWN').toUpperCase();
          skippedRollNumbers.push(roll);
          errors.push(`${roll}: ${rowError.message}`);
        }
      }
      setMemoryStudents(memList);
    }

    return res.json({
      success: true,
      message: `Bulk processing completed in '${importMode}' mode.`,
      mode: importMode,
      summary: {
        totalReceived: students.length,
        insertedCount,
        updatedCount,
        skippedCount,
        skippedRollNumbers,
        errors
      }
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to process bulk import.' });
  }
});

module.exports = router;
