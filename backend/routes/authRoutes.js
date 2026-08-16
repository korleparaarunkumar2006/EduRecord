const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Faculty = require('../models/Faculty');
const { getDBState, getMemoryFaculty } = require('../config/db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Secure Faculty Login with password verification & JWT token issuing
router.post('/login', async (req, res) => {
  try {
    const facultyIdInput = (req.body.facultyId || req.body.loginId || req.body.username || '').trim();
    const { password } = req.body;

    if (!facultyIdInput || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both Login ID and password.' });
    }

    const isMongo = getDBState();
    let facultyUser = null;

    if (isMongo) {
      const regex = new RegExp(`^${facultyIdInput.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
      facultyUser = await Faculty.findOne({ facultyId: regex });
    } else {
      const memoryList = getMemoryFaculty();
      const normInput = facultyIdInput.toLowerCase();
      facultyUser = memoryList.find(f => f.facultyId && f.facultyId.toLowerCase() === normInput);
    }

    if (!facultyUser) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Login ID not found.' });
    }

    // Verify hashed password
    const isMatch = await bcrypt.compare(password, facultyUser.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Password verification failed.' });
    }

    // Sign JWT Token
    const payload = {
      id: facultyUser._id,
      facultyId: facultyUser.facultyId || facultyIdInput.toUpperCase(),
      name: facultyUser.name,
      email: facultyUser.email || '',
      phoneNumber: facultyUser.phoneNumber || '',
      department: facultyUser.department,
      designation: facultyUser.designation,
      role: facultyUser.role,
      hasChangedPassword: !!facultyUser.hasChangedPassword
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    // Update last login if mongo
    if (isMongo) {
      facultyUser.lastLogin = new Date();
      await facultyUser.save();
    }

    return res.json({
      success: true,
      message: 'Authentication successful. Welcome, ' + facultyUser.name,
      token,
      faculty: payload
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server security error during authentication.' });
  }
});

// @route   GET /api/auth/me
// @desc    Verify current active session
router.get('/me', verifyToken, (req, res) => {
  res.json({
    success: true,
    faculty: req.faculty
  });
});

module.exports = router;
