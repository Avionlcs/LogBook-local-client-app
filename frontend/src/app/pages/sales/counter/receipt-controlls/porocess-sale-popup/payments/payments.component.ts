import { Component, EventEmitter, Output, HostListener, Input } from '@angular/core';
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
export class PaymentsComponent {

  @Input() sale: any = {};
  @Output() paymentCompleted = new EventEmitter<any>();
  amountReceived : any = { cash: 0, card: 0, qr: 0, remaining: 0, total: 0, paid: 0 };
  // available options
  methods: Array<'cash' | 'card' | 'qr'> = ['cash', 'card', 'qr'];
  methodIndex = 0;
  method: 'cash' | 'card' | 'qr' = this.methods[this.methodIndex];

  handlePayment(result: any) {
    var method = result.method;
    var state = result.state;
    var ammount = result.amount;

    if (state == 'completed') {
    this.paymentCompleted.emit(this.amountReceived);
    } else if (state == 'updateing') {
      this.amountReceived[method] = ammount;
      this.amountReceived.paid = this.amountReceived.cash + this.amountReceived.card + this.amountReceived.qr;
      this.amountReceived.remaining  = this.amountReceived.total - this.amountReceived.paid
    } 
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


  pay() {

  }
}
