const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { connectDB, getDBState } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const facultyRoutes = require('./routes/facultyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure DB is connected before handling requests
app.use(async (req, res, next) => {
  if (!getDBState()) {
    try { await connectDB(); } catch (e) { console.error('DB connect middleware error:', e); }
  }
  next();
});

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
    security: 'High Security JWT Active',
    version: '2.0 (MERN Stack)'
  });
});

// 404 for non-existent API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

// Serve compiled React frontend in Production / Vercel
const path = require('path');
const fs = require('fs');
const clientDist = path.join(__dirname, '../client/dist');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start Server & Connect Database
if (require.main === module || !process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`🚀 EduRecord MERN Backend running!`);
      console.log(`🌐 API URL: http://localhost:${PORT}/api`);
      console.log(`⚛️  React Frontend: http://localhost:5173`);
      console.log(`🔐 High Security JWT Auth Active`);
      console.log(`===================================================`);
    });
  });
}

module.exports = app;
