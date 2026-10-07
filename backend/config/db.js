const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const { initialFaculty, initialStudents } = require('./seedData');

let isMongoConnected = false;

// In-Memory store fallback with instant pre-hashed passwords
let memoryStudents = [...initialStudents];
let memoryFaculty = initialFaculty.map(f => ({
  _id: f.facultyId,
  facultyId: f.facultyId,
  name: f.name,
  email: f.email || '',
  phoneNumber: f.phoneNumber || '',
  password: f.passwordRaw === 'faculty123'
    ? '$2a$10$hNcf764SGH5XklmkrwSvrOythEkvgcuQ/x5jJBVpb3X5IpcILuo5q'
    : '$2a$10$JRTGJ1VITVpSVfM8YtfLOepuuVdGDi733BaWoX38G5qBJIaAtNSPe',
  department: f.department,
  designation: f.designation,
  role: f.role,
  hasChangedPassword: f.hasChangedPassword || false,
  lastLogin: new Date()
}));

function initializeMemoryFaculty() {
  // Already initialized synchronously above
  return Promise.resolve();
}

const dns = require('dns');

const connectDB = async () => {
  if (isMongoConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const mongoURI = process.env.MONGODB_URI;

  // On Vercel / Cloud environments without Atlas URI, immediately use Memory DB
  if (!mongoURI || ((process.env.VERCEL || process.env.NODE_ENV === 'production') && (mongoURI.includes('127.0.0.1') || mongoURI.includes('localhost')))) {
    isMongoConnected = false;
    if (memoryFaculty.length === 0) {
      await initializeMemoryFaculty();
    }
    return;
  }

  try {
    // Only attempt DNS server override on local Windows environment
    if (process.platform === 'win32' && !process.env.VERCEL) {
      try {
        dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
      } catch (e) { }
    }

    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000 // 3s timeout for cloud Atlas connections
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
      let existingFac = await Faculty.findOne({ facultyId: regex });
      const hashedPassword = await bcrypt.hash(f.passwordRaw, salt);
      if (!existingFac) {
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
      } else {
        existingFac.password = hashedPassword;
        existingFac.role = f.role;
        await existingFac.save();
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

    // Auto-normalize all existing student records in MongoDB (e.g. MECH -> MEC, AI -> AIML, full names -> CSE/ECE/etc.)
    try {
      const allDbStudents = await Student.find({}, '_id rollNumber branch name').lean();
      let migrated = 0;
      for (let st of allDbStudents) {
        if (!st.branch) continue;
        const norm = Student.normalizeBranch ? Student.normalizeBranch(st.branch) : st.branch;
        const normName = st.name ? String(st.name).trim().toUpperCase() : st.name;
        if (st.branch !== norm || st.name !== normName) {
          await Student.updateOne(
            { _id: st._id },
            { $set: { branch: norm, name: normName } }
          );
          migrated++;
        }
      }
      if (migrated > 0) {
        console.log(`✅ Auto-normalized ${migrated} student record(s) to short branch codes (CSE, ECE, MEC, CST, etc.).`);
      }
    } catch (migErr) {
      console.log('Branch auto-normalization note:', migErr.message);
    }
  } catch (err) {
    isMongoConnected = false;
    console.log('⚠️ MongoDB connection issue:', err.message);
    console.log('⚡ Switching to high-speed Memory DB mode with preloaded student & faculty records.');
    if (memoryFaculty.length === 0) {
      await initializeMemoryFaculty();
    }
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
