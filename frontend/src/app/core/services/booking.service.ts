import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Booking {
  _id: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  roomNumber?: number;
  adults: number;
  children?: number;
  status: 'Pending' | 'Confirmed' | 'Active' | 'Cancelled' | 'Completed';
  totalPrice: number;
  specialRequests?: string;
  source: string;
  addons?: string[];
  paymentStatus?: 'Unpaid' | 'Paid' | 'Refunded' | 'Pending';
  paymentMethod?: 'Card' | 'PayPal' | 'Pay At Check-In';
  transactionId?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly base = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient) {}

  getBookings(filters?: { status?: string }): Observable<Booking[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<Booking[]>(this.base, { params });
  }

  getBooking(id: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.base}/${id}`);
  }

  createBooking(data: Partial<Booking>): Observable<Booking> {
    return this.http.post<Booking>(this.base, data);
  }

  checkoutBooking(bookingData: Partial<Booking>, paymentMethod: 'Card' | 'PayPal' | 'Pay At Check-In'): Observable<Booking> {
    return this.http.post<Booking>(`${this.base}/checkout`, { booking: bookingData, paymentMethod });
  }

  updateBooking(id: string, data: Partial<Booking>): Observable<Booking> {
    return this.http.put<Booking>(`${this.base}/${id}`, data);
  }

  updateStatus(id: string, status: string, roomNumber?: number): Observable<Booking> {
    return this.http.patch<Booking>(`${this.base}/${id}/status`, { status, roomNumber });
  }

  deleteBooking(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
