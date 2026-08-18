// ─── Faculty Seed Data ────────────────────────────────────────────────────────
// passwordRaw is hashed by db.js using bcrypt before inserting into MongoDB.
// Faculty ID format: DEPT-ROLE-3DIGITS  (see Faculty model)
const initialFaculty = [
  {
    name: 'Dr. K. V. Sharma',
    facultyId: 'CSE-A-001',
    email: 'admin.cse@sves.org.in',
    phoneNumber: '9876543210',
    passwordRaw: 'admin123',
    department: 'Computer Science & Engineering',
    designation: 'Professor & HOD',
    role: 'admin',
    hasChangedPassword: false
  },
  {
    name: 'Dr. Ramesh Kumar',
    facultyId: 'CSE-ADM-001',
    email: 'ramesh.kumar@sves.org.in',
    phoneNumber: '9876543211',
    passwordRaw: 'admin123',
    department: 'Computer Science & Engineering',
    designation: 'Professor & HOD',
    role: 'admin',
    hasChangedPassword: false
  },
  {
    name: 'Ms. Priya Lakshmi',
    facultyId: 'CSE-F-001',
    email: 'priya.lakshmi@sves.org.in',
    phoneNumber: '9123456780',
    passwordRaw: 'faculty123',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    role: 'faculty',
    hasChangedPassword: false
  }
];

