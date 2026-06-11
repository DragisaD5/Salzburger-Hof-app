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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
