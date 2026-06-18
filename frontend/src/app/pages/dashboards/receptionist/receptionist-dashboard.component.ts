import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RoomService, Room, RoomStats } from '../../../core/services/room.service';
import { BookingService, Booking } from '../../../core/services/booking.service';
import { UserService, StaffUser } from '../../../core/services/user.service';
import { TicketService, Ticket } from '../../../core/services/ticket.service';

@Component({
  selector: 'app-receptionist-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './receptionist-dashboard.component.html',
  styleUrls: ['./receptionist-dashboard.component.scss'],
})
export class ReceptionistDashboardComponent implements OnInit {
  user: any;
  activeTab = signal<'rooms' | 'reservations' | 'walkin' | 'verifications' | 'orders'>('rooms');

  rooms = signal<Room[]>([]);
  bookings = signal<Booking[]>([]);
  pendingGuests = signal<StaffUser[]>([]);
  orders = signal<Ticket[]>([]);
  stats = signal<RoomStats | null>(null);
  loading = signal(true);
  toast = signal('');
  toastType = signal<'success' | 'error'>('success');

  statusFilter = signal('');

  activeOrdersCount = computed(() => this.orders().filter(o => o.status !== 'Resolved').length);

  filteredRooms = computed(() => {
    const filter = this.statusFilter();
    if (!filter) return this.rooms();
    return this.rooms().filter((r) => r.status === filter);
  });

  pendingCount = computed(() => this.bookings().filter((b) => b.status === 'Pending').length);

  // Floor-based computed arrays for room grid
  floor1Rooms = computed(() => this.filteredRooms().filter(r => r.roomNumber >= 101 && r.roomNumber <= 125));
  floor2Rooms = computed(() => this.filteredRooms().filter(r => r.roomNumber >= 126 && r.roomNumber <= 150));
  floor3Rooms = computed(() => this.filteredRooms().filter(r => r.roomNumber >= 151 && r.roomNumber <= 175));
  floor4Rooms = computed(() => this.filteredRooms().filter(r => r.roomNumber >= 176 && r.roomNumber <= 200));
  floor5Rooms = computed(() => this.filteredRooms().filter(r => r.roomNumber >= 201 && r.roomNumber <= 205));

  // Walk-in booking form
  walkInForm = {
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: '',
    roomType: 'Standard',
    roomNumber: null as number | null,
    adults: 1,
    children: 0,
    specialRequests: '',
  };

  readonly roomTypes = ['Standard', 'Deluxe', 'Suite', 'Penthouse'];
  readonly statuses = ['Free', 'Occupied', 'Cleaning', 'Dirty'];
  readonly today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  readonly ROOM_PRICES: Record<string, number> = { Standard: 160, Deluxe: 280, Suite: 450, Penthouse: 850 };

  estimatedTotal = computed(() => {
    const { checkIn, checkOut, roomType } = this.walkInForm;
    if (!checkIn || !checkOut) return 0;
    const nights = this.nightCount(checkIn, checkOut);
    return nights * (this.ROOM_PRICES[roomType] || 160);
  });

