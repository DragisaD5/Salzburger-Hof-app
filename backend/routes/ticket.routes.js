const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket.model');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// GET /api/tickets — Maintenance, Admin, Receptionist
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.roomNumber) filter.roomNumber = Number(req.query.roomNumber);
    if (req.query.type) filter.type = req.query.type;

    const tickets = await Ticket.find(filter)
      .populate('assignedTo', 'displayName username role')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tickets/stats
router.get('/stats', protect, restrictTo('Admin', 'Maintenance'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;

    const open = await Ticket.countDocuments({ ...filter, status: 'Open' });
    const inProgress = await Ticket.countDocuments({ ...filter, status: 'In Progress' });
    const resolved = await Ticket.countDocuments({ ...filter, status: 'Resolved' });
    const urgent = await Ticket.countDocuments({ ...filter, priority: 'URGENT', status: { $ne: 'Resolved' } });
    res.json({ open, inProgress, resolved, urgent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tickets/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('assignedTo', 'displayName role');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tickets — Any authenticated user can create
router.post('/', protect, async (req, res) => {
  try {
    const ticket = new Ticket({
      ...req.body,
      reportedBy: req.user.displayName || req.user.username,
    });
    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/tickets/:id — Admin, Maintenance, Receptionist
router.put('/:id', protect, restrictTo('Admin', 'Maintenance', 'Receptionist'), async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/tickets/:id/resolve — Admin, Maintenance, Receptionist
router.patch('/:id/resolve', protect, restrictTo('Admin', 'Maintenance', 'Receptionist'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

    ticket.status = 'Resolved';
    ticket.resolvedAt = new Date();
    if (req.body.notes) ticket.notes = req.body.notes;
    await ticket.save();
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tickets/:id — Admin, Maintenance, Receptionist
router.delete('/:id', protect, restrictTo('Admin', 'Maintenance', 'Receptionist'), async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
    res.json({ message: 'Ticket deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
