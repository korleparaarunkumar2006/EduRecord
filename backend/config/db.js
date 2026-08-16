const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const { initialFaculty, initialStudents } = require('./seedData');

let isMongoConnected = false;

// In-Memory store fallback
let memoryStudents = [...initialStudents];
let memoryFaculty = [];

async function initializeMemoryFaculty() {
  const salt = await bcrypt.genSalt(10);
  memoryFaculty = await Promise.all(
    initialFaculty.map(async f => ({
      _id: f.facultyId,
      facultyId: f.facultyId,
      name: f.name,
      email: f.email || '',
      phoneNumber: f.phoneNumber || '',
      password: await bcrypt.hash(f.passwordRaw, salt),
      department: f.department,
      designation: f.designation,
      role: f.role,
      hasChangedPassword: f.hasChangedPassword || false,
      lastLogin: new Date()
    }))
  );
}

const dns = require('dns');

const connectDB = async () => {
  if (isMongoConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student_portal';

  try {
    // Ensure DNS resolution works for mongodb+srv on Windows networks
    try {
      dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
    } catch (e) { }

    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000 // 10s timeout for cloud connections like MongoDB Atlas
    });
    isMongoConnected = true;
    console.log('✅ Connected to MongoDB Atlas successfully.');

    // Drop legacy email index if it exists in MongoDB
    try {
      await Faculty.collection.dropIndex('email_1');
      console.log('🧹 Cleaned legacy email index from MongoDB faculties collection.');
    } catch (e) { }

    // Clean legacy faculty records missing facultyId
    try {
      await Faculty.deleteMany({ $or: [{ facultyId: { $exists: false } }, { facultyId: null }, { facultyId: '' }] });
    } catch (e) { }

    // Seed/sync initial faculty accounts into MongoDB
    console.log('🌱 Syncing initial faculty accounts into MongoDB...');
    const salt = await bcrypt.genSalt(10);
    for (let f of initialFaculty) {
      const regex = new RegExp(`^${f.facultyId}$`, 'i');
      const existingFac = await Faculty.findOne({ facultyId: regex });
      if (!existingFac) {
        const hashedPassword = await bcrypt.hash(f.passwordRaw, salt);
        await Faculty.create({
          name: f.name,
          facultyId: f.facultyId.toUpperCase(),
          email: f.email || '',
          phoneNumber: f.phoneNumber || '',
          password: hashedPassword,
          department: f.department,
          designation: f.designation,
          role: f.role,
          hasChangedPassword: f.hasChangedPassword || false
        });
      }
    }

    console.log('🌱 Syncing initial student records into MongoDB...');
    for (let s of initialStudents) {
      const { _id, ...rest } = s;
      await Student.findOneAndUpdate(
        { rollNumber: s.rollNumber },
        rest,
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    isMongoConnected = false;
    console.log('⚠️ MongoDB connection issue:', err.message);
    console.log('⚡ Switching to high-speed Memory DB mode with preloaded student & faculty records.');
    await initializeMemoryFaculty();
  }
};

const getDBState = () => isMongoConnected;

module.exports = {
  connectDB,
  getDBState,
  getMemoryStudents: () => memoryStudents,
  setMemoryStudents: (data) => { memoryStudents = data; },
  getMemoryFaculty: () => memoryFaculty,
  setMemoryFaculty: (data) => { memoryFaculty = data; }
};
