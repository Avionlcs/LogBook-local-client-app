import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-receipt-item',
  standalone: true,
  imports: [],
  templateUrl: './receipt-item.component.html',
  styleUrl: './receipt-item.component.scss'
})
export class ReceiptItemComponent {

  @Input() item: any;
  @Output() removeItem = new EventEmitter<any>();
  @Output() updateQuantity = new EventEmitter<any>();
  @Output() giveOffer = new EventEmitter<any>();

  onRemoveItem() {
    this.removeItem.emit(this.item);
  }

  onUpdateQuantity(quantity: number) {
    this.updateQuantity.emit({ item: this.item, quantity });
  }

  onGiveOffer(offer: any) {
    this.giveOffer.emit({ item: this.item, offer });
  }
}
