const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Faculty = require('../models/Faculty');
const { getDBState, getMemoryFaculty, setMemoryFaculty } = require('../config/db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

// Helper middleware to restrict to admin only
const requireAdmin = (req, res, next) => {
  if (!req.faculty || req.faculty.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Only Admin users have permission to perform this action.'
    });
  }
  next();
};

// @route   GET /api/faculty
// @desc    Get all faculty members with optional filters (department, designation, search q) - Admin Only
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { department, designation, q } = req.query;
    const isMongo = getDBState();

    if (isMongo) {
      const query = {};

      if (department && department !== 'ALL') {
        query.department = new RegExp(`^${department.trim()}$`, 'i');
      }

      if (designation && designation !== 'ALL') {
        query.designation = new RegExp(`^${designation.trim()}$`, 'i');
      }

      if (q && q.trim()) {
        const searchTerm = q.trim();
        const searchRegex = new RegExp(searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        query.$or = [
          { facultyId: searchRegex },
          { name: searchRegex },
          { email: searchRegex },
          { phoneNumber: searchRegex },
          { department: searchRegex },
          { designation: searchRegex }
        ];
      }

      const facultyList = await Faculty.find(query).select('-password').sort({ createdAt: -1 });
      return res.json({ success: true, count: facultyList.length, faculty: facultyList });
    } else {
      // In-Memory store fallback
      let list = [...getMemoryFaculty()];

      if (department && department !== 'ALL') {
        list = list.filter(f => f.department && f.department.toLowerCase() === department.toLowerCase());
      }

      if (designation && designation !== 'ALL') {
        list = list.filter(f => f.designation && f.designation.toLowerCase() === designation.toLowerCase());
      }

      if (q && q.trim()) {
        const term = q.trim().toLowerCase();
        list = list.filter(f =>
          (f.facultyId && f.facultyId.toLowerCase().includes(term)) ||
          (f.name && f.name.toLowerCase().includes(term)) ||
          (f.email && f.email.toLowerCase().includes(term)) ||
          (f.phoneNumber && f.phoneNumber.toLowerCase().includes(term)) ||
          (f.department && f.department.toLowerCase().includes(term)) ||
          (f.designation && f.designation.toLowerCase().includes(term))
        );
      }

      const sanitized = list.map(({ password, ...rest }) => rest);
      return res.json({ success: true, count: sanitized.length, faculty: sanitized });
    }
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching faculty records.' });
  }
});

// @route   GET /api/faculty/:id
// @desc    Get single faculty record by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const isMongo = getDBState();
    const idParam = req.params.id;

    if (isMongo) {
      let f = null;
      if (idParam.match(/^[0-9a-fA-F]{24}$/)) {
        f = await Faculty.findById(idParam).select('-password');
      }
      if (!f) {
        f = await Faculty.findOne({ facultyId: new RegExp(`^${idParam}$`, 'i') }).select('-password');
      }
      if (!f) {
        return res.status(404).json({ success: false, message: 'Faculty record not found.' });
      }
      return res.json({ success: true, faculty: f });
    } else {
      const memoryList = getMemoryFaculty();
      const f = memoryList.find(item => item._id === idParam || item.facultyId.toLowerCase() === idParam.toLowerCase());
      if (!f) {
        return res.status(404).json({ success: false, message: 'Faculty record not found.' });
      }
      const { password, ...sanitized } = f;
      return res.json({ success: true, faculty: sanitized });
    }
  } catch (error) {
    console.error('Error fetching faculty details:', error);
    res.status(500).json({ success: false, message: 'Server error fetching faculty profile.' });
  }
});

