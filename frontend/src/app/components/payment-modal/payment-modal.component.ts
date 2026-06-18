import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-modal.component.html',
  styleUrls: ['./payment-modal.component.scss']
})
export class PaymentModalComponent {
  @Input() amount: number = 0;
  @Input() description: string = '';
  @Input() showPayLater: boolean = false;

  @Output() paymentCompleted = new EventEmitter<{
    paymentMethod: 'Card' | 'PayPal' | 'Pay At Check-In';
    transactionId?: string;
  }>();
  @Output() cancelled = new EventEmitter<void>();

  activeTab = signal<'card' | 'paypal'>('card');
  
  // Card Form State
  cardholderName = '';
  cardNumber = '';
  expiry = '';
  cvv = '';
  cardErrors = signal<string[]>([]);

  // Processing States
  isProcessing = signal(false);
  isSuccess = signal(false);
  
  // PayPal State
  paypalStage = signal<'none' | 'login' | 'authorizing' | 'success'>('none');
  paypalEmail = '';
  paypalPassword = '';

  selectTab(tab: 'card' | 'paypal') {
    if (this.isProcessing() || this.isSuccess()) return;
    this.activeTab.set(tab);
    this.cardErrors.set([]);
  }

  // Format Card Number (space every 4 digits)
  onCardNumberInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 16) value = value.substring(0, 16);
    this.cardNumber = value.replace(/(.{4})/g, '$1 ').trim();
  }

  // Format Expiry (MM/YY)
  onExpiryInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substring(0, 4);
    if (value.length >= 2) {
      this.expiry = value.substring(0, 2) + '/' + value.substring(2);
    } else {
      this.expiry = value;
    }
  }

  // Format CVV
  onCvvInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 3) value = value.substring(0, 3);
    this.cvv = value;
  }

  validateCard(): boolean {
    const errors: string[] = [];
    if (!this.cardholderName.trim()) {
      errors.push('Cardholder Name is required.');
    }
    const rawCard = this.cardNumber.replace(/\s/g, '');
    if (rawCard.length !== 16) {
      errors.push('Card number must be 16 digits.');
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(this.expiry)) {
      errors.push('Expiry must be in MM/YY format.');
    } else {
      // Basic check for past date
      const parts = this.expiry.split('/');
      const month = parseInt(parts[0], 10);
      const year = parseInt('20' + parts[1], 10);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errors.push('Card has expired.');
      }
    }
    if (this.cvv.length !== 3) {
      errors.push('CVV must be 3 digits.');
    }

    this.cardErrors.set(errors);
    return errors.length === 0;
  }

  payWithCard() {
    if (!this.validateCard()) return;
    this.isProcessing.set(true);

    // Simulate bank communication
    setTimeout(() => {
      this.isProcessing.set(false);
      this.isSuccess.set(true);

      // Finish transaction after showing luxury success state briefly
      setTimeout(() => {
        const txnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
        this.paymentCompleted.emit({
          paymentMethod: 'Card',
          transactionId: txnId
        });
      }, 1800);
    }, 2200);
  }

  openPayPalSimulator() {
    if (this.isProcessing() || this.isSuccess()) return;
    this.paypalStage.set('login');
    this.paypalEmail = '';
    this.paypalPassword = '';
  }

  submitPayPalLogin() {
    if (!this.paypalEmail || !this.paypalPassword) return;
    this.paypalStage.set('authorizing');
    
    // Simulate transaction authorization
    setTimeout(() => {
      this.paypalStage.set('success');
      
      setTimeout(() => {
        this.paypalStage.set('none');
        this.isSuccess.set(true);

        setTimeout(() => {
          const txnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
          this.paymentCompleted.emit({
            paymentMethod: 'PayPal',
            transactionId: txnId
          });
        }, 1500);
      }, 1500);
    }, 2000);
  }

  closePayPalSimulator() {
    if (this.paypalStage() === 'authorizing' || this.paypalStage() === 'success') return;
    this.paypalStage.set('none');
  }

  payLater() {
    if (this.isProcessing() || this.isSuccess()) return;
    this.paymentCompleted.emit({
      paymentMethod: 'Pay At Check-In'
    });
  }

  closeModal() {
    if (this.isProcessing() || this.isSuccess()) return;
    this.cancelled.emit();
  }
}
