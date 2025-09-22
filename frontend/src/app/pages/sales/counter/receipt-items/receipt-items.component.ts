import { 
  Component, Input, Output, EventEmitter, 
  OnInit, OnDestroy, OnChanges, SimpleChanges 
} from '@angular/core';
import { Subscription } from 'rxjs';
import { KeyboardShortcutsHandler } from './keyboard-shortcuts/keyboard-shortcuts.handler';
import { KeyboardShortcutsService, ShortcutEvent } from './keyboard-shortcuts/keyboard-shortcuts.service';
import { ReceiptItemComponent } from './receipt-item/receipt-item.component';
import { CommonModule } from '@angular/common';
import { UpdateItemQuantityHandler } from './update-item-quantity/update-item-quantity.handler';
import { UpdateItemQuantityService } from './update-item-quantity/update-item-quantity.service';

@Component({
  selector: 'app-receipt-items',
  standalone: true,
  imports: [CommonModule, ReceiptItemComponent],
  templateUrl: './receipt-items.component.html',
  styleUrl: './receipt-items.component.scss'
})
export class ReceiptItemsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() items: any[] = [];
  @Input() saleId: string | undefined;   // 👈 allow undefined until parent sets it
  @Output() onChangeItems = new EventEmitter<any>();

  selectedIndex = -1;
  isShiftPressing = false;

  private sub!: Subscription;
  private handler!: KeyboardShortcutsHandler;
  private qtyHandler!: UpdateItemQuantityHandler | null;

  constructor(
    private keyboard: KeyboardShortcutsService,
    private qtyService: UpdateItemQuantityService
  ) {
    this.qtyHandler = null;
  }

  ngOnInit() {
    // keyboard handler is independent of saleId
    this.handler = new KeyboardShortcutsHandler(
      () => this.items,
      (items) => this.onChangeItems.emit(items),
      () => this.selectedIndex,
      (i) => this.selectedIndex = i,
      () => this.removeSelected(),
      (key, buffer) => this.adjustQuantity(key, buffer),
      (qty) => this.setQuantity(qty),
      (state) => this.isShiftPressing = state
    );

    this.sub = this.keyboard.events$.subscribe((e: ShortcutEvent) => {
      this.handler.handle(e);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['saleId'] && this.saleId) {
      // saleId became available or changed
      console.log('SaleId ready:', this.saleId, '^&&&T#%$##$TGRGREEGG');
      this.initQtyHandler();
    }
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  private initQtyHandler() {
    this.qtyHandler = new UpdateItemQuantityHandler(this.qtyService, {
      saleId: this.saleId,
      getItemById: (id) => this.items.find(i => i.id === id),
      onPatched: (res) => {
        if (res.success && res.item) {
          const idx = this.items.findIndex(i => i.id === res.item.item_id);
          if (idx >= 0) this.items[idx] = { ...this.items[idx], ...res.item };
          this.onChangeItems.emit(this.items);
        }
      },
      onError: (err) => console.error('Update qty failed:', err)
    });
  }

  private removeSelected() {
    if (this.selectedIndex === -1) return;
    this.items.splice(this.selectedIndex, 1);
    this.onChangeItems.emit(this.items);

    if (this.selectedIndex >= this.items.length) {
      this.selectedIndex = this.items.length - 1;
    }
  }

  private adjustQuantity(key: string, buffer?: string) {
    if (this.selectedIndex === -1 || !this.qtyHandler) return;

    const item = this.items[this.selectedIndex];
    const delta = buffer ? parseInt(buffer, 10) : 1;

    if (key === '+') {
      this.qtyHandler.inc(item.item_id, delta).subscribe(res => {
        console.log('Server response (INC):', res);
      });
    } else if (key === '-') {
      this.qtyHandler.dec(item.item_id, delta).subscribe(res => {
        console.log('Server response (DEC):', res);
      });
    }
  }

  private setQuantity(qty: number) {
    console.log('setQuantity', qty);
    
    if (this.selectedIndex === -1 || !this.qtyHandler) return;

    const item = this.items[this.selectedIndex];
    this.qtyHandler.setQty(item.item_id, qty).subscribe(res => {
      console.log('Server response (SET QTY):', res);
    });
  }

  isSelected(i: number) {
    return this.selectedIndex === i;
  }
}
