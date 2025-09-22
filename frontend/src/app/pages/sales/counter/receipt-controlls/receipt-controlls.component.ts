import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-receipt-controlls',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './receipt-controlls.component.html',
  styleUrl: './receipt-controlls.component.scss'
})
export class ReceiptControllsComponent implements OnChanges {

  @Input() sale: any = { items: [] };
  @Output() onUpdateSale = new EventEmitter<any>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['sale']) {
      console.log('Sale changed:', this.sale);
    }
  }

  get itemCount(): number {
    return this.sale?.items?.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);
  }

  get subtotal(): number {
    // Prefer backend field, fallback to sum
    return parseFloat(this.sale?.total_amount) || 
           this.sale?.items?.reduce((acc: number, item: any) => acc + (item.total_price || 0), 0) || 0;
  }

  get discount(): number {
    // Use backend-provided discount if available
    return parseFloat(this.sale?.total_offer_discount) || 0;
  }

  get total(): number {
    return this.subtotal - this.discount;
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
