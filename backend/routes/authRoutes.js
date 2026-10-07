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

    // Sign compact JWT Token (keeps auth headers fast and prevents 431 errors with base64 images)
    const tokenPayload = {
      id: facultyUser._id,
      facultyId: facultyUser.facultyId || facultyIdInput.toUpperCase(),
      name: facultyUser.name,
      role: facultyUser.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

    // Update last login if mongo
    if (isMongo) {
      facultyUser.lastLogin = new Date();
      await facultyUser.save();
    }

    const fullProfile = {
      id: facultyUser._id,
      facultyId: facultyUser.facultyId || facultyIdInput.toUpperCase(),
      name: facultyUser.name,
      email: facultyUser.email || '',
      phoneNumber: facultyUser.phoneNumber || '',
      department: facultyUser.department,
      designation: facultyUser.designation,
      role: facultyUser.role,
      photoUrl: facultyUser.photoUrl || '',
      hasChangedPassword: !!facultyUser.hasChangedPassword
    };

    return res.json({
      success: true,
      message: 'Authentication successful. Welcome, ' + facultyUser.name,
      token,
      faculty: fullProfile
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server security error during authentication.' });
  }
});

// @route   GET /api/auth/me
// @desc    Verify current active session and return fresh faculty profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const isMongo = getDBState();
    let facultyUser = null;

    if (isMongo) {
      if (req.faculty.id) facultyUser = await Faculty.findById(req.faculty.id).select('-password');
      if (!facultyUser && req.faculty.facultyId) {
        facultyUser = await Faculty.findOne({ facultyId: new RegExp(`^${req.faculty.facultyId}$`, 'i') }).select('-password');
      }
    } else {
      const memoryList = getMemoryFaculty();
      const f = memoryList.find(item => item._id === req.faculty.id || (item.facultyId && item.facultyId.toLowerCase() === (req.faculty.facultyId || '').toLowerCase()));
      if (f) {
        const { password, ...sanitized } = f;
        facultyUser = sanitized;
      }
    }

    if (facultyUser) {
      return res.json({
        success: true,
        faculty: facultyUser
      });
    }

    return res.json({
      success: true,
      faculty: req.faculty
    });
  } catch (err) {
    return res.json({
      success: true,
      faculty: req.faculty
    });
  }
});

module.exports = router;
