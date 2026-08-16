const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  facultyId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: ''
  },
  password: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true,
    default: 'Computer Science & Engineering'
  },
  designation: {
    type: String,
    default: 'Associate Professor'
  },
  role: {
    type: String,
    enum: ['admin', 'faculty'],
    default: 'faculty'
  },
  hasChangedPassword: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Faculty', facultySchema);
