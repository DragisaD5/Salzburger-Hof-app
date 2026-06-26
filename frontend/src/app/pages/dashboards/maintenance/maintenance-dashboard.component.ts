import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TicketService, Ticket, TicketStats } from '../../../core/services/ticket.service';

@Component({
  selector: 'app-maintenance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './maintenance-dashboard.component.html',
  styleUrls: ['./maintenance-dashboard.component.scss'],
})
export class MaintenanceDashboardComponent implements OnInit {
  user: any;
  tickets = signal<Ticket[]>([]);
  stats = signal<TicketStats | null>(null);
  loading = signal(true);
  statusFilter = signal('');
  toast = signal('');
  toastType = signal<'success' | 'error'>('success');

  filteredTickets = computed(() => {
    const filter = this.statusFilter();
    if (!filter) return this.tickets();
    return this.tickets().filter((t) => t.status === filter);
  });

  urgentTickets = computed(() =>
    this.tickets().filter((t) => t.priority === 'URGENT' && t.status !== 'Resolved')
  );

  constructor(private auth: AuthService, private ticketService: TicketService) {
    this.user = auth.currentUser();
  }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.ticketService.getTickets({ type: 'Maintenance' }).subscribe({
      next: (t) => { this.tickets.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.ticketService.getStats({ type: 'Maintenance' }).subscribe({ next: (s) => this.stats.set(s) });
  }

  resolveTicket(ticket: Ticket): void {
    this.ticketService.deleteTicket(ticket._id).subscribe({
      next: () => {
        this.tickets.update((prev) => prev.filter((t) => t._id !== ticket._id));
        this.ticketService.getStats({ type: 'Maintenance' }).subscribe((s) => this.stats.set(s));
        this.showToast(`Ticket #${ticket.roomNumber} resolved and removed.`, 'success');
      },
      error: () => this.showToast('Failed to resolve ticket.', 'error'),
    });
  }

  getPriorityClass(priority: string): string {
    return priority === 'URGENT' ? 'badge-urgent' : priority === 'High' ? 'badge-high' : 'badge-low';
  }

  getStatusClass(status: string): string {
    return status === 'Resolved' ? 'badge-confirmed' : status === 'In Progress' ? 'badge-active' : 'badge-pending';
  }

  private showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toast.set(''), 4000);
  }

  logout(): void { this.auth.logout(); }
}
