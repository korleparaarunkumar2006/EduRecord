const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  admissionNo: {
    type: String,
    default: '047/CST/2024'
  },
  admissionType: {
    type: String,
    enum: ['Regular', 'Lateral Entry'],
    default: 'Regular'
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: String,
    default: 'B.Tech'
  },
  branch: {
    type: String,
    required: true,
    trim: true
  },
  semester: {
    type: String,
    default: 'V Semester'
  },
  section: {
    type: String,
    default: 'A',
    enum: ['A', 'B', 'C', 'D', 'E']
  },
  year: {
    type: String,
    default: '3',
    enum: ['1', '2', '3', '4']
  },
  gender: {
    type: String,
    default: 'Male'
  },
  dob: {
    type: String,
    default: '10/05/2006'
  },
  nationality: {
    type: String,
    default: 'Indian'
  },
  religion: {
    type: String,
    default: 'Hindu'
  },
  entranceType: {
    type: String,
    default: 'EAPCET'
  },
  cetRank: {
    type: String,
    default: '25778'
  },
  seatCategory: {
    type: String,
    default: 'CONVENOR'
  },
  lastStudied: {
    type: String,
    default: 'PRAGATHI JUNIOR COLLEGE'
  },
  joiningDate: {
    type: String,
    default: '20/07/2024'
  },
  phone: {
    type: String,
    default: '9573471715'
  },
  mobileNo: {
    type: String,
    default: '9573471715'
  },
  personalEmail: {
    type: String,
    default: 'korleparaarunkumar@gmail.com'
  },
  collegeEmail: {
    type: String,
    default: '24A81A0629@sves.org.in'
  },
  abcId: {
    type: String,
    default: '255692439187'
  },
  linkedinProfile: {
    type: String,
    default: ''
  },
  bankAccNo: {
    type: String,
    default: '061010023000096'
  },
  adharNo: {
    type: String,
    default: '892192096038'
  },
  rationCardNo: {
    type: String,
    default: '2807843756'
  },
  reimbursement: {
    type: String,
    default: 'Yes'
  },
  transportHalt: {
    type: String,
    default: 'VELAGADURRU (Route: THATIPARRU-5) 20/07/2024'
  },
  photoUrl: {
    type: String,
    default: ''
  },
  remarks: {
    type: String,
    default: ''
  },
  gpa: {
    type: Number,
    min: 0,
    max: 10,
    default: 8.8
  },
  marksPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 88.0
  },
  attendance: {
    type: Number,
    min: 0,
    max: 100,
    default: 91.5
  },
  educationDetails: [{
    qualification: String,
    board: String,
    htNo: String,
    yearOfPass: String,
    institute: String,
    maxMarks: String,
    obtainedMarks: String,
    percentage: String,
    gradePoints: String
  }],
  parentsDetails: {
    fatherName: { type: String, default: 'KORLEPARA SATYA KRISHNA' },
    fatherOccupation: { type: String, default: 'BUSINESS' },
    motherName: { type: String, default: 'KORLEPARA JYOTHI' },
    motherOccupation: { type: String, default: 'HOUSE WIFE' },
    phoneNo: { type: String, default: '' },
    fatherMobile: { type: String, default: '9491015348' },
    motherMobile: { type: String, default: '8332956270' },
    annualIncome: { type: String, default: '70000' },
    fatherMail: { type: String, default: 'knvsksg@gmail.com' },
    motherMail: { type: String, default: '' },
    correspondenceAddress: { type: String, default: '3-8/1 MAIN ROAD VELAGADURRU VELAGADURRU UNDRAJAVARAM MANDAL WEST GODAVARI DISTRICT ANDHRA PRADESH-534227' },
    permanentAddress: { type: String, default: '3-8/1 MAIN ROAD VELAGADURRU VELAGADURRU UNDRAJAVARAM MANDAL WEST GODAVARI DISTRICT ANDHRA PRADESH-534227' }
  },
  guardianDetails: {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    mobile: { type: String, default: '' }
  }
}, { timestamps: true });

studentSchema.index({ rollNumber: 'text', name: 'text', branch: 'text', collegeEmail: 'text', phone: 'text' });

const KNOWN_BRANCHES = ['CSE', 'CST', 'AIML', 'CAI', 'DS', 'ECE', 'ECT', 'EEE', 'MEC', 'CIVIL', 'IT'];

