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


  getPlaceholderColor(): string {
    if (!this.item?.id) return '#F5F5F5';

    // Hash id string into a number
    const hash: any = Array.from(this.item.id).reduce(
      (acc: any, c: any) => acc + c.charCodeAt(0),
      0
    );

    const hue: number = hash % 360;

    const saturations: number[] = [50, 55, 60];
    const lightnesses: number[] = [78, 82, 86];

    const sat: number = saturations[hash % saturations.length];
    const light: number = lightnesses[hash % lightnesses.length];

    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }


  onClick() {
    if ((this.item.stock - this.item.sold) < this.item.min_stock) {
      return;
    }
    this.onItemClick.emit(this.item.id);
  }
}