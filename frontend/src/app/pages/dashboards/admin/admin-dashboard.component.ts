import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RoomService, RoomStats } from '../../../core/services/room.service';
import { TicketService, TicketStats } from '../../../core/services/ticket.service';
import { BookingService, Booking } from '../../../core/services/booking.service';
import { UserService, StaffUser } from '../../../core/services/user.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit {
  user: any;
  today = new Date();
  activeTab = signal<'overview' | 'staff' | 'bookings'>('overview');

  roomStats = signal<RoomStats | null>(null);
  ticketStats = signal<TicketStats | null>(null);
  bookings = signal<Booking[]>([]);
  staff = signal<StaffUser[]>([]);
  loading = signal(true);
  toast = signal('');
  toastType = signal<'success' | 'error'>('success');

  showCreateStaff = signal(false);
  newStaff = {
    username: '',
    password: '',
    displayName: '',
    role: 'Receptionist',
    roomNumber: null as number | null,
  };

  readonly roles = ['Admin', 'Receptionist', 'Housekeeping', 'Maintenance', 'Guest'];

  staffByRole = computed(() => {
    const grouped: Record<string, StaffUser[]> = {};
    this.staff().forEach((s) => {
      if (!grouped[s.role]) grouped[s.role] = [];
      grouped[s.role].push(s);
    });
    return grouped;
  });

  roleKeys = computed(() => Object.keys(this.staffByRole()));

  constructor(
    private auth: AuthService,
    private roomService: RoomService,
    private ticketService: TicketService,
    private bookingService: BookingService,
    private userService: UserService
  ) {
    this.user = auth.currentUser();
  }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.roomService.getStats().subscribe({ next: (s) => this.roomStats.set(s) });
    this.ticketService.getStats().subscribe({ next: (s) => this.ticketStats.set(s) });
    this.bookingService.getBookings().subscribe({ next: (b) => this.bookings.set(b) });
    this.userService.getUsers().subscribe({
      next: (u) => { this.staff.set(u); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createStaff(): void {
    if (!this.newStaff.username || !this.newStaff.password || !this.newStaff.displayName) {
      this.showToast('Fill in all required fields.', 'error');
      return;
    }
    this.userService.createUser({
      username: this.newStaff.username,
      password: this.newStaff.password,
      displayName: this.newStaff.displayName,
      role: this.newStaff.role,
      roomNumber: this.newStaff.roomNumber ?? undefined,
    }).subscribe({
      next: (user) => {
        this.staff.update((prev) => [user, ...prev]);
        this.showToast(`${user.displayName} created successfully.`, 'success');
        this.showCreateStaff.set(false);
        this.newStaff = { username: '', password: '', displayName: '', role: 'Receptionist', roomNumber: null };
      },
      error: (err) => this.showToast(err.error?.message || 'Failed to create user.', 'error'),
    });
  }

  deleteStaff(user: StaffUser): void {
    if (!confirm(`Delete ${user.displayName}?`)) return;
    this.userService.deleteUser(user._id).subscribe({
      next: () => {
        this.staff.update((prev) => prev.filter((s) => s._id !== user._id));
        this.showToast(`${user.displayName} removed.`, 'success');
      },
      error: () => this.showToast('Failed to delete user.', 'error'),
    });
  }

  getBookingBadge(status: string): string {
    const map: Record<string, string> = { Pending: 'badge-pending', Confirmed: 'badge-confirmed', Active: 'badge-active', Cancelled: 'badge-dirty', Completed: 'badge-free' };
    return map[status] || 'badge-low';
  }

  getRoleIcon(role: string): string {
    const icons: Record<string, string> = { Admin: '⬡', Receptionist: '🛎', Housekeeping: '🧹', Maintenance: '🔧', Guest: '🏨' };
    return icons[role] || '●';
  }

  getRoleColor(role: string): string {
    const map: Record<string, string> = {
      'Admin': '#5c3a0a, #b8762a',
      'Receptionist': '#1a3a2d, #2d5a3d',
      'Housekeeping': '#3a2a0a, #7c5a1a',
      'Maintenance': '#4a1a1a, #b03a2e',
      'Guest': '#2a2a3a, #4a4a6a',
    };
    return map[role] ?? '#3a3a3a, #5a5a5a';
  }

  getRevenue = (acc: number, b: Booking): number =>
    ['Active', 'Confirmed'].includes(b.status) ? acc + (b.totalPrice ?? 0) : acc;

  private showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toast.set(''), 4000);
  }

  logout(): void { this.auth.logout(); }
}
