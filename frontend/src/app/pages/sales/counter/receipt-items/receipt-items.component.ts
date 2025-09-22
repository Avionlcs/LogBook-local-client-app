import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { KeyboardShortcutsHandler } from './keyboard-shortcuts/keyboard-shortcuts.handler';
import { KeyboardShortcutsService, ShortcutEvent } from './keyboard-shortcuts/keyboard-shortcuts.service';
import { ReceiptItemComponent } from './receipt-item/receipt-item.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-receipt-items',
  standalone: true,
  imports: [CommonModule, ReceiptItemComponent],
  templateUrl: './receipt-items.component.html',
  styleUrl: './receipt-items.component.scss'
})
export class ReceiptItemsComponent implements OnInit, OnDestroy {
  @Input() items: any[] = [];
  @Output() onChangeItems = new EventEmitter<any>();

  selectedIndex = -1;
  isShiftPressing = false;
  private sub!: Subscription;
  private handler!: KeyboardShortcutsHandler;

  constructor(private keyboard: KeyboardShortcutsService) { }

  ngOnInit() {
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

  ngOnDestroy() {
    this.sub.unsubscribe();
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
    if (this.selectedIndex === -1) return;
    const delta = buffer ? parseInt(buffer, 10) : 1;
    const item = this.items[this.selectedIndex];
    
    if (key === '+') item.quantity += delta;
    if (key === '-') item.quantity = Math.max(1, item.quantity - delta);

    this.onChangeItems.emit(this.items);
  }

  private setQuantity(qty: number) {
    if (this.selectedIndex === -1) return;
    this.items[this.selectedIndex].quantity = qty;
    this.onChangeItems.emit(this.items);
  }

  isSelected(i: number) {
    return this.selectedIndex === i;
  }
}
