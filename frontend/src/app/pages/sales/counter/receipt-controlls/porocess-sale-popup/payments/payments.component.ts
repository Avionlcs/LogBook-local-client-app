import { Component, EventEmitter, Output } from '@angular/core';
import { CardPaymentComponent } from './card-payment/card-payment.component';
import { CashPaymentComponent } from './cash-payment/cash-payment.component';
import { QrPaymentComponent } from './qr-payment/qr-payment.component';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CardPaymentComponent, CashPaymentComponent, QrPaymentComponent],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsComponent {
  @Output() paymentCompleted = new EventEmitter<any>();

  method: 'cash' | 'card' | 'qr' = 'cash';

  handlePayment(result: any) {
    this.paymentCompleted.emit(result);
  }
}
