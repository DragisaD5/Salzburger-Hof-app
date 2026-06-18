const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    guestName: {
      type: String,
      required: true,
      trim: true,
    },
    guestEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    guestPhone: {
      type: String,
      trim: true,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    roomType: {
      type: String,
      enum: ['Standard', 'Deluxe', 'Suite', 'Penthouse'],
      required: true,
    },
    roomNumber: {
      type: Number,
      default: null,
    },
    adults: {
      type: Number,
      default: 1,
    },
    children: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Active', 'Cancelled', 'Completed'],
      default: 'Pending',
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid', 'Refunded', 'Pending'],
      default: 'Unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['Card', 'PayPal', 'Pay At Check-In'],
      default: 'Pay At Check-In',
    },
    transactionId: {
      type: String,
      required: function() {
        return this.paymentStatus === 'Paid';
      }
    },
    specialRequests: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      enum: ['Online', 'Walk-in', 'Phone'],
      default: 'Online',
    },
    addons: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
