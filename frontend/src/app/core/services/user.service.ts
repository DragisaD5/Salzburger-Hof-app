import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StaffUser {
  _id: string;
  username: string;
  displayName: string;
  role: string;
  roomNumber?: number;
  lastLogin?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly base = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getMe(): Observable<StaffUser> {
    return this.http.get<StaffUser>(`${this.base}/me`);
  }

  getUsers(): Observable<StaffUser[]> {
    return this.http.get<StaffUser[]>(this.base);
  }

  createUser(data: Partial<StaffUser> & { password: string }): Observable<StaffUser> {
    return this.http.post<StaffUser>(this.base, data);
  }

  updateUser(id: string, data: Partial<StaffUser>): Observable<StaffUser> {
    return this.http.put<StaffUser>(`${this.base}/${id}`, data);
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
