import { Component, EventEmitter, Output, HostListener, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CardPaymentComponent } from './card-payment/card-payment.component';
import { CashPaymentComponent } from './cash-payment/cash-payment.component';
import { QrPaymentComponent } from './qr-payment/qr-payment.component';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule,
    CardPaymentComponent,
    CashPaymentComponent,
    QrPaymentComponent,
    MatButtonModule
  ],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsComponent implements OnInit, OnChanges {
  @Input() sale: any = {};
  @Output() paymentCompleted = new EventEmitter<any>();

  cashPaid = 0;
  cardPaid = 0;
  qrPaid = 0;
  totalPaid = 0;
  remainingAmount = 0;

  paymentMethods: Array<'cash' | 'card' | 'qr'> = ['cash', 'card', 'qr'];
  activeMethodIndex = 0;
  activeMethod: 'cash' | 'card' | 'qr' = this.paymentMethods[this.activeMethodIndex];

  ngOnInit() {
    this.recalculateTotals();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['sale'] && this.sale?.total_amount != null) {
      this.recalculateTotals();
    }
  }

  // 🔑 Child events
  cashAmountUpdate(amount: any) {
    this.cashPaid = amount;
    this.recalculateTotals();
  }

  cardAmountUpdate(event: { amount: number }) {
    this.cardPaid = event.amount;
    this.recalculateTotals();
  }

  qrAmountUpdate(event: { amount: number }) {
    this.qrPaid = event.amount;
    this.recalculateTotals();
  }

  private recalculateTotals() {
    this.totalPaid = this.cashPaid + this.cardPaid + this.qrPaid;
    this.remainingAmount = (this.sale?.total_amount || 0) - this.totalPaid;
  }

  private changeMethod(index: number) {
    if (index < 0) {
      this.activeMethodIndex = this.paymentMethods.length - 1;
    } else if (index >= this.paymentMethods.length) {
      this.activeMethodIndex = 0;
    } else {
      this.activeMethodIndex = index;
    }
    this.activeMethod = this.paymentMethods[this.activeMethodIndex];
  }

  // 👇 Keyboard navigation (A/D or arrows)
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      this.changeMethod(this.activeMethodIndex + 1);
      event.preventDefault();
    }
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      this.changeMethod(this.activeMethodIndex - 1);
      event.preventDefault();
    }
  }

  confirmPayment() {
    if (this.remainingAmount <= 0) {
      this.paymentCompleted.emit({
        cash: this.cashPaid,
        card: this.cardPaid,
        qr: this.qrPaid,
        totalPaid: this.totalPaid,
        remaining: this.remainingAmount
      });
    }
  }
}
