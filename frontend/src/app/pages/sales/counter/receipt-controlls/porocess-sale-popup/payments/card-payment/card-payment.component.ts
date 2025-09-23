import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-card-payment',
  standalone: true,
  templateUrl: './card-payment.component.html',
  styleUrl: './card-payment.component.scss'
})
export class CardPaymentComponent {
  @Output() paid = new EventEmitter<any>();

  pay() {
    this.paid.emit({ method: 'card' });
  }
}
