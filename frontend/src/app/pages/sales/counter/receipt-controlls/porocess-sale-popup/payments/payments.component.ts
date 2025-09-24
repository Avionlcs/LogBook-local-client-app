import { Component, EventEmitter, Output, HostListener } from '@angular/core';
import { CardPaymentComponent } from './card-payment/card-payment.component';
import { CashPaymentComponent } from './cash-payment/cash-payment.component';
import { QrPaymentComponent } from './qr-payment/qr-payment.component';
import { InventoryItemComponent } from '../../../../display/inventory-items-list/inventory-item/inventory-item.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, CardPaymentComponent, CashPaymentComponent, QrPaymentComponent],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsComponent {
  @Output() paymentCompleted = new EventEmitter<any>();

  // available options
  methods: Array<'cash' | 'card' | 'qr'> = ['cash', 'card', 'qr'];
  methodIndex = 0;
  method: 'cash' | 'card' | 'qr' = this.methods[this.methodIndex];

  handlePayment(result: any) {
    this.paymentCompleted.emit(result);
  }

  private selectMethod(index: number) {
    if (index < 0) {
      this.methodIndex = this.methods.length - 1;
    } else if (index >= this.methods.length) {
      this.methodIndex = 0;
    } else {
      this.methodIndex = index;
    }
    this.method = this.methods[this.methodIndex];
  }

  // 👇 Keyboard navigation
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      this.selectMethod(this.methodIndex + 1);
      event.preventDefault();
    }
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      this.selectMethod(this.methodIndex - 1);
      event.preventDefault();
    }
  }
}
