import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-modal.component.html',
  styleUrls: ['./payment-modal.component.scss']
})
export class PaymentModalComponent implements OnInit {
  @Input() amount: number = 0;
  @Input() description: string = '';
  @Input() showPayLater: boolean = false;

  @Output() paymentCompleted = new EventEmitter<{
    paymentMethod: 'Card' | 'PayPal' | 'Pay At Check-In';
    transactionId?: string;
  }>();
  @Output() cancelled = new EventEmitter<void>();

  // Processing States
  isProcessing = signal(false);
  isSuccess = signal(false);
  
  // PayPal SDK Loading States
  paypalLoaded = signal(false);
  paypalInitError = signal(false);

  ngOnInit() {
    this.loadPayPalScript()
      .then(() => {
        this.paypalLoaded.set(true);
        // Ensure DOM container is ready before rendering
        setTimeout(() => this.initPayPalButtons(), 50);
      })
      .catch((err) => {
        console.error('Failed to load PayPal SDK', err);
        this.paypalInitError.set(true);
      });
  }

  loadPayPalScript(): Promise<void> {
    if ((window as any).paypal) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.paypal.com/sdk/js?client-id=sb&currency=EUR';
      script.id = 'paypal-sdk';
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  initPayPalButtons() {
    const paypal = (window as any).paypal;
    if (!paypal) {
      this.paypalInitError.set(true);
      return;
    }

    paypal.Buttons({
      createOrder: (data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            amount: {
              currency_code: 'EUR',
              value: this.amount.toFixed(2)
            },
            description: this.description || 'Hotel Salzburger-Hof Booking'
          }]
        });
      },
      onApprove: (data: any, actions: any) => {
        this.isProcessing.set(true);
        return actions.order.capture().then((details: any) => {
          this.isProcessing.set(false);
          this.isSuccess.set(true);
          
          // Emit after showing checkout success briefly
          setTimeout(() => {
            const txnId = details.id || 'TXN-' + Math.floor(100000 + Math.random() * 900000);
            this.paymentCompleted.emit({
              paymentMethod: 'PayPal',
              transactionId: txnId
            });
          }, 1800);
        }).catch((err: any) => {
          this.isProcessing.set(false);
          console.error('PayPal Order Capture Failed', err);
          alert('Failed to capture PayPal transaction. Please try again.');
        });
      },
      onError: (err: any) => {
        this.isProcessing.set(false);
        console.error('PayPal Smart Button error', err);
      }
    }).render('#paypal-button-container');
  }

  simulateSuccessPayment() {
    this.isProcessing.set(true);
    setTimeout(() => {
      this.isProcessing.set(false);
      this.isSuccess.set(true);
      setTimeout(() => {
        this.paymentCompleted.emit({
          paymentMethod: 'PayPal',
          transactionId: 'SIM-TXN-' + Math.floor(100000 + Math.random() * 900000)
        });
      }, 1000);
    }, 1000);
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