// ─── Student Seed Data ────────────────────────────────────────────────────────
// Four students from four different sections (A, B, C, D).
const initialStudents = [
  // ── Section A ──────────────────────────────────────────────────────────────
  {
    admissionNo: '024/CST/2024',
    admissionType: 'Regular',
    rollNumber: '24A81A0501',
    name: 'Arun Kumar Sharma',
    course: 'B.Tech',
    branch: 'Computer Science & Engineering',
    semester: 'III Semester',
    section: 'A',
    year: '2',
    gender: 'Male',
    dob: '15/03/2006',
    nationality: 'Indian',
    religion: 'Hindu',
    entranceType: 'EAPCET',
    cetRank: '12345',
    seatCategory: 'CONVENOR',
    lastStudied: 'SRI CHAITANYA JUNIOR COLLEGE',
    joiningDate: '20/07/2024',
    phone: '9845123456',
    mobileNo: '9845123456',
    personalEmail: 'arun.sharma2006@gmail.com',
    collegeEmail: '24A81A0501@sves.org.in',
    abcId: '123456789001',
    bankAccNo: '061010023000101',
    adharNo: '234512678901',
    rationCardNo: '1234567890',
    reimbursement: 'Yes',
    transportHalt: 'ELURU BUS STAND (Route: ELURU-1) 20/07/2024',
    gpa: 8.5,
    marksPercentage: 85.0,
    attendance: 88.0,
    educationDetails: [
      {
        qualification: '10th (SSC)',
        board: 'BSEAP',
        htNo: '2105123456',
        yearOfPass: '2022',
        institute: 'Z.P. HIGH SCHOOL, ELURU',
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
        institute: 'SRI CHAITANYA JUNIOR COLLEGE',
        maxMarks: '1000',
        obtainedMarks: '965',
        percentage: '96.5',
        gradePoints: '9.7'
      }
    ],
    parentsDetails: {
      fatherName: 'SHARMA VENKATA RAO',
      fatherOccupation: 'GOVERNMENT EMPLOYEE',
      motherName: 'SHARMA SITA DEVI',
      motherOccupation: 'HOUSE WIFE',
      fatherMobile: '9845001122',
      motherMobile: '9845001133',
      annualIncome: '120000',
      fatherMail: 'venkatarao.sharma@gmail.com',
      correspondenceAddress: '12-3 MIG COLONY ELURU WEST GODAVARI ANDHRA PRADESH-534001',
      permanentAddress: '12-3 MIG COLONY ELURU WEST GODAVARI ANDHRA PRADESH-534001'
    }
  },

  // ── Section B ──────────────────────────────────────────────────────────────
  {
    admissionNo: '025/CST/2024',
    admissionType: 'Regular',
    rollNumber: '24A81A0548',
    name: 'Divya Reddy',
    course: 'B.Tech',
    branch: 'Computer Science & Engineering',
    semester: 'III Semester',
    section: 'B',
    year: '2',
    gender: 'Female',
    dob: '22/07/2006',
    nationality: 'Indian',
    religion: 'Hindu',
    entranceType: 'EAPCET',
    cetRank: '23456',
    seatCategory: 'MANAGEMENT',
    lastStudied: 'NARAYANA JUNIOR COLLEGE',
    joiningDate: '20/07/2024',
    phone: '9731245678',
    mobileNo: '9731245678',
    personalEmail: 'divya.reddy2006@gmail.com',
    collegeEmail: '24A81A0548@sves.org.in',
    abcId: '223456789002',
    bankAccNo: '061010023000102',
    adharNo: '345623789012',
    rationCardNo: '2345678901',
    reimbursement: 'No',
    transportHalt: 'TANUKU BUS STAND (Route: TANUKU-3) 20/07/2024',
    gpa: 9.1,
    marksPercentage: 91.0,
    attendance: 94.5,
    parentsDetails: {
      fatherName: 'REDDY KRISHNA MOHAN',
      fatherOccupation: 'BUSINESS',
      motherName: 'REDDY PADMAVATHI',
      motherOccupation: 'TEACHER',
      fatherMobile: '9731001122',
      motherMobile: '9731001133',
      annualIncome: '350000',
      fatherMail: 'krishnamohan.reddy@gmail.com',
      correspondenceAddress: '5-10 KRISHNA NAGAR TANUKU WEST GODAVARI ANDHRA PRADESH-534211',
      permanentAddress: '5-10 KRISHNA NAGAR TANUKU WEST GODAVARI ANDHRA PRADESH-534211'
    }
  },

  // ── Section C ──────────────────────────────────────────────────────────────
  {
    admissionNo: '026/ITT/2024',
    admissionType: 'Regular',
    rollNumber: '24A85A0312',
    name: 'Mohammed Irfan',
    course: 'B.Tech',
    branch: 'Information Technology',
    semester: 'III Semester',
    section: 'C',
    year: '2',
    gender: 'Male',
    dob: '05/11/2005',
    nationality: 'Indian',
    religion: 'Islam',
    entranceType: 'EAPCET',
    cetRank: '34567',
    seatCategory: 'CONVENOR',
    lastStudied: 'GOWTHAM JUNIOR COLLEGE',
    joiningDate: '20/07/2024',
    phone: '9652345679',
    mobileNo: '9652345679',
    personalEmail: 'irfan.mohammed2005@gmail.com',
    collegeEmail: '24A85A0312@sves.org.in',
    abcId: '323456789003',
    bankAccNo: '061010023000103',
    adharNo: '456734890123',
    rationCardNo: '3456789012',
    reimbursement: 'Yes',
    transportHalt: 'BHIMAVARAM BUS STAND (Route: BHIMAVARAM-2) 20/07/2024',
    gpa: 7.8,
    marksPercentage: 78.0,
    attendance: 82.0,
    parentsDetails: {
      fatherName: 'MOHAMMED SALEEM',
      fatherOccupation: 'PRIVATE EMPLOYEE',
      motherName: 'MOHAMMED AMINA BEGUM',
      motherOccupation: 'HOUSE WIFE',
      fatherMobile: '9652001122',
      motherMobile: '9652001133',
      annualIncome: '85000',
      fatherMail: 'saleem.mohammed@gmail.com',
      correspondenceAddress: '8-15 MAIN BAZAAR BHIMAVARAM WEST GODAVARI ANDHRA PRADESH-534201',
      permanentAddress: '8-15 MAIN BAZAAR BHIMAVARAM WEST GODAVARI ANDHRA PRADESH-534201'
    }
  },

  // ── Section D ──────────────────────────────────────────────────────────────
  {
    admissionNo: '027/ECE/2024',
    admissionType: 'Lateral Entry',
    rollNumber: '23A82A0422',
    name: 'Sravani Patel',
    course: 'B.Tech',
    branch: 'Electronics & Communication Engineering',
    semester: 'V Semester',
    section: 'D',
    year: '3',
    gender: 'Female',
    dob: '18/09/2004',
    nationality: 'Indian',
    religion: 'Hindu',
    entranceType: 'ECET',
    cetRank: '5678',
    seatCategory: 'CONVENOR',
    lastStudied: 'GOVERNMENT POLYTECHNIC RAJAM',
    joiningDate: '18/07/2023',
    phone: '9543456780',
    mobileNo: '9543456780',
    personalEmail: 'sravani.patel2004@gmail.com',
    collegeEmail: '23A82A0422@sves.org.in',
    abcId: '423456789004',
    bankAccNo: '061010023000104',
    adharNo: '567845901234',
    rationCardNo: '4567890123',
    reimbursement: 'Yes',
    transportHalt: 'RAJAM CROSS ROAD (Route: SRIKAKULAM-4) 18/07/2023',
    gpa: 8.2,
    marksPercentage: 82.5,
    attendance: 90.0,
    parentsDetails: {
      fatherName: 'PATEL SURESH BABU',
      fatherOccupation: 'FARMER',
      motherName: 'PATEL SAVITRI',
      motherOccupation: 'HOUSE WIFE',
      fatherMobile: '9543001122',
      motherMobile: '9543001133',
      annualIncome: '60000',
      fatherMail: 'sureshbabu.patel@gmail.com',
      correspondenceAddress: '2-6 AGRICULTURIST COLONY RAJAM SRIKAKULAM ANDHRA PRADESH-532127',
      permanentAddress: '2-6 AGRICULTURIST COLONY RAJAM SRIKAKULAM ANDHRA PRADESH-532127'
    }
  }
];

module.exports = {
  initialFaculty,
  initialStudents
};
