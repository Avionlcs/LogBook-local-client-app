import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { ReceiptControllsService } from './receipt-controlls.service';
import { ReceiptControlsShortcutsHandler } from './receipt-controls-shortcuts.handler';

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
    this.onUpdateSale.emit({ action: 'complete', sale: this.sale, total: this.total });
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
