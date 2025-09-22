import { CurrencyPipe, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ThumbComponent } from './thumb/thumb.component';

@Component({
  selector: 'app-receipt-item',
  standalone: true,
  imports: [CurrencyPipe, UpperCasePipe, ThumbComponent],
  templateUrl: './receipt-item.component.html',
  styleUrl: './receipt-item.component.scss'
})
export class ReceiptItemComponent {

  @Input() item: any;
  @Input() index: number = 0;
  @Input() selected: boolean = false;
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
