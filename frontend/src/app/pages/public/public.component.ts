import { Component, OnInit, AfterViewInit, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-public',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public.component.html',
  styleUrls: ['./public.component.scss'],
})
export class PublicComponent implements OnInit, AfterViewInit {
  // Booking widget
  bookingForm = {
    guestName: '',
    guestEmail: '',
    checkIn: '',
    checkOut: '',
    roomType: 'Deluxe',
    adults: 2,
    children: 0,
  };

  bookingSuccess = signal(false);
  bookingLoading = signal(false);
  bookingError = signal('');

  readonly roomTypes = ['Standard', 'Deluxe', 'Suite', 'Penthouse'];

  isScrolled = false;

  constructor(private router: Router, private bookingService: BookingService) {}

  @HostListener('window:scroll')
  onWindowScroll() {
    this.isScrolled = window.scrollY > 40;
  }

  ngOnInit(): void {
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    this.bookingForm.checkIn = today;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    this.bookingForm.checkOut = tomorrow.toISOString().split('T')[0];
  }

  ngAfterViewInit(): void {
    this.initScrollReveal();
    this.animateCounters();
  }

  private initScrollReveal(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }

  private animateCounters(): void {
    const counters = document.querySelectorAll<HTMLElement>('.stat-counter');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const target = parseInt(el.dataset['target'] || '0', 10);
            const duration = 1800;
            const steps = 60;
            const increment = target / steps;
            let current = 0;
            const timer = setInterval(() => {
              current += increment;
              if (current >= target) {
                el.textContent = target.toLocaleString();
                clearInterval(timer);
              } else {
                el.textContent = Math.floor(current).toLocaleString();
              }
            }, duration / steps);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((el) => observer.observe(el));
  }

  submitBooking(): void {
    if (!this.bookingForm.guestName || !this.bookingForm.guestEmail) {
      this.bookingError.set('Please fill in your name and email.');
      return;
    }
    this.bookingLoading.set(true);
    this.bookingError.set('');

    const checkIn = new Date(this.bookingForm.checkIn);
    const checkOut = new Date(this.bookingForm.checkOut);
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000));

    const prices: Record<string, number> = { Standard: 160, Deluxe: 280, Suite: 450, Penthouse: 850 };
    const total = nights * (prices[this.bookingForm.roomType] || 280);

    this.bookingService.createBooking({
      ...this.bookingForm,
      checkIn: this.bookingForm.checkIn,
      checkOut: this.bookingForm.checkOut,
      status: 'Pending',
      source: 'Online',
      totalPrice: total,
    }).subscribe({
      next: () => {
        this.bookingLoading.set(false);
        this.bookingSuccess.set(true);
      },
      error: (err) => {
        this.bookingLoading.set(false);
        this.bookingError.set(err.error?.message || 'Booking failed. Please try again.');
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  scrollToBooking(): void {
    document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth' });
  }
}
