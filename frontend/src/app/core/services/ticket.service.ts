import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Ticket {
  _id: string;
  roomNumber: number;
  category: string;
  type?: 'Maintenance' | 'RoomService';
  priority: 'Low' | 'High' | 'URGENT';
  status: 'Open' | 'In Progress' | 'Resolved';
  description: string;
  reportedBy?: string;
  notes?: string;
  resolvedAt?: string;
  paymentStatus?: 'Unpaid' | 'Paid' | 'Pending';
  paymentMethod?: 'Card' | 'PayPal' | 'Room Charge';
  transactionId?: string;
  price?: number;
  createdAt: string;
}

export interface TicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  urgent: number;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly base = `${environment.apiUrl}/tickets`;

  constructor(private http: HttpClient) {}

  getTickets(filters?: { status?: string; priority?: string; roomNumber?: number; type?: string }): Observable<Ticket[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.priority) params = params.set('priority', filters.priority);
    if (filters?.roomNumber) params = params.set('roomNumber', String(filters.roomNumber));
    if (filters?.type) params = params.set('type', filters.type);
    return this.http.get<Ticket[]>(this.base, { params });
  }

  getStats(filters?: { type?: string }): Observable<TicketStats> {
    let params = new HttpParams();
    if (filters?.type) params = params.set('type', filters.type);
    return this.http.get<TicketStats>(`${this.base}/stats`, { params });
  }

  createTicket(data: Partial<Ticket>): Observable<Ticket> {
    return this.http.post<Ticket>(this.base, data);
  }

  updateTicket(id: string, data: Partial<Ticket>): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.base}/${id}`, data);
  }

  resolveTicket(id: string, notes?: string): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.base}/${id}/resolve`, { notes });
  }

  deleteTicket(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
