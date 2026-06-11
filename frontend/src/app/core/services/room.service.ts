import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Room {
  _id: string;
  roomNumber: number;
  category: 'Standard' | 'Deluxe' | 'Suite' | 'Penthouse';
  floor: number;
  status: 'Free' | 'Occupied' | 'Cleaning' | 'Dirty';
  isVIP: boolean;
  pricePerNight: number;
  amenities: string[];
  notes?: string;
}

export interface RoomStats {
  total: number;
  free: number;
  occupied: number;
  cleaning: number;
  dirty: number;
  vip: number;
}

@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly base = `${environment.apiUrl}/rooms`;

  constructor(private http: HttpClient) {}

  getRooms(filters?: { status?: string; category?: string; floor?: number }): Observable<Room[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.floor) params = params.set('floor', String(filters.floor));
    return this.http.get<Room[]>(this.base, { params });
  }

  getRoom(id: string): Observable<Room> {
    return this.http.get<Room>(`${this.base}/${id}`);
  }

  getStats(): Observable<RoomStats> {
    return this.http.get<RoomStats>(`${this.base}/stats`);
  }

  createRoom(data: Partial<Room>): Observable<Room> {
    return this.http.post<Room>(this.base, data);
  }

  updateRoom(id: string, data: Partial<Room>): Observable<Room> {
    return this.http.put<Room>(`${this.base}/${id}`, data);
  }

  updateStatus(id: string, status: string, notes?: string): Observable<Room> {
    return this.http.patch<Room>(`${this.base}/${id}/status`, { status, notes });
  }

  deleteRoom(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