// @route   POST /api/faculty
// @desc    Add a new faculty member (Admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { facultyId, name, email, phoneNumber, password, department, designation, role, photoUrl } = req.body;

    if (!facultyId || !name || !password) {
      return res.status(400).json({ success: false, message: 'Faculty ID, Name, and Password are required.' });
    }

    const cleanFacultyId = facultyId.trim().toUpperCase();
    const isMongo = getDBState();

    if (isMongo) {
      const existing = await Faculty.findOne({ facultyId: new RegExp(`^${cleanFacultyId}$`, 'i') });
      if (existing) {
        return res.status(400).json({ success: false, message: `Faculty ID '${cleanFacultyId}' already exists.` });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newFaculty = new Faculty({
        facultyId: cleanFacultyId,
        name: name.trim(),
        email: (email || '').trim(),
        phoneNumber: (phoneNumber || '').trim(),
        password: hashedPassword,
        department: (department || 'Computer Science & Engineering').trim(),
        designation: (designation || 'Associate Professor').trim(),
        role: role === 'admin' ? 'admin' : 'faculty',
        photoUrl: (photoUrl || '').trim(),
        hasChangedPassword: req.body.hasChangedPassword !== undefined ? !!req.body.hasChangedPassword : false
      });

      await newFaculty.save();
      const savedObj = newFaculty.toObject();
      delete savedObj.password;

      return res.status(201).json({
        success: true,
        message: `Faculty record for ${name} created successfully!`,
        faculty: savedObj
      });
    } else {
      const memoryList = getMemoryFaculty();
      if (memoryList.some(f => f.facultyId.toLowerCase() === cleanFacultyId.toLowerCase())) {
        return res.status(400).json({ success: false, message: `Faculty ID '${cleanFacultyId}' already exists.` });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newRecord = {
        _id: cleanFacultyId,
        facultyId: cleanFacultyId,
        name: name.trim(),
        email: (email || '').trim(),
        phoneNumber: (phoneNumber || '').trim(),
        password: hashedPassword,
        department: (department || 'Computer Science & Engineering').trim(),
        designation: (designation || 'Associate Professor').trim(),
        role: role === 'admin' ? 'admin' : 'faculty',
        photoUrl: (photoUrl || '').trim(),
        hasChangedPassword: req.body.hasChangedPassword !== undefined ? !!req.body.hasChangedPassword : false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setMemoryFaculty([...memoryList, newRecord]);
      const { password: p, ...sanitized } = newRecord;

      return res.status(201).json({
        success: true,
        message: `Faculty record for ${name} created successfully!`,
        faculty: sanitized
      });
    }
  } catch (error) {
    console.error('Error creating faculty:', error);
    res.status(500).json({ success: false, message: 'Server error creating faculty record.' });
  }
});

// @route   PUT /api/faculty/profile/update
// @desc    Self-Profile update for logged in user
// Rules: Faculty can ONLY edit name, email, phoneNumber. Admin can edit all details & change password.
router.put('/profile/update', verifyToken, async (req, res) => {
  try {
    const isMongo = getDBState();
    const userId = req.faculty.id;
    const userRole = req.faculty.role;
    const { name, email, phoneNumber, department, designation, password, photoUrl } = req.body;

    if (isMongo) {
      let facultyUser = null;
      if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
        facultyUser = await Faculty.findById(userId);
      }
      if (!facultyUser) {
        facultyUser = await Faculty.findOne({ facultyId: new RegExp(`^${req.faculty.facultyId}$`, 'i') });
      }

      if (!facultyUser) {
        return res.status(404).json({ success: false, message: 'Profile record not found.' });
      }

      // Faculty can ONLY update personal details: name, email, phoneNumber, photoUrl
      if (name) facultyUser.name = name.trim();
      if (email !== undefined) facultyUser.email = email.trim();
      if (phoneNumber !== undefined) facultyUser.phoneNumber = phoneNumber.trim();
      if (photoUrl !== undefined) facultyUser.photoUrl = photoUrl.trim();

      // Only Admin can change department/designation via profile
      if (userRole === 'admin') {
        if (department) facultyUser.department = department.trim();
        if (designation) facultyUser.designation = designation.trim();
      }

      // Password change policy handling
      if (password && password.trim() !== '') {
        if (userRole !== 'admin' && facultyUser.hasChangedPassword) {
          return res.status(403).json({
            success: false,
            message: 'Access Denied: You have already used your 1-time password change opportunity. Only an Admin can change your password now.'
          });
        }

        const salt = await bcrypt.genSalt(10);
        facultyUser.password = await bcrypt.hash(password.trim(), salt);

        if (userRole !== 'admin') {
          facultyUser.hasChangedPassword = true;
        }
      }

      await facultyUser.save();

      const payload = {
        id: facultyUser._id,
        facultyId: facultyUser.facultyId,
        name: facultyUser.name,
        email: facultyUser.email,
        phoneNumber: facultyUser.phoneNumber,
        department: facultyUser.department,
        designation: facultyUser.designation,
        role: facultyUser.role,
        photoUrl: facultyUser.photoUrl || '',
        hasChangedPassword: !!facultyUser.hasChangedPassword
      };

      const tokenPayload = {
        id: facultyUser._id,
        facultyId: facultyUser.facultyId,
        name: facultyUser.name,
        role: facultyUser.role
      };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

      return res.json({
        success: true,
        message: 'Profile updated successfully!',
        token,
        faculty: payload
      });
    } else {
      let memoryList = getMemoryFaculty();
      const idx = memoryList.findIndex(f => f._id === userId || f.facultyId.toLowerCase() === (req.faculty.facultyId || '').toLowerCase());

      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Profile record not found.' });
      }

      const facultyUser = { ...memoryList[idx] };
      if (name) facultyUser.name = name.trim();
      if (email !== undefined) facultyUser.email = email.trim();
      if (phoneNumber !== undefined) facultyUser.phoneNumber = phoneNumber.trim();
      if (photoUrl !== undefined) facultyUser.photoUrl = photoUrl.trim();

      if (userRole === 'admin') {
        if (department) facultyUser.department = department.trim();
        if (designation) facultyUser.designation = designation.trim();
      }

      if (password && password.trim() !== '') {
        if (userRole !== 'admin' && facultyUser.hasChangedPassword) {
          return res.status(403).json({
            success: false,
            message: 'Access Denied: You have already used your 1-time password change opportunity. Only an Admin can change your password now.'
          });
        }

        const salt = await bcrypt.genSalt(10);
        facultyUser.password = await bcrypt.hash(password.trim(), salt);

        if (userRole !== 'admin') {
          facultyUser.hasChangedPassword = true;
        }
      }

      memoryList[idx] = facultyUser;
      setMemoryFaculty(memoryList);

      const payload = {
        id: facultyUser._id,
        facultyId: facultyUser.facultyId,
        name: facultyUser.name,
        email: facultyUser.email,
        phoneNumber: facultyUser.phoneNumber,
        department: facultyUser.department,
        designation: facultyUser.designation,
        role: facultyUser.role,
        photoUrl: facultyUser.photoUrl || '',
        hasChangedPassword: !!facultyUser.hasChangedPassword
      };

      const tokenPayload = {
        id: facultyUser._id,
        facultyId: facultyUser.facultyId,
        name: facultyUser.name,
        role: facultyUser.role
      };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

      return res.json({
        success: true,
        message: 'Profile updated successfully!',
        token,
        faculty: payload
      });
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
});

