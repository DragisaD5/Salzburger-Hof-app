require('dotenv').config();
// Force Google DNS — bypasses router DNS that blocks SRV records
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const roomRoutes = require('./routes/room.routes');
const bookingRoutes = require('./routes/booking.routes');
const ticketRoutes = require('./routes/ticket.routes');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tickets', ticketRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', hotel: 'Salzburger-Hof', timestamp: new Date().toISOString() });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ─── DB Connect & Start ───────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected — Salzburger-Hof');
    app.listen(process.env.PORT || 3000, () => {
      console.log(`🏨  Server running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });
