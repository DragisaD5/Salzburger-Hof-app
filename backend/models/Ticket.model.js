const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: ['Plumbing', 'Electrical', 'Spa', 'General', 'Minibar', 'Heating'],
      required: true,
    },
    type: {
      type: String,
      enum: ['Maintenance', 'RoomService'],
      required: true,
      default: 'Maintenance',
    },
    priority: {
      type: String,
      enum: ['Low', 'High', 'URGENT'],
      default: 'Low',
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved'],
      default: 'Open',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    reportedBy: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid', 'Pending'],
      default: 'Unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['Card', 'PayPal', 'Room Charge'],
      default: 'Room Charge',
    },
    transactionId: {
      type: String,
    },
    price: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
