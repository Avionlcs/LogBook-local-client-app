import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-receipt-items',
  standalone: true,
  imports: [CommonModule, ReceiptItemsComponent],
  templateUrl: './receipt-items.component.html',
  styleUrl: './receipt-items.component.scss'
})
export class ReceiptItemsComponent {
  @Input() items: any = [];
  @Output() onChangeItems = new EventEmitter<any>();

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
}
