require('dotenv').config();
// Force Google DNS — bypasses router DNS that blocks SRV records
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User.model');
const Room = require('./models/Room.model');
const Booking = require('./models/Booking.model');
const Ticket = require('./models/Ticket.model');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getRoomCategory = (num) => {
  if (num >= 201 && num <= 205) return 'Penthouse';
  if (num >= 151 && num <= 165) return 'Suite';
  if (num >= 126 && num <= 150) return 'Deluxe';
  return 'Standard';
};

const getRoomPrice = (category) => {
  switch (category) {
    case 'Penthouse': return 850;
    case 'Suite': return 450;
    case 'Deluxe': return 280;
    default: return 160;
  }
};

const getAmenities = (category) => {
  const base = ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar'];
  if (category === 'Deluxe') return [...base, 'Mountain View', 'Nespresso Machine'];
  if (category === 'Suite') return [...base, 'Mountain View', 'Jacuzzi', 'Living Room', 'Butler Service'];
  if (category === 'Penthouse') return [...base, 'Panoramic View', 'Private Terrace', 'Jacuzzi', 'Fireplace', 'Butler Service', 'Private Chef'];
  return base;
};

const randomStatus = () => {
  const statuses = ['Free', 'Free', 'Free', 'Occupied', 'Cleaning', 'Dirty'];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

const futureDate = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
};

// ─── Seed Data ────────────────────────────────────────────────────────────────
const STAFF = [
  {
    username: 'admin',
    password: 'Admin1234!',
    role: 'Admin',
    displayName: 'Klaus Hofmann',
  },
  {
    username: 'lukas.weber',
    password: 'Staff1234!',
    role: 'Receptionist',
    displayName: 'Lukas Weber',
  },
  {
    username: 'anna.gruber',
    password: 'Staff1234!',
    role: 'Receptionist',
    displayName: 'Anna Gruber',
  },
  {
    username: 'maria.steiner',
    password: 'Staff1234!',
    role: 'Housekeeping',
    displayName: 'Maria Steiner',
  },
  {
    username: 'sophie.bauer',
    password: 'Staff1234!',
    role: 'Housekeeping',
    displayName: 'Sophie Bauer',
  },
  {
    username: 'thomas.huber',
    password: 'Staff1234!',
    role: 'Maintenance',
    displayName: 'Thomas Huber',
  },
  {
    username: 'felix.wagner',
    password: 'Staff1234!',
    role: 'Maintenance',
    displayName: 'Felix Wagner',
  },
  {
    username: 'guest.room201',
    password: 'Guest1234!',
    role: 'Guest',
    displayName: 'Sebastian Müller',
    roomNumber: 201,
    email: 'guest.room201@gmail.com',
    phone: '436601234567',
  },
];

const SAMPLE_BOOKINGS = [
  {
    guestName: 'Heinrich Baumgartner',
    guestEmail: 'h.baumgartner@email.at',
    guestPhone: '+43 660 123 4567',
    checkIn: futureDate(2),
    checkOut: futureDate(5),
    roomType: 'Suite',
    roomNumber: 155,
    adults: 2,
    status: 'Confirmed',
    totalPrice: 1350,
    source: 'Online',
  },
  {
    guestName: 'Elisabeth Kröll',
    guestEmail: 'e.kroll@email.de',
    guestPhone: '+49 171 987 6543',
    checkIn: futureDate(1),
    checkOut: futureDate(3),
    roomType: 'Deluxe',
    roomNumber: 130,
    adults: 2,
    children: 1,
    status: 'Pending',
    totalPrice: 560,
    source: 'Online',
  },
  {
    guestName: 'Johann Schreiber',
    guestEmail: 'j.schreiber@corp.ch',
    checkIn: futureDate(0),
    checkOut: futureDate(4),
    roomType: 'Penthouse',
    roomNumber: 203,
    adults: 1,
    status: 'Active',
    totalPrice: 3400,
    specialRequests: 'Airport transfer required. Late checkout.',
    source: 'Phone',
  },
  {
    guestName: 'Franziska Windisch',
    guestEmail: 'f.windisch@email.at',
    checkIn: futureDate(7),
    checkOut: futureDate(10),
    roomType: 'Standard',
    adults: 2,
    status: 'Pending',
    totalPrice: 480,
    source: 'Online',
  },
  {
    guestName: 'Karl Rainer',
    guestEmail: 'k.rainer@email.at',
    checkIn: futureDate(-1),
    checkOut: futureDate(2),
    roomType: 'Deluxe',
    roomNumber: 140,
    adults: 2,
    status: 'Active',
    totalPrice: 840,
    source: 'Walk-in',
  },
];

