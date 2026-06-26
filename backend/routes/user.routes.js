const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// GET /api/users/me — any authenticated user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    let userObj = user.toObject();
    if (user.role === 'Guest') {
      const Booking = require('../models/Booking.model');
      const emailQuery = user.email ? user.email.toLowerCase().trim() : '';
      const activeBooking = await Booking.findOne({
        guestEmail: emailQuery,
        status: { $in: ['Pending', 'Confirmed', 'Active'] }
      });
      userObj.activeBooking = activeBooking || null;
    } else {
      userObj.activeBooking = null;
    }

    res.json(userObj);
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
    const { username, password, role, displayName, roomNumber, email } = req.body;

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    const emailValue = email ? email.toLowerCase().trim() : `${username.toLowerCase()}@salzburgerhof.com`;

    const user = new User({
      username,
      password,
      role,
      displayName,
      roomNumber,
      email: emailValue
    });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/users/pending-guests — Admin, Receptionist
router.get('/pending-guests', protect, restrictTo('Admin', 'Receptionist'), async (req, res) => {
  try {
    const Booking = require('../models/Booking.model');
    const users = await User.find({ role: 'Guest', accountStatus: 'Pending' }).sort({ createdAt: -1 });

    const usersWithBookingEmail = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        userObj.bookingEmail = null;

        if (user.roomNumber) {
          const booking = await Booking.findOne({
            roomNumber: Number(user.roomNumber),
            status: { $in: ['Confirmed', 'Active'] }
          });
          if (booking) {
            userObj.bookingEmail = booking.guestEmail;
          }
        }
        return userObj;
      })
    );

    res.json(usersWithBookingEmail);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/activity-logs — Admin only
router.get('/activity-logs', protect, restrictTo('Admin'), async (req, res) => {
  try {
    const ActivityLog = require('../models/ActivityLog.model');
    const logs = await ActivityLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/users/:id/status — Admin, Receptionist
router.patch('/:id/status', protect, restrictTo('Admin', 'Receptionist'), async (req, res) => {
  try {
    const { status, roomNumber } = req.body;
    if (!['Pending', 'Active', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.accountStatus = status;
    if (roomNumber !== undefined && roomNumber !== null) {
      user.roomNumber = Number(roomNumber);
    }
    await user.save();

    if (status === 'Active') {
      const ActivityLog = require('../models/ActivityLog.model');
      const log = new ActivityLog({
        action: 'Guest Account Activated',
        details: `Receptionist verified Guest ${user.displayName || user.username} for Room ${user.roomNumber ?? 'Unassigned'}, Phone: ${user.phone ?? 'N/A'}`,
        timestamp: Date.now()
      });
      await log.save();
    }

    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/users/profile — Update own profile
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const { email, phoneNumber, displayName, password } = req.body;
    if (email !== undefined) user.email = email;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (displayName !== undefined) user.displayName = displayName;
    if (password) {
      user.password = password; // Pre-save hook will hash it
    }

    await user.save();
    res.json(user);
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
