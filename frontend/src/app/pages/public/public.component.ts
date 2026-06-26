import { Component, OnInit, AfterViewInit, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { WeatherService } from '../../core/services/weather.service';
import { AuthService } from '../../core/services/auth.service';
import { PaymentModalComponent } from '../../components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-public',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentModalComponent],
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

  // Payment Modal State
  showPaymentModal = signal(false);
  pendingBookingData = signal<any>(null);
  bookingNights = signal(0);
  bookingTotal = signal(0);

  readonly roomTypes = ['Standard', 'Deluxe', 'Suite', 'Penthouse'];

  isScrolled = false;
  weatherInfo = signal<{ temperature: number; text: string; icon: string } | null>(null);

  selectedAddons = {
    spa: false,
    ski: false,
    dining: false,
  };
  showAddonsDropdown = signal(false);

  toggleAddonsDropdown(): void {
    this.showAddonsDropdown.set(!this.showAddonsDropdown());
  }

  getAddonsList(): string[] {
    const list: string[] = [];
    if (this.selectedAddons.spa) list.push('Spa Access');
    if (this.selectedAddons.ski) list.push('Ski Pass');
    if (this.selectedAddons.dining) list.push('Fine Dining');
    return list;
  }

  calculateTotalPrice(): number {
    const checkIn = new Date(this.bookingForm.checkIn);
    const checkOut = new Date(this.bookingForm.checkOut);
    let nights = 0;
    if (checkIn && checkOut && checkOut.getTime() > checkIn.getTime()) {
      nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);
    }
    nights = Math.max(1, nights);

    const prices: Record<string, number> = { Standard: 160, Deluxe: 280, Suite: 450, Penthouse: 850 };
    const roomRate = prices[this.bookingForm.roomType] || 280;
    let total = roomRate * nights;

    if (this.selectedAddons.spa) total += 120;
    if (this.selectedAddons.ski) total += 150;
    if (this.selectedAddons.dining) total += 80;

    return total;
  }

  calculateNights(): number {
    const checkIn = new Date(this.bookingForm.checkIn);
    const checkOut = new Date(this.bookingForm.checkOut);
    if (checkIn && checkOut && checkOut.getTime() > checkIn.getTime()) {
      return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000));
    }
    return 1;
  }

  getBasePrice(): number {
    const prices: Record<string, number> = { Standard: 160, Deluxe: 280, Suite: 450, Penthouse: 850 };
    return (prices[this.bookingForm.roomType] || 280) * this.calculateNights();
  }

  constructor(
    private router: Router,
    private bookingService: BookingService,
    private weatherService: WeatherService,
    private authService: AuthService
  ) {}

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

    // Load weather data
    this.weatherService.getWeather().subscribe({
      next: (data) => {
        const desc = this.weatherService.getWeatherDescription(data.current_weather.weathercode);
        this.weatherInfo.set({
          temperature: Math.round(data.current_weather.temperature),
          text: desc.text,
          icon: desc.icon,
        });
      },
      error: (err) => console.error('Failed to load Alpine weather info:', err),
    });
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
    if (!this.authService.isLoggedIn()) {
      this.bookingError.set('You must log in to complete your reservation');
      alert('You must log in to complete your reservation');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.bookingForm.guestName || !this.bookingForm.guestEmail) {
      this.bookingError.set('Please fill in your name and email.');
      return;
    }
    this.bookingError.set('');

    const nights = this.calculateNights();
    const total = this.calculateTotalPrice();

    const bookingData = {
      ...this.bookingForm,
      checkIn: this.bookingForm.checkIn,
      checkOut: this.bookingForm.checkOut,
      status: 'Pending' as 'Pending',
      source: 'Online',
      totalPrice: total,
      addons: this.getAddonsList(),
    };

    this.pendingBookingData.set(bookingData);
    this.bookingNights.set(nights);
    this.bookingTotal.set(total);
    this.showPaymentModal.set(true);
  }

  bookPackage(addon: 'spa' | 'ski' | 'dining'): void {
    if (!this.authService.isLoggedIn()) {
      this.bookingError.set('You must log in to complete your reservation');
      alert('You must log in to complete your reservation');
      this.router.navigate(['/login']);
      return;
    }
    this.selectedAddons[addon] = true;
    this.scrollToBooking();
  }

  onPaymentCompleted(result: { paymentMethod: 'Card' | 'PayPal' | 'Pay At Check-In'; transactionId?: string }): void {
    this.showPaymentModal.set(false);
    this.bookingLoading.set(true);

    const bookingData = this.pendingBookingData();
    if (!bookingData) return;

    this.bookingService.checkoutBooking(bookingData, result.paymentMethod, result.transactionId).subscribe({
      next: () => {
        this.bookingLoading.set(false);
        this.bookingSuccess.set(true);
        this.pendingBookingData.set(null);
        this.selectedAddons = { spa: false, ski: false, dining: false };
      },
      error: (err) => {
        this.bookingLoading.set(false);
        this.bookingError.set(err.error?.message || 'Booking checkout failed. Please try again.');
        this.pendingBookingData.set(null);
      },
    });
  }

  onPaymentCancelled(): void {
    this.showPaymentModal.set(false);
    this.pendingBookingData.set(null);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  scrollToBooking(): void {
    document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth' });
  }
}
