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

module.exports = mongoose.model('Student', studentSchema);
