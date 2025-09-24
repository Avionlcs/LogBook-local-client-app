import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Input() paid = 0;
  @Output() cashAmountUpdate = new EventEmitter<any>();

  update() {
    this.cashAmountUpdate.emit(this.paid);
  }
}