const SAMPLE_TICKETS = [
  {
    roomNumber: 115,
    category: 'Plumbing',
    priority: 'URGENT',
    description: 'Bathroom sink completely blocked, water overflowing onto floor.',
    status: 'Open',
    type: 'Maintenance',
  },
  {
    roomNumber: 203,
    category: 'Electrical',
    priority: 'High',
    description: 'Main ceiling light flickering intermittently. Guest complaining.',
    status: 'Open',
    type: 'Maintenance',
  },
  {
    roomNumber: 132,
    category: 'Heating',
    priority: 'URGENT',
    description: 'Heating system not responding. Room temperature dropping — guest furious.',
    status: 'In Progress',
    type: 'Maintenance',
  },
  {
    roomNumber: 201,
    category: 'Minibar',
    priority: 'Low',
    description: 'Minibar restock requested. Sparkling water and Austrian white wine.',
    status: 'Open',
    type: 'RoomService',
  },
  {
    roomNumber: 155,
    category: 'Spa',
    priority: 'High',
    description: 'Jacuzzi jets not functioning correctly. VIP guest suite.',
    status: 'Open',
    type: 'RoomService',
  },
  {
    roomNumber: 108,
    category: 'General',
    priority: 'Low',
    description: 'Extra pillow set requested for tonight.',
    status: 'Resolved',
    type: 'RoomService',
  },
  {
    roomNumber: 127,
    category: 'Electrical',
    priority: 'High',
    description: 'TV remote not working, replacement needed.',
    status: 'Resolved',
    type: 'Maintenance',
  },
];

// ─── Main Seed Function ────────────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  Connected to MongoDB');

    // Clear all collections
    console.log('🗑️   Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Room.deleteMany({}),
      Booking.deleteMany({}),
      Ticket.deleteMany({}),
    ]);
    console.log('✅  Collections cleared');

    // ── Seed Rooms (101–205) ──────────────────────────────────────────────────
    console.log('🏨  Seeding rooms 101–205...');
    const rooms = [];
    for (let num = 101; num <= 205; num++) {
      const category = getRoomCategory(num);
      const floor = Math.floor(num / 100);
      const isVIP = category === 'Penthouse' || (category === 'Suite' && num % 5 === 0);
      // Room 201 is occupied by our guest user
      const status = num === 201 ? 'Occupied' : (num === 203 ? 'Occupied' : randomStatus());

      rooms.push({
        roomNumber: num,
        category,
        floor,
        status,
        isVIP,
        pricePerNight: getRoomPrice(category),
        amenities: getAmenities(category),
      });
    }
    await Room.insertMany(rooms);
    console.log(`✅  ${rooms.length} rooms seeded`);

    // ── Seed Staff & Guest ────────────────────────────────────────────────────
    console.log('👥  Seeding staff & guest users...');
    const createdUsers = [];
    for (const staffData of STAFF) {
      if (!staffData.email) {
        staffData.email = `${staffData.username}@salzburgerhof.com`;
      }
      const user = new User(staffData);
      await user.save(); // triggers bcrypt pre-save hook
      createdUsers.push(user);
      console.log(`   ✓ ${staffData.displayName} (${staffData.role}) — login: ${staffData.username} / ${staffData.password}`);
    }
    console.log(`✅  ${createdUsers.length} users created`);

    // ── Seed Bookings ─────────────────────────────────────────────────────────
    console.log('📋  Seeding bookings...');
    await Booking.insertMany(SAMPLE_BOOKINGS);
    console.log(`✅  ${SAMPLE_BOOKINGS.length} bookings seeded`);

    // ── Seed Tickets ──────────────────────────────────────────────────────────
    console.log('🔧  Seeding maintenance tickets...');
    const maintenanceUser = createdUsers.find(u => u.role === 'Maintenance');
    const ticketsWithAssignment = SAMPLE_TICKETS.map((t, i) => ({
      ...t,
      reportedBy: 'System Seed',
      assignedTo: i < 3 ? maintenanceUser?._id : null, // Assign first 3 to maintenance
    }));
    await Ticket.insertMany(ticketsWithAssignment);
    console.log(`✅  ${SAMPLE_TICKETS.length} tickets seeded`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════════════════════');
    console.log('🏨  Hotel Salzburger Hof — DATABASE SEEDED SUCCESSFULLY');
    console.log('════════════════════════════════════════════════════════');
    console.log('\n📋  LOGIN CREDENTIALS:');
    console.log('   Admin:       admin          / Admin1234!');
    console.log('   Receptionist: lukas.weber   / Staff1234!');
    console.log('   Receptionist: anna.gruber   / Staff1234!');
    console.log('   Housekeeping: maria.steiner / Staff1234!');
    console.log('   Housekeeping: sophie.bauer  / Staff1234!');
    console.log('   Maintenance:  thomas.huber  / Staff1234!');
    console.log('   Maintenance:  felix.wagner  / Staff1234!');
    console.log('   Guest (201):  guest.room201 / Guest1234!');
    console.log('════════════════════════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌  Seed error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
