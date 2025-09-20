import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SalesItemsListComponent } from './sales-items-list/sales-items-list.component';
import { InventoryItemsListComponent } from './inventory-items-list/inventory-items-list.component';

@Component({
  selector: 'app-display',
  standalone: true,
  imports: [CommonModule, InventoryItemsListComponent, SalesItemsListComponent],
  templateUrl: './display.component.html',
  styleUrl: './display.component.scss'
})
export class DisplayComponent {
  mode: string = 'inventory';

  changeMode() {
    this.mode = this.mode == 'inventory' ? 'sales' : 'inventory';
  }
}
