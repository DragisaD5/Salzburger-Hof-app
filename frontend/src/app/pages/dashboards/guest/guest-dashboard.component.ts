import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TicketService, Ticket } from '../../../core/services/ticket.service';
import { RoomService, Room } from '../../../core/services/room.service';
import { UserService } from '../../../core/services/user.service';
import { PaymentModalComponent } from '../../../components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-guest-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentModalComponent],
  templateUrl: './guest-dashboard.component.html',
  styleUrls: ['./guest-dashboard.component.scss'],
})
export class GuestDashboardComponent implements OnInit {
  user: any;
  tickets = signal<Ticket[]>([]);
  myRoom = signal<Room | null>(null);
  loading = signal(true);
  
  // Interactive Panel State
  activeActionTab = signal<'none' | 'maintenance' | 'room-service' | 'spa' | 'dining' | 'profile'>('none');
  ticketSuccess = signal('');
  ticketError = signal('');

  // Payment Modal State
  showPaymentModal = signal(false);
  paymentAmount = signal(0);
  paymentDescription = signal('');
  pendingTicketData = signal<any>(null);

  // Profile Form
  profileForm = { displayName: '', email: '', phoneNumber: '', password: '' };

  // Maintenance
  newTicket = { category: 'General', priority: 'Low' as 'Low' | 'High' | 'URGENT', description: '' };
  readonly categories = ['General', 'Minibar', 'Plumbing', 'Electrical', 'Spa', 'Heating'];
  readonly priorities: Array<'Low' | 'High' | 'URGENT'> = ['Low', 'High', 'URGENT'];

  // Room Service Menu
  readonly roomServiceMenu = [
    { id: 1, name: 'Wiener Schnitzel', desc: 'Traditional veal cutlet with potato salad', price: 28 },
    { id: 2, name: 'Salzburger Nockerl', desc: 'Sweet soufflé with raspberry coulis', price: 16 },
    { id: 3, name: 'Alpine Char', desc: 'Local lake fish with herb butter', price: 26 },
    { id: 4, name: 'Draft Stiegl Beer', desc: '0.5L local Salzburg beer', price: 6 },
    { id: 5, name: 'Mountain Herbal Tea', desc: 'Fresh local herbs', price: 5 }
  ];
  roomServiceOrder = signal<Record<number, number>>({});
  roomServiceTotal = computed(() => {
    return this.roomServiceMenu.reduce((total, item) => total + (this.roomServiceOrder()[item.id] || 0) * item.price, 0);
  });

  // Spa Booking
  readonly spaTreatments = [
    { id: 'massage-alpine', name: 'Alpine Herbal Massage (60 min)', price: 95 },
    { id: 'massage-deep', name: 'Deep Tissue Recovery (90 min)', price: 135 },
    { id: 'facial-glow', name: 'Aromatherapy Facial (50 min)', price: 85 },
    { id: 'sauna-private', name: 'Private Finnish Sauna Slot (90 min)', price: 45 }
  ];
  spaForm = { treatmentId: '', date: '', time: '' };
  
  // Dining Booking
  diningForm = { guests: 2, slot: 'Dinner', date: '', time: '' };

  constructor(
    private auth: AuthService,
    private ticketService: TicketService,
    private roomService: RoomService,
    private userService: UserService
  ) {
    this.user = auth.currentUser();
  }