// @route   PUT /api/faculty/:id
// @desc    Update faculty details by ID (Admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const isMongo = getDBState();
    const idParam = req.params.id;
    const { facultyId, name, email, phoneNumber, password, department, designation, role, hasChangedPassword, photoUrl } = req.body;

    if (isMongo) {
      let facultyUser = null;
      if (idParam.match(/^[0-9a-fA-F]{24}$/)) {
        facultyUser = await Faculty.findById(idParam);
      }
      if (!facultyUser) {
        facultyUser = await Faculty.findOne({ facultyId: new RegExp(`^${idParam}$`, 'i') });
      }

      if (!facultyUser) {
        return res.status(404).json({ success: false, message: 'Faculty record not found.' });
      }

      if (facultyId && facultyId.trim().toUpperCase() !== facultyUser.facultyId) {
        const cleanId = facultyId.trim().toUpperCase();
        const existing = await Faculty.findOne({ facultyId: new RegExp(`^${cleanId}$`, 'i') });
        if (existing && existing._id.toString() !== facultyUser._id.toString()) {
          return res.status(400).json({ success: false, message: `Faculty ID '${cleanId}' is already used by another record.` });
        }
        facultyUser.facultyId = cleanId;
      }

      if (name) facultyUser.name = name.trim();
      if (email !== undefined) facultyUser.email = email.trim();
      if (phoneNumber !== undefined) facultyUser.phoneNumber = phoneNumber.trim();
      if (department) facultyUser.department = department.trim();
      if (designation) facultyUser.designation = designation.trim();
      if (role && (role === 'admin' || role === 'faculty')) facultyUser.role = role;
      if (photoUrl !== undefined) facultyUser.photoUrl = photoUrl.trim();
      if (hasChangedPassword !== undefined) facultyUser.hasChangedPassword = !!hasChangedPassword;

      if (password && password.trim() !== '') {
        const salt = await bcrypt.genSalt(10);
        facultyUser.password = await bcrypt.hash(password.trim(), salt);
      }

      await facultyUser.save();
      const obj = facultyUser.toObject();
      delete obj.password;

      return res.json({
        success: true,
        message: `Faculty record for ${facultyUser.name} updated successfully!`,
        faculty: obj
      });
    } else {
      let memoryList = getMemoryFaculty();
      const idx = memoryList.findIndex(item => item._id === idParam || item.facultyId.toLowerCase() === idParam.toLowerCase());

      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Faculty record not found.' });
      }

      const facultyUser = { ...memoryList[idx] };

      if (facultyId && facultyId.trim().toUpperCase() !== facultyUser.facultyId) {
        const cleanId = facultyId.trim().toUpperCase();
        if (memoryList.some(item => item._id !== facultyUser._id && item.facultyId.toLowerCase() === cleanId.toLowerCase())) {
          return res.status(400).json({ success: false, message: `Faculty ID '${cleanId}' is already used by another record.` });
        }
        facultyUser.facultyId = cleanId;
      }

      if (name) facultyUser.name = name.trim();
      if (email !== undefined) facultyUser.email = email.trim();
      if (phoneNumber !== undefined) facultyUser.phoneNumber = phoneNumber.trim();
      if (department) facultyUser.department = department.trim();
      if (designation) facultyUser.designation = designation.trim();
      if (role && (role === 'admin' || role === 'faculty')) facultyUser.role = role;
      if (photoUrl !== undefined) facultyUser.photoUrl = photoUrl;
      if (hasChangedPassword !== undefined) facultyUser.hasChangedPassword = !!hasChangedPassword;

      if (password && password.trim() !== '') {
        const salt = await bcrypt.genSalt(10);
        facultyUser.password = await bcrypt.hash(password.trim(), salt);
      }

      memoryList[idx] = facultyUser;
      setMemoryFaculty(memoryList);
      const { password: p, ...sanitized } = facultyUser;

      return res.json({
        success: true,
        message: `Faculty record for ${facultyUser.name} updated successfully!`,
        faculty: sanitized
      });
    }
  } catch (error) {
    console.error('Error updating faculty record:', error);
    res.status(500).json({ success: false, message: 'Server error updating faculty record.' });
  }
});

