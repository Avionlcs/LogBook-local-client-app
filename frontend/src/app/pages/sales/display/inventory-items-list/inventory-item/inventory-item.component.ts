import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-inventory-item',
  standalone: true,
  imports: [],
  templateUrl: './inventory-item.component.html',
  styleUrl: './inventory-item.component.scss'
})
export class InventoryItemComponent {
  @Input() item: any = {};

  
}
