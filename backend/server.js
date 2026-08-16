const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { connectDB, getDBState } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const facultyRoutes = require('./routes/facultyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure DB is connected before handling requests
app.use(async (req, res, next) => {
  if (!getDBState()) {
    try {
      await connectDB();
    } catch (e) {
      console.error('DB connect middleware error:', e);
    }
  }
  next();
});

// Serve static frontend files from ../frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);

// System Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    databaseMode: getDBState() ? 'MongoDB Connected' : 'In-Memory DB Active',
    security: 'High Security JWT Active'
  });
});

// Serve frontend for any unhandled page request
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Start Server & Connect Database when running locally
if (require.main === module || !process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`🚀 College Student Details Portal Server running!`);
      console.log(`🌐 Application URL: http://localhost:${PORT}`);
      console.log(`🔐 High Security Faculty Auth & Search Engine Active`);
      console.log(`===================================================`);
    });
  });
}

module.exports = app;
