import {
  Component,
  EventEmitter,
  Output,
  HostListener,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CardPaymentComponent } from './payment-methods/card-payment/card-payment.component';
import { CashPaymentComponent } from './payment-methods/cash-payment/cash-payment.component';
import { QrPaymentComponent } from './payment-methods/qr-payment/qr-payment.component';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { PaymentsState } from './payments.state';
import { PaymentMethods } from './payments.methods';
import { PaymentsKeyboard } from './keyboard-shortcuts/payments.keyboard';

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

  state = new PaymentsState(() => this.sale?.total_amount);
  methods = new PaymentMethods();
  keyboard = new PaymentsKeyboard(this.state, this.methods);

  ngOnInit() {
    this.state.recalculate();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['sale']) {
      this.state.recalculate();
    }
  }

  get activeMethod() {
    return this.methods.active;
  }

  get remainingAmount() {
    return this.state.remainingAmount;
  }

  @HostListener('document:keydown', ['$event'])
  handleKey(e: KeyboardEvent) {
    if (this.keyboard.handle(e)) e.preventDefault();
  }

  confirmPayment() {
    if (this.state.remainingAmount <= 0) {
      this.paymentCompleted.emit(this.state);
    }
  }
}
