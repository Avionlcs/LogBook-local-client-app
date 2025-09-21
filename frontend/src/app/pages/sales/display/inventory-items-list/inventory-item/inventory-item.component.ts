import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { TimeAgoPipe } from './time-ago.pipe';


@Component({
  selector: 'app-inventory-item',
  standalone: true,
  imports: [CommonModule, TimeAgoPipe, CurrencyPipe],
  templateUrl: './inventory-item.component.html',
  styleUrls: ['./inventory-item.component.scss']
})
export class InventoryItemComponent {
  @Input() item: any;
  @Output() onItemClick = new EventEmitter<string>();

  constructor() { }

  onClick() {
    this.onItemClick.emit(this.item.id);
  }
}