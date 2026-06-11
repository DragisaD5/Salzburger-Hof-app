const express = require('express');
const router = express.Router();
const Room = require('../models/Room.model');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// GET /api/rooms — All authenticated users
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.floor) filter.floor = Number(req.query.floor);

    const rooms = await Room.find(filter).sort({ roomNumber: 1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/stats — Admin summary
router.get('/stats', protect, restrictTo('Admin', 'Receptionist'), async (req, res) => {
  try {
    const total = await Room.countDocuments();
    const free = await Room.countDocuments({ status: 'Free' });
    const occupied = await Room.countDocuments({ status: 'Occupied' });
    const cleaning = await Room.countDocuments({ status: 'Cleaning' });
    const dirty = await Room.countDocuments({ status: 'Dirty' });
    const vip = await Room.countDocuments({ isVIP: true });
    res.json({ total, free, occupied, cleaning, dirty, vip });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/:id — Single room
router.get('/:id', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/rooms — Admin only
router.post('/', protect, restrictTo('Admin'), async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/rooms/:id — Admin or Receptionist
router.put('/:id', protect, restrictTo('Admin', 'Receptionist'), async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    res.json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/rooms/:id/status — Receptionist, Housekeeping, Maintenance, Admin
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const allowedStatuses = ['Free', 'Occupied', 'Cleaning', 'Dirty'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const updateData = { status };
    if (notes !== undefined) updateData.notes = notes;

    const room = await Room.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/rooms/:id — Admin only
router.delete('/:id', protect, restrictTo('Admin'), async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    res.json({ message: 'Room deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
