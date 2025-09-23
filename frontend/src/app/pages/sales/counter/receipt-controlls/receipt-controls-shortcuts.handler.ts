import { ReceiptControllsComponent } from './receipt-controlls.component';

export class ReceiptControlsShortcutsHandler {
  constructor(private cmp: ReceiptControllsComponent) {}

  handle(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      this.cmp.completeSale();
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.cmp.pauseSale();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cmp.cancelSale();
    }
  }
}
