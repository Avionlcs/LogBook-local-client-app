import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, SimpleChanges,
  ViewChildren, QueryList, ElementRef, AfterViewInit
} from '@angular/core';
import { Subscription } from 'rxjs';
import { KeyboardShortcutsHandler } from './keyboard-shortcuts/keyboard-shortcuts.handler';
import { KeyboardShortcutsService } from './keyboard-shortcuts/keyboard-shortcuts.service';
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
export class ReceiptItemsComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() items: any[] = [];
  @Input() saleId: string | undefined;
  @Output() onChangeItems = new EventEmitter<any>();

  selectedIndex = -1;
  isShiftPressing = true;

  private sub!: Subscription;
  private handler!: KeyboardShortcutsHandler;
  private qtyHandler!: UpdateItemQuantityHandler | null;

  // 👇 track rendered <app-receipt-item> elements
  @ViewChildren('receiptItemEl', { read: ElementRef })
  receiptItemEls!: QueryList<ElementRef>;

  constructor(
    private keyboard: KeyboardShortcutsService,
    private qtyService: UpdateItemQuantityService
  ) {
    this.qtyHandler = null;
  }

  ngOnInit() {
    this.handler = new KeyboardShortcutsHandler(
      () => this.items,
      (items) => this.onChangeItems.emit(items),
      () => this.selectedIndex,
      (i) => {
        this.selectedIndex = i;
        this.scrollToSelected();  // 👈 auto-scroll whenever selection changes
      },
      () => this.removeSelected(),
      (key, buffer) => this.adjustQuantity(key, buffer),
      (qty) => this.setQuantity(qty),
      (state) => this.isShiftPressing = state
    );

    this.sub = this.keyboard.events$.subscribe((e: any) => {
      this.handler.handle(e);
    });
  }

  ngAfterViewInit() {
    this.selectedIndex = this.items.length - 1;;
    // scroll once when view ready
    this.scrollToSelected();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['saleId'] && this.saleId) {
      this.initQtyHandler();
    }

    if (changes['items']) {
      const prev = changes['items'].previousValue as any[] | null;
      const curr = changes['items'].currentValue as any[] | null;

      if (curr && (!prev || curr.length !== prev.length)) {
        // length changed → new item added or removed
        this.selectedIndex = curr.length - 1;
        this.scrollToSelected();  // auto-scroll to last item
      }
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
    this.scrollToSelected();
  }

  private adjustQuantity(key: string, buffer?: string) {
    if (this.selectedIndex === -1 || !this.qtyHandler) return;

    const item = this.items[this.selectedIndex];
    const delta = buffer ? parseInt(buffer, 10) : 1;

    if (key === '+') {
      this.qtyHandler.inc(item.item_id, delta).subscribe();
    } else if (key === '-') {
      this.qtyHandler.dec(item.item_id, delta).subscribe();
    }
  }

  private setQuantity(qty: number) {
    if (this.selectedIndex === -1 || !this.qtyHandler) return;

    const item = this.items[this.selectedIndex];
    this.qtyHandler.setQty(item.item_id, qty).subscribe(res => {
      console.log('Server response (SET QTY):', res);
    });
  }

  private scrollToSelected() {
    if (this.selectedIndex === -1) return;
    const el = this.receiptItemEls.get(this.selectedIndex)?.nativeElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  isSelected(i: number) {
    return this.selectedIndex === i;
  }
}
