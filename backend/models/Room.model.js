const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      enum: ['Standard', 'Deluxe', 'Suite', 'Penthouse'],
      required: true,
    },
    floor: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Free', 'Occupied', 'Cleaning', 'Dirty'],
      default: 'Free',
    },
    isVIP: {
      type: Boolean,
      default: false,
    },
    pricePerNight: {
      type: Number,
      required: true,
    },
    amenities: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
