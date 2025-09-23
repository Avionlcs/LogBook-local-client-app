import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { ReceiptControllsService } from './receipt-controlls.service';
import { ReceiptControlsShortcutsHandler } from './receipt-controls-shortcuts.handler';
import { PorocessSalePopupComponent } from './porocess-sale-popup/porocess-sale-popup.component';

@Component({
  selector: 'app-receipt-controlls',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, PorocessSalePopupComponent],
  templateUrl: './receipt-controlls.component.html',
  styleUrl: './receipt-controlls.component.scss'
})
export class ReceiptControllsComponent implements OnChanges {
  @Input() sale: any = { items: [] };
  @Output() onUpdateSale = new EventEmitter<any>();

    showPopup = false;
  private shortcutHandler: ReceiptControlsShortcutsHandler;

  constructor(private service: ReceiptControllsService) {
    this.shortcutHandler = new ReceiptControlsShortcutsHandler(this);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['sale']) {
      // console.log('Sale changed:', this.sale);
    }
  }

  get itemCount(): number {
    return this.service.getItemCount(this.sale);
  }

  get subtotal(): number {
    return this.service.getSubtotal(this.sale);
  }

  get discount(): number {
    return this.service.getDiscount(this.sale);
  }

  get total(): number {
    return this.service.getTotal(this.sale);
  }

  completeSale() {
    this.showPopup = true;
    //this.onUpdateSale.emit({ action: 'complete', sale: this.sale, total: this.total });
  }

   closePopup() {
    this.showPopup = false;
  }

  pauseSale() {
    this.onUpdateSale.emit({ action: 'pause', sale: this.sale });
  }

  cancelSale() {
    this.onUpdateSale.emit({ action: 'cancel', sale: this.sale });
  }


  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.shortcutHandler.handle(event);
  }
}
