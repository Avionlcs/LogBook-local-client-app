import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-cash-payment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './cash-payment.component.html',
  styleUrl: './cash-payment.component.scss'
})
export class CashPaymentComponent {
  @Output() paid = new EventEmitter<{ method: string; amount: number }>();
  amountReceived = 0;

  pay() {
    if (!this.amountReceived || this.amountReceived <= 0) return;
    this.paid.emit({ method: 'cash', amount: this.amountReceived });
    this.amountReceived = 0;
  }
}
