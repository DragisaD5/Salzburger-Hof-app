const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking.model');
const Room = require('../models/Room.model');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// GET /api/bookings — Admin, Receptionist
router.get('/', protect, restrictTo('Admin', 'Receptionist'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const bookings = await Booking.find(filter).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/:id — Admin, Receptionist
router.get('/:id', protect, restrictTo('Admin', 'Receptionist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/bookings — Public-ish (any logged user or guest portal)
router.post('/', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/bookings/checkout — Processes room booking checkout with simulated payment
router.post('/checkout', async (req, res) => {
  try {
    const { booking, paymentMethod } = req.body;
    if (!booking) {
      return res.status(400).json({ message: 'Booking details are required.' });
    }

    const newBookingData = {
      ...booking,
      paymentMethod,
    };

    if (paymentMethod === 'Card' || paymentMethod === 'PayPal') {
      newBookingData.paymentStatus = 'Paid';
      newBookingData.transactionId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
    } else {
      newBookingData.paymentStatus = 'Unpaid';
      newBookingData.paymentMethod = 'Pay At Check-In';
    }

    const savedBooking = new Booking(newBookingData);
    await savedBooking.save();
    res.status(201).json(savedBooking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/bookings/:id — Admin, Receptionist
router.put('/:id', protect, restrictTo('Admin', 'Receptionist'), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    res.json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/bookings/:id/status — Approve, Activate, Cancel
router.patch('/:id/status', protect, restrictTo('Admin', 'Receptionist'), async (req, res) => {
  try {
    const { status, roomNumber } = req.body;
    const allowedStatuses = ['Pending', 'Confirmed', 'Active', 'Cancelled', 'Completed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    booking.status = status;
    if (roomNumber) booking.roomNumber = roomNumber;

    // If activating, update room status to Occupied
    if (status === 'Active' && booking.roomNumber) {
      await Room.findOneAndUpdate(
        { roomNumber: booking.roomNumber },
        { status: 'Occupied' }
      );
    }

    // If completing or cancelling, mark room as Dirty
    if ((status === 'Completed' || status === 'Cancelled') && booking.roomNumber) {
      await Room.findOneAndUpdate(
        { roomNumber: booking.roomNumber },
        { status: 'Dirty' }
      );
    }

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/bookings/:id — Admin only
router.delete('/:id', protect, restrictTo('Admin'), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    res.json({ message: 'Booking deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
