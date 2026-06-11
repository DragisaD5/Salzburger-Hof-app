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
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

module.exports = router;
