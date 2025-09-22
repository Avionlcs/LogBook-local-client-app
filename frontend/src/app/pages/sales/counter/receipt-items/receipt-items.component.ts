import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ReceiptItemComponent } from './receipt-item/receipt-item.component';

@Component({
  selector: 'app-receipt-items',
  standalone: true,
  imports: [CommonModule, ReceiptItemComponent],
  templateUrl: './receipt-items.component.html',
  styleUrl: './receipt-items.component.scss'
})
export class ReceiptItemsComponent implements AfterViewChecked {
  @Input() items: any[] = [];
  @Output() onChangeItems = new EventEmitter<any>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private shouldScroll: boolean = false;

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom() {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  onRemoveItem(item: any) {
    const index = this.items.findIndex((i: any) => i.id === item.id);
    if (index > -1) {
      this.items.splice(index, 1);
      this.onChangeItems.emit(this.items);
    }
  }

  onUpdateQuantity(event: any) {
    const { item, quantity } = event;
    const index = this.items.findIndex((i: any) => i.id === item.id);
    if (index > -1) {
      this.items[index].quantity = quantity;
      this.onChangeItems.emit(this.items);
    }
  }

  onItemGiveOffer(event: any) {
    const { item, offer } = event;
    const index = this.items.findIndex((i: any) => i.id === item.id);
    if (index > -1) {
      this.items[index].offer = offer;
      this.onChangeItems.emit(this.items);
    }
  }

  // Whenever items change, trigger scroll
  ngOnChanges() {
    this.shouldScroll = true;
  }
}