  ngOnInit(): void {
    // Initialize profile form
    this.profileForm.displayName = this.user?.displayName || '';
    this.profileForm.email = this.user?.email || '';
    this.profileForm.phoneNumber = this.user?.phoneNumber || '';

    const roomNum = this.user?.roomNumber;
    if (roomNum) {
      this.ticketService.getTickets({ roomNumber: roomNum }).subscribe({
        next: (t) => {
          this.tickets.set(t);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

      this.roomService.getRooms().subscribe({
        next: (rooms) => {
          const r = rooms.find((room) => room.roomNumber === roomNum);
          this.myRoom.set(r ?? null);
        },
      });
    } else {
      this.loading.set(false);
    }
  }

  toggleActionTab(tab: 'maintenance' | 'room-service' | 'spa' | 'dining' | 'profile'): void {
    if (this.activeActionTab() === tab) {
      this.activeActionTab.set('none');
    } else {
      this.activeActionTab.set(tab);
      this.ticketError.set('');
    }
  }

  // Generic request submitter mapped to Tickets
  private submitServiceRequest(category: any, description: string, successMessage: string, type: 'Maintenance' | 'RoomService' = 'Maintenance') {
    this.ticketError.set('');
    this.ticketService.createTicket({
      roomNumber: this.user?.roomNumber!,
      category: category,
      priority: 'Low',
      description: description,
      type: type,
    }).subscribe({
      next: (ticket) => {
        this.tickets.update((prev) => [ticket, ...prev]);
        this.ticketSuccess.set(successMessage);
        this.activeActionTab.set('none');
        setTimeout(() => this.ticketSuccess.set(''), 5000);
      },
      error: (err) => {
        this.ticketError.set(err.error?.message || 'Failed to submit request.');
      },
    });
  }

  submitTicket(): void {
    if (!this.newTicket.description.trim()) {
      this.ticketError.set('Please describe your request.');
      return;
    }
    this.submitServiceRequest(this.newTicket.category, this.newTicket.description, 'Your request has been submitted. Our team will attend to it shortly.', 'Maintenance');
    this.newTicket = { category: 'General', priority: 'Low', description: '' };
  }

  updateRoomServiceQty(id: number, delta: number) {
    this.roomServiceOrder.update(order => {
      const current = order[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...order, [id]: next };
    });
  }

  submitRoomServiceOrder(): void {
    const orderItems = this.roomServiceMenu
      .filter(item => (this.roomServiceOrder()[item.id] || 0) > 0)
      .map(item => `${this.roomServiceOrder()[item.id]}x ${item.name} (€${item.price * this.roomServiceOrder()[item.id]})`);
      
    if (orderItems.length === 0) {
      this.ticketError.set('Please add items to your order.');
      return;
    }

    const total = this.roomServiceTotal();
    const description = `ROOM SERVICE ORDER:\n${orderItems.join('\n')}\n\nTOTAL: €${total}`;

    const ticketData = {
      roomNumber: this.user?.roomNumber!,
      category: 'Minibar',
      priority: 'Low' as 'Low',
      description: description,
      price: total,
      type: 'RoomService' as 'RoomService',
    };

    this.pendingTicketData.set(ticketData);
    this.paymentAmount.set(total);
    this.paymentDescription.set('In-Room Dining Order');
    this.showPaymentModal.set(true);
    
    // Clear order
    this.roomServiceOrder.set({});
  }

  submitSpaBooking(): void {
    if (!this.spaForm.treatmentId || !this.spaForm.date || !this.spaForm.time) {
      this.ticketError.set('Please fill out all spa booking fields.');
      return;
    }
    const treatment = this.spaTreatments.find(t => t.id === this.spaForm.treatmentId);
    if (!treatment) return;
    
    const description = `SPA BOOKING REQUEST:\nTreatment: ${treatment.name}\nDate: ${this.spaForm.date}\nTime: ${this.spaForm.time}\nPrice: €${treatment.price}`;
    
    const ticketData = {
      roomNumber: this.user?.roomNumber!,
      category: 'Spa',
      priority: 'Low' as 'Low',
      description: description,
      price: treatment.price,
      type: 'RoomService' as 'RoomService',
    };

    this.pendingTicketData.set(ticketData);
    this.paymentAmount.set(treatment.price);
    this.paymentDescription.set(`Spa Treatment: ${treatment.name}`);
    this.showPaymentModal.set(true);

    // Clear form
    this.spaForm = { treatmentId: '', date: '', time: '' };
  }

  onPaymentCompleted(result: { paymentMethod: 'Card' | 'PayPal' | 'Pay At Check-In'; transactionId?: string }): void {
    this.showPaymentModal.set(false);
    const ticketData = this.pendingTicketData();
    if (!ticketData) return;

    this.ticketError.set('');

    const completedTicket = {
      ...ticketData,
      paymentStatus: 'Paid' as 'Paid',
      paymentMethod: result.paymentMethod as 'Card' | 'PayPal',
      transactionId: result.transactionId
    };

    this.ticketService.createTicket(completedTicket).subscribe({
      next: (ticket) => {
        this.tickets.update((prev) => [ticket, ...prev]);
        this.ticketSuccess.set('Your order has been paid and confirmed! Check your requests below.');
        this.activeActionTab.set('none');
        this.pendingTicketData.set(null);
        setTimeout(() => this.ticketSuccess.set(''), 5000);
      },
      error: (err) => {
        this.ticketError.set(err.error?.message || 'Failed to submit request.');
        this.pendingTicketData.set(null);
      },
    });
  }

  onPaymentCancelled(): void {
    this.showPaymentModal.set(false);
    this.pendingTicketData.set(null);
  }

  submitDiningBooking(): void {
    if (!this.diningForm.date || !this.diningForm.time) {
      this.ticketError.set('Please select date and time.');
      return;
    }
    const description = `DINING RESERVATION:\nTable for: ${this.diningForm.guests} guests\nMeal: ${this.diningForm.slot}\nDate: ${this.diningForm.date}\nTime: ${this.diningForm.time}`;
    
    this.submitServiceRequest('General', description, 'Your table reservation has been submitted to our restaurant!', 'RoomService');
    this.diningForm = { guests: 2, slot: 'Dinner', date: '', time: '' };
  }

  logout(): void {
    this.auth.logout();
  }

  getPriorityClass(priority: string): string {
    return priority === 'URGENT' ? 'badge-urgent' : priority === 'High' ? 'badge-high' : 'badge-low';
  }

  getStatusClass(status: string): string {
    return status === 'Resolved' ? 'badge-confirmed' : status === 'In Progress' ? 'badge-active' : 'badge-pending';
  }

  updateProfile(): void {
    if (!this.profileForm.email.trim() || !this.profileForm.phoneNumber.trim()) {
      this.ticketError.set('Email and Phone Number are required.');
      return;
    }

    if (this.profileForm.password) {
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(this.profileForm.password)) {
        this.ticketError.set('New password must be at least 8 characters long, contain at least one uppercase letter and one number.');
        return;
      }
    }

    this.ticketError.set('');

    const data: any = {
      displayName: this.profileForm.displayName,
      email: this.profileForm.email,
      phoneNumber: this.profileForm.phoneNumber,
    };
    if (this.profileForm.password) {
      data.password = this.profileForm.password;
    }

    this.userService.updateUserProfile(data).subscribe({
      next: (updatedUser) => {
        const authUser = {
          id: updatedUser._id,
          username: updatedUser.username,
          displayName: updatedUser.displayName || '',
          role: updatedUser.role,
          roomNumber: updatedUser.roomNumber,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
        };
        this.auth.updateCurrentUser(authUser);
        this.user = authUser;
        this.ticketSuccess.set('Profile updated successfully.');
        this.activeActionTab.set('none');
        this.profileForm.password = '';
        setTimeout(() => this.ticketSuccess.set(''), 5000);
      },
      error: (err) => {
        this.ticketError.set(err.error?.message || 'Failed to update profile.');
      },
    });
  }
}