// @route   DELETE /api/faculty/:id
// @desc    Delete single faculty record by ID (Admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const isMongo = getDBState();
    const idParam = req.params.id;

    if (isMongo) {
      let result = null;
      if (idParam.match(/^[0-9a-fA-F]{24}$/)) {
        result = await Faculty.findByIdAndDelete(idParam);
      }
      if (!result) {
        result = await Faculty.findOneAndDelete({ facultyId: new RegExp(`^${idParam}$`, 'i') });
      }

      if (!result) {
        return res.status(404).json({ success: false, message: 'Faculty record not found.' });
      }

      return res.json({
        success: true,
        message: `Faculty record '${result.name}' (${result.facultyId}) deleted successfully!`
      });
    } else {
      let memoryList = getMemoryFaculty();
      const initialCount = memoryList.length;
      memoryList = memoryList.filter(item => item._id !== idParam && item.facultyId.toLowerCase() !== idParam.toLowerCase());

      if (memoryList.length === initialCount) {
        return res.status(404).json({ success: false, message: 'Faculty record not found.' });
      }

      setMemoryFaculty(memoryList);
      return res.json({
        success: true,
        message: 'Faculty record deleted successfully!'
      });
    }
  } catch (error) {
    console.error('Error deleting faculty record:', error);
    res.status(500).json({ success: false, message: 'Server error deleting faculty record.' });
  }
});

// @route   POST /api/faculty/bulk-delete
// @desc    Delete multiple faculty records (Admin only)
router.post('/bulk-delete', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { facultyIds } = req.body;
    if (!Array.isArray(facultyIds) || facultyIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide array of facultyIds to delete.' });
    }

    const isMongo = getDBState();

    if (isMongo) {
      const result = await Faculty.deleteMany({
        $or: [
          { _id: { $in: facultyIds.filter(id => id.match(/^[0-9a-fA-F]{24}$/)) } },
          { facultyId: { $in: facultyIds.map(id => String(id).toUpperCase()) } }
        ]
      });

      return res.json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} faculty record(s).`,
        deletedCount: result.deletedCount
      });
    } else {
      let memoryList = getMemoryFaculty();
      const setIds = new Set(facultyIds.map(id => String(id).toLowerCase()));
      const initialCount = memoryList.length;

      memoryList = memoryList.filter(item => !setIds.has(item._id.toLowerCase()) && !setIds.has(item.facultyId.toLowerCase()));
      const deletedCount = initialCount - memoryList.length;
      setMemoryFaculty(memoryList);

      return res.json({
        success: true,
        message: `Successfully deleted ${deletedCount} faculty record(s).`,
        deletedCount
      });
    }
  } catch (error) {
    console.error('Bulk faculty delete error:', error);
    res.status(500).json({ success: false, message: 'Server error executing bulk faculty delete.' });
  }
});

module.exports = router;
