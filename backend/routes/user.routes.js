const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// GET /api/users/me — any authenticated user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users — Admin only
router.get('/', protect, restrictTo('Admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users — Admin only
router.post('/', protect, restrictTo('Admin'), async (req, res) => {
  try {
    const { username, password, role, displayName, roomNumber } = req.body;

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    const user = new User({ username, password, role, displayName, roomNumber });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/users/:id — Admin only
router.put('/:id', protect, restrictTo('Admin'), async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    Object.assign(user, rest);
    if (password) {
      user.password = password; // pre-save hook will hash it
    }
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/users/:id — Admin only
router.delete('/:id', protect, restrictTo('Admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