  constructor(
    private auth: AuthService,
    private roomService: RoomService,
    private bookingService: BookingService,
    private userService: UserService,
    private ticketService: TicketService
  ) {
    this.user = auth.currentUser();
  }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.roomService.getRooms().subscribe({
      next: (r) => { this.rooms.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.roomService.getStats().subscribe({ next: (s) => this.stats.set(s) });
    this.bookingService.getBookings().subscribe({ next: (b) => this.bookings.set(b) });
    this.userService.getPendingGuests().subscribe({ next: (users) => this.pendingGuests.set(users) });
    this.ticketService.getTickets({ type: 'RoomService' }).subscribe({
      next: (t) => this.orders.set(t),
      error: (err) => console.error('Failed to load room service orders:', err)
    });
  }

  approveBooking(booking: Booking): void {
    this.bookingService.updateStatus(booking._id, 'Confirmed').subscribe({
      next: (updated) => {
        this.bookings.update((prev) =>
          prev.map((b) => (b._id === updated._id ? updated : b))
        );
        this.showToast('Booking confirmed successfully.', 'success');
      },
      error: () => this.showToast('Failed to confirm booking.', 'error'),
    });
  }

  activateBooking(booking: Booking): void {
    if (!booking.roomNumber) {
      this.showToast('Assign a room number first.', 'error');
      return;
    }
    this.bookingService.updateStatus(booking._id, 'Active', booking.roomNumber).subscribe({
      next: (updated) => {
        this.bookings.update((prev) =>
          prev.map((b) => (b._id === updated._id ? updated : b))
        );
        this.roomService.getRooms().subscribe((r) => this.rooms.set(r));
        this.showToast('Guest checked in. Room status updated.', 'success');
      },
      error: () => this.showToast('Check-in failed.', 'error'),
    });
  }

  submitWalkIn(): void {
    if (!this.walkInForm.guestName || !this.walkInForm.checkOut) {
      this.showToast('Fill in guest name and check-out date.', 'error');
      return;
    }
    const checkIn = new Date(this.walkInForm.checkIn);
    const checkOut = new Date(this.walkInForm.checkOut);
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000));
    const prices: Record<string, number> = { Standard: 160, Deluxe: 280, Suite: 450, Penthouse: 850 };
    const total = nights * (prices[this.walkInForm.roomType] || 160);

    this.bookingService.createBooking({
      ...this.walkInForm,
      roomNumber: this.walkInForm.roomNumber ?? undefined,
      status: 'Confirmed',
      source: 'Walk-in',
      totalPrice: total,
    }).subscribe({
      next: () => {
        this.showToast('Walk-in booking created.', 'success');
        this.activeTab.set('reservations');
        this.bookingService.getBookings().subscribe((b) => this.bookings.set(b));
        this.walkInForm = { guestName: '', guestEmail: '', guestPhone: '', checkIn: new Date().toISOString().split('T')[0], checkOut: '', roomType: 'Standard', roomNumber: null, adults: 1, children: 0, specialRequests: '' };
      },
      error: () => this.showToast('Failed to create booking.', 'error'),
    });
  }

  nightCount(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(0, Math.ceil(diff / 86400000));
  }

  getRoomStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getBookingBadge(status: string): string {
    const map: Record<string, string> = { Pending: 'badge-pending', Confirmed: 'badge-confirmed', Active: 'badge-active', Cancelled: 'badge-dirty', Completed: 'badge-free' };
    return map[status] || 'badge-low';
  }

  getAvailableRoomsForType(type: string): Room[] {
    return this.rooms().filter((r) => r.category === type && r.status === 'Free');
  }

  assignRoom(booking: Booking, roomNumber: number | null): void {
    const val = roomNumber ? Number(roomNumber) : null;
    this.bookingService.updateBooking(booking._id, { roomNumber: val ?? undefined }).subscribe({
      next: (updated) => {
        this.bookings.update((prev) =>
          prev.map((b) => (b._id === updated._id ? updated : b))
        );
        this.showToast(`Room RM ${val} assigned to ${booking.guestName}.`, 'success');
      },
      error: () => this.showToast('Failed to assign room.', 'error'),
    });
  }

  approveGuest(guestId: string): void {
    this.userService.updateUserStatus(guestId, 'Active').subscribe({
      next: () => {
        this.pendingGuests.update((prev) => prev.filter((g) => g._id !== guestId));
        this.showToast('Guest account approved.', 'success');
      },
      error: () => this.showToast('Failed to approve guest.', 'error')
    });
  }

  rejectGuest(guestId: string): void {
    if (!confirm('Reject this guest registration?')) return;
    this.userService.updateUserStatus(guestId, 'Rejected').subscribe({
      next: () => {
        this.pendingGuests.update((prev) => prev.filter((g) => g._id !== guestId));
        this.showToast('Guest account rejected.', 'success');
      },
      error: () => this.showToast('Failed to reject guest.', 'error')
    });
  }

  private showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toast.set(''), 4000);
  }

  acknowledgeOrder(orderId: string): void {
    this.ticketService.updateTicket(orderId, { status: 'In Progress' }).subscribe({
      next: (updated) => {
        this.orders.update((prev) => prev.map((o) => o._id === updated._id ? updated : o));
        this.showToast('Order acknowledged.', 'success');
      },
      error: () => this.showToast('Failed to acknowledge order.', 'error'),
    });
  }

  fulfillOrder(orderId: string): void {
    this.ticketService.resolveTicket(orderId).subscribe({
      next: (updated) => {
        this.orders.update((prev) => prev.map((o) => o._id === updated._id ? updated : o));
        this.showToast('Order fulfilled and completed.', 'success');
      },
      error: () => this.showToast('Failed to fulfill order.', 'error'),
    });
  }

  logout(): void { this.auth.logout(); }
}
