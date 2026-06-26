import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RoomService, Room } from '../../../core/services/room.service';

interface ChecklistItem {
  label: string;
  checked: boolean;
}

interface CleaningSession {
  room: Room;
  checklist: ChecklistItem[];
  notes: string;
}

@Component({
  selector: 'app-housekeeping-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './housekeeping-dashboard.component.html',
  styleUrls: ['./housekeeping-dashboard.component.scss'],
})
export class HousekeepingDashboardComponent implements OnInit {
  user: any;
  today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  rooms = signal<Room[]>([]);
  loading = signal(true);
  activeSession = signal<CleaningSession | null>(null);
  toast = signal('');
  toastType = signal<'success' | 'error'>('success');

  readonly CHECKLIST_TEMPLATE: ChecklistItem[] = [
    { label: 'Strip and replace bed linens', checked: false },
    { label: 'Replace all towels and bathrobes', checked: false },
    { label: 'Clean and sanitize bathroom', checked: false },
    { label: 'Restock minibar', checked: false },
    { label: 'Restock toiletries & amenities', checked: false },
    { label: 'Vacuum all floors', checked: false },
    { label: 'Dust all surfaces', checked: false },
    { label: 'Check & replace light bulbs', checked: false },
    { label: 'Empty trash bins', checked: false },
    { label: 'Final inspection & sign-off', checked: false },
  ];

  get dirtyAndCleaningRooms(): Room[] {
    return this.rooms().filter((r) => r.status === 'Dirty' || r.status === 'Cleaning');
  }

  get cleanRooms(): Room[] {
    return this.rooms().filter((r) => r.status === 'Free');
  }

  get cleaningCount(): number {
    return this.rooms().filter((r) => r.status === 'Cleaning').length;
  }

  get dirtyCount(): number {
    return this.rooms().filter((r) => r.status === 'Dirty').length;
  }

  constructor(private auth: AuthService, private roomService: RoomService) {
    this.user = auth.currentUser();
  }

  ngOnInit(): void {
    this.loadRooms();
  }

  loadRooms(): void {
    this.roomService.getRooms().subscribe({
      next: (r) => { this.rooms.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  startCleaning(room: Room): void {
    const saved = localStorage.getItem(`hk_session_${room._id}`);
    let savedSession: { checklist: ChecklistItem[]; notes: string } | null = null;
    if (saved) {
      try {
        savedSession = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved housekeeping session', e);
      }
    }

    if (room.status === 'Cleaning') {
      // Room is already in Cleaning status, just open the session
      this.activeSession.set({
        room,
        checklist: savedSession?.checklist ?? this.CHECKLIST_TEMPLATE.map((i) => ({ ...i })),
        notes: savedSession?.notes ?? '',
      });
    } else {
      // Set room to Cleaning status
      this.roomService.updateStatus(room._id, 'Cleaning').subscribe({
        next: (updated) => {
          this.rooms.update((prev) => prev.map((r) => r._id === updated._id ? updated : r));
          this.activeSession.set({
            room: updated,
            checklist: savedSession?.checklist ?? this.CHECKLIST_TEMPLATE.map((i) => ({ ...i })),
            notes: savedSession?.notes ?? '',
          });
        },
        error: () => this.showToast('Failed to start cleaning session.', 'error'),
      });
    }
  }

  saveSessionProgress(): void {
    const session = this.activeSession();
    if (!session) return;
    localStorage.setItem(`hk_session_${session.room._id}`, JSON.stringify({
      checklist: session.checklist,
      notes: session.notes,
    }));
  }

  toggleChecklistItem(index: number): void {
    const session = this.activeSession();
    if (!session) return;
    const updatedChecklist = session.checklist.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    );
    this.activeSession.set({ ...session, checklist: updatedChecklist });
    this.saveSessionProgress();
  }

  checkAllItems(): void {
    const session = this.activeSession();
    if (!session) return;
    const updatedChecklist = session.checklist.map((item) => ({ ...item, checked: true }));
    this.activeSession.set({ ...session, checklist: updatedChecklist });
    this.saveSessionProgress();
  }

  quickCleanRoom(room: Room): void {
    this.roomService.updateStatus(room._id, 'Free', 'Cleaned (Quick Sign-off)').subscribe({
      next: (updated) => {
        this.rooms.update((prev) => prev.map((r) => r._id === updated._id ? updated : r));
        localStorage.removeItem(`hk_session_${room._id}`);
        this.showToast(`Room ${updated.roomNumber} marked as FREE. Excellent work!`, 'success');
      },
      error: () => this.showToast('Failed to complete cleaning.', 'error'),
    });
  }

  getCleaningProgress(room: Room): number {
    const saved = localStorage.getItem(`hk_session_${room._id}`);
    if (!saved) return 0;
    try {
      const parsed = JSON.parse(saved);
      return parsed?.checklist?.filter((i: any) => i.checked).length ?? 0;
    } catch (e) {
      return 0;
    }
  }

  get allChecked(): boolean {
    return this.activeSession()?.checklist.every((i) => i.checked) ?? false;
  }

  get checkedCount(): number {
    return this.activeSession()?.checklist.filter((i) => i.checked).length ?? 0;
  }

  completeCleaning(): void {
    const session = this.activeSession();
    if (!session) return;

    this.roomService.updateStatus(session.room._id, 'Free', session.notes || 'Cleaned and ready').subscribe({
      next: (updated) => {
        this.rooms.update((prev) => prev.map((r) => r._id === updated._id ? updated : r));
        localStorage.removeItem(`hk_session_${session.room._id}`);
        this.activeSession.set(null);
        this.showToast(`Room ${updated.roomNumber} marked as FREE. Excellent work!`, 'success');
      },
      error: () => this.showToast('Failed to complete cleaning.', 'error'),
    });
  }

  cancelSession(): void {
    this.saveSessionProgress();
    this.activeSession.set(null);
  }

  private showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toast.set(''), 4000);
  }

  logout(): void { this.auth.logout(); }

  getFloor(roomNumber: number): number {
    return Math.floor(roomNumber / 100);
  }
}
