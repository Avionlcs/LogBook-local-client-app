import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-receipt-controlls',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './receipt-controlls.component.html',
  styleUrl: './receipt-controlls.component.scss'
})
export class ReceiptControllsComponent {

  @Input() sale: any[] = [];
  @Output() onUpdateSale = new EventEmitter<any>();

  taxRate = 0; // Default tax rate in percent (can be made @Input if needed)

  constructor() { }

  get itemCount(): number {
    return this.sale.reduce((acc, item) => acc + (item.quantity || 0), 0);
  }

  get subtotal(): number {
    return this.sale.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 0)), 0);
  }

  get discount(): number {
    // Assuming optional per-item discount; if not present, total discount is 0
    // If discount logic is different (e.g., global percentage), adjust accordingly
    return this.sale.reduce((acc, item) => acc + (item.discount || 0), 0);
  }

  get taxAmount(): number {
    const taxable = this.subtotal - this.discount;
    return taxable * (this.taxRate / 100);
  }

  get total(): number {
    return (this.subtotal - this.discount) + this.taxAmount;
  }

  completeSale() {
    this.onUpdateSale.emit({ action: 'complete', sale: this.sale, total: this.total });
  }

  pauseSale() {
    this.onUpdateSale.emit({ action: 'pause', sale: this.sale });
  }

  cancelSale() {
    this.onUpdateSale.emit({ action: 'cancel', sale: this.sale });
  }

}