import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-card-payment',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './card-payment.component.html',
  styleUrls: ['./card-payment.component.scss']
})
export class CardPaymentComponent {
  @Output() paid = new EventEmitter<any>();

  amount: number | null = null;
  reference: string = '';
  cardType: 'visa' | 'mastercard' | 'amex' | null = null;

  setCardType(type: 'visa' | 'mastercard' | 'amex') {
    this.cardType = type;
  }

  pay() {
    if (!this.amount || !this.reference || !this.cardType) {
      return; // validation guard
    }

    this.paid.emit({
      method: 'card',
      amount: this.amount,
      reference: this.reference,
      cardType: this.cardType
    });
  }
}
