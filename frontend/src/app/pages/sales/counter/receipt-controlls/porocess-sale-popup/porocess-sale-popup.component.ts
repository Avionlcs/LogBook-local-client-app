import { Component, EventEmitter, Output } from '@angular/core';
import { PaymentsComponent } from './payments/payments.component';
import { ConfirmationComponent } from './confirmation/confirmation.component';
import { GenerateReceiptComponent } from './confirmation/generate-receipt/generate-receipt.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-porocess-sale-popup',
  standalone: true,
  imports: [CommonModule, PaymentsComponent, ConfirmationComponent, GenerateReceiptComponent],
  templateUrl: './porocess-sale-popup.component.html',
  styleUrl: './porocess-sale-popup.component.scss'
})
export class PorocessSalePopupComponent {
  @Output() close = new EventEmitter<void>();

  stage: 'payment' | 'confirmation' | 'receipt' = 'payment';
  sale: any;

  nextStage(data?: any) {
    if (this.stage === 'payment') {
      this.sale = data;
      this.stage = 'confirmation';
    } else if (this.stage === 'confirmation') {
      this.stage = 'receipt';
    } else {
      this.close.emit();
    }
  }

  back() {
    if (this.stage === 'confirmation') this.stage = 'payment';
    else if (this.stage === 'receipt') this.stage = 'confirmation';
  }

  closePopup() {
    this.close.emit();
  }
}