function normalizeBranchValue(raw) {
  if (!raw) return 'ECE';
  const b = String(raw).trim().toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9 &]/g, '');

  if (KNOWN_BRANCHES.includes(b)) return b;


  const MAP = [
    ['COMPUTER SCIENCE AND ENGINEERING', 'CSE'],
    ['COMPUTER SCIENCE & ENGINEERING', 'CSE'],
    ['COMPUTER SCIENCE ENGINEERING', 'CSE'],
    // CST — BEFORE generic 'COMPUTER SCIENCE'
    ['COMPUTER SCIENCE AND TECHNOLOGY', 'CST'],
    ['COMPUTER SCIENCE & TECHNOLOGY', 'CST'],
    ['COMPUTER SCIENCE TECHNOLOGY', 'CST'],
    // Generic CSE — after CST
    ['COMPUTER SCIENCE', 'CSE'],
    ['BTECH CSE', 'CSE'],
    ['B TECH CSE', 'CSE'],
    ['B.TECH CSE', 'CSE'],
    ['ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING', 'AIML'],
    ['ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', 'AIML'],
    ['ARTIFICIAL INTELLIGENCE MACHINE LEARNING', 'AIML'],
    ['AI AND ML', 'AIML'],
    ['AI & ML', 'AIML'],
    ['AIML', 'AIML'],
    // Artificial Intelligence — after AIML
    ['ARTIFICIAL INTELLIGENCE', 'AIML'],
    ['COMPUTER AND ARTIFICIAL INTELLIGENCE', 'CAI'],
    ['COMPUTER & ARTIFICIAL INTELLIGENCE', 'CAI'],
    ['COMPUTER ARTIFICIAL INTELLIGENCE', 'CAI'],
    ['DATA SCIENCE AND ENGINEERING', 'DS'],
    ['DATA SCIENCE & ENGINEERING', 'DS'],
    ['DATA SCIENCE', 'DS'],
    ['DATA SCI', 'DS'],
    // ── CRITICAL: ECT BEFORE generic ECE ──
    ['ELECTRONICS AND COMMUNICATION TECHNOLOGY', 'ECT'],
    ['ELECTRONICS & COMMUNICATION TECHNOLOGY', 'ECT'],
    ['ELECTRONICS COMMUNICATION TECHNOLOGY', 'ECT'],
    // ECE full names
    ['ELECTRONICS AND COMMUNICATION ENGINEERING', 'ECE'],
    ['ELECTRONICS & COMMUNICATION ENGINEERING', 'ECE'],
    ['ELECTRONICS COMMUNICATION ENGINEERING', 'ECE'],
    // Generic ECE — AFTER ECT specific patterns
    ['ELECTRONICS AND COMMUNICATION', 'ECE'],
    ['ELECTRONICS & COMMUNICATION', 'ECE'],
    ['ELECTRICAL AND ELECTRONICS ENGINEERING', 'EEE'],
    ['ELECTRICAL & ELECTRONICS ENGINEERING', 'EEE'],
    ['ELECTRICAL ELECTRONICS ENGINEERING', 'EEE'],
    ['ELECTRICAL AND ELECTRONICS', 'EEE'],
    ['ELECTRICAL & ELECTRONICS', 'EEE'],
    ['MECHANICAL ENGINEERING', 'MEC'],
    ['MECH', 'MEC'],
    ['MECHANICAL', 'MEC'],
    ['CIVIL ENGINEERING', 'CIVIL'],
    ['CIVIL ENGG', 'CIVIL'],
    ['CIVIL', 'CIVIL'],
    ['INFORMATION TECHNOLOGY', 'IT'],
    ['INFORMATION TECH', 'IT'],
    ['INFO TECH', 'IT'],
    ['AI', 'AIML'],
    ['CSD', 'DS'],
    ['DS', 'DS'],
    ['IT', 'IT'],
  ];

  for (const [pattern, abbr] of MAP) {
    if (b === pattern || b.includes(pattern)) return abbr;
  }

  const stripped = b.replace(/\s+/g, '');
  if (KNOWN_BRANCHES.includes(stripped)) return stripped;

  // Do not default unknown branches to ECE — return as-is
  return stripped.slice(0, 10) || b.slice(0, 10);
}


studentSchema.pre('save', function (next) {
  if (this.branch) {
    this.branch = normalizeBranchValue(this.branch);
  }
  if (this.name) {
    this.name = String(this.name).trim().toUpperCase();
  }
  if (this.rollNumber) {
    this.rollNumber = String(this.rollNumber).trim().toUpperCase();
  }
  next();
});

studentSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (!update) return next();
  const target = update.$set || update;
  if (target.branch) {
    target.branch = normalizeBranchValue(target.branch);
  }
  if (target.name) {
    target.name = String(target.name).trim().toUpperCase();
  }
  if (target.rollNumber) {
    target.rollNumber = String(target.rollNumber).trim().toUpperCase();
  }
  next();
});

const Student = mongoose.model('Student', studentSchema);
Student.normalizeBranch = normalizeBranchValue;

module.exports = Student;
