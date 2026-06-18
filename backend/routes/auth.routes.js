const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.role === 'Guest' && user.accountStatus === 'Pending') {
      return res.status(403).json({ message: 'Your account is currently pending verification by the Reception.' });
    }
    if (user.role === 'Guest' && user.accountStatus === 'Rejected') {
      return res.status(403).json({ message: 'Your registration request has been rejected by the Reception.' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const payload = {
      id: user._id,
      username: user.username,
      displayName: user.displayName || user.username,
      role: user.role,
      roomNumber: user.roomNumber,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role,
        roomNumber: user.roomNumber,
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// POST /api/auth/register (Guest Registration)
router.post('/register', async (req, res) => {
  try {
    const { username, password, displayName, roomNumber, email, phone } = req.body;

    if (!username || !password || !displayName || !email || !phone) {
      return res.status(400).json({ message: 'Username, password, email, phone, and full name are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long, contain at least one uppercase letter and one number.' });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    const user = new User({
      username: username.toLowerCase().trim(),
      password,
      role: 'Guest',
      displayName: displayName.trim(),
      roomNumber: roomNumber ? Number(roomNumber) : null,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      phoneNumber: '',
      accountStatus: 'Pending'
    });

    await user.save();

    const payload = {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      roomNumber: user.roomNumber,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        roomNumber: user.roomNumber,
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: err.message || 'Server error during registration.' });
  }
});

module.exports = router;
