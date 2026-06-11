import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TicketService, Ticket } from '../../../core/services/ticket.service';
import { RoomService, Room } from '../../../core/services/room.service';

@Component({
  selector: 'app-guest-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guest-dashboard.component.html',
  styleUrls: ['./guest-dashboard.component.scss'],
})
export class GuestDashboardComponent implements OnInit {
  user: any;
  tickets = signal<Ticket[]>([]);
  myRoom = signal<Room | null>(null);
  loading = signal(true);
  showTicketForm = signal(false);
  ticketSuccess = signal('');
  ticketError = signal('');

  newTicket = {
    category: 'General',
    priority: 'Low' as 'Low' | 'High' | 'URGENT',
    description: '',
  };

  readonly categories = ['General', 'Minibar', 'Plumbing', 'Electrical', 'Spa', 'Heating'];
  readonly priorities: Array<'Low' | 'High' | 'URGENT'> = ['Low', 'High', 'URGENT'];

  constructor(
    private auth: AuthService,
    private ticketService: TicketService,
    private roomService: RoomService
  ) {
    this.user = auth.currentUser();
  }

  ngOnInit(): void {
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

  submitTicket(): void {
    if (!this.newTicket.description.trim()) {
      this.ticketError.set('Please describe your request.');
      return;
    }
    this.ticketError.set('');
    this.ticketService.createTicket({
      roomNumber: this.user?.roomNumber!,
      category: this.newTicket.category as any,
      priority: this.newTicket.priority,
      description: this.newTicket.description,
    }).subscribe({
      next: (ticket) => {
        this.tickets.update((prev) => [ticket, ...prev]);
        this.ticketSuccess.set('Your request has been submitted. Our team will attend to it shortly.');
        this.showTicketForm.set(false);
        this.newTicket = { category: 'General', priority: 'Low', description: '' };
        setTimeout(() => this.ticketSuccess.set(''), 5000);
      },
      error: (err) => {
        this.ticketError.set(err.error?.message || 'Failed to submit request.');
      },
    });
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
}
