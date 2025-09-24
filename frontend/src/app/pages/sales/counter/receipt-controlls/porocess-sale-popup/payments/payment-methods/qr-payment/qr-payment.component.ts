import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-qr-payment',
  standalone: true,
  templateUrl: './qr-payment.component.html',
  styleUrl: './qr-payment.component.scss'
})
export class QrPaymentComponent {
  @Output() paid = new EventEmitter<any>();

  confirm() {
    this.paid.emit({ method: 'qr' });
  }
}
