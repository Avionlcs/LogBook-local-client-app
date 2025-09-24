import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cash-payment',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './cash-payment.component.html',
  styleUrl: './cash-payment.component.scss'
})
export class CashPaymentComponent {
  @Output() paid = new EventEmitter<any>();
  amountReceived = 0;

  pay() {
    this.paid.emit({ method: 'cash', amount: this.amountReceived });
  }
}
