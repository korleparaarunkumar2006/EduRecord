const initialFaculty = [
  {
    facultyId: 'CSE-a-001',
    name: 'Dr. K. V. Sharma',
    email: 'sharma.kv@college.edu',
    phoneNumber: '9876543210',
    passwordRaw: 'admin123',
    department: 'Computer Science & Engineering',
    designation: 'HOD & Professor',
    role: 'admin',
    hasChangedPassword: false
  },
  {
    facultyId: 'CSE-f-101',
    name: 'Prof. A. R. Rao',
    email: 'rao.ar@college.edu',
    phoneNumber: '9876543211',
    passwordRaw: 'faculty123',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    role: 'faculty',
    hasChangedPassword: false
  },
  {
    facultyId: 'ECE-f-102',
    name: 'Dr. M. S. Lakshmi',
    email: 'lakshmi.ms@college.edu',
    phoneNumber: '9876543212',
    passwordRaw: 'faculty123',
    department: 'Electronics & Communication',
    designation: 'Professor',
    role: 'faculty',
    hasChangedPassword: false
  },
  {
    facultyId: 'CST-f-103',
    name: 'Prof. P. V. Kumar',
    email: 'kumar.pv@college.edu',
    phoneNumber: '9876543213',
    passwordRaw: 'faculty123',
    department: 'Computer Science & Technology',
    designation: 'Assistant Professor',
    role: 'faculty',
    hasChangedPassword: false
  }
];

const initialStudents = [];

module.exports = {
  initialFaculty,
  initialStudents
};
