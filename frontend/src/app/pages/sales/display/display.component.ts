import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SalesItemsListComponent } from './sales-items-list/sales-items-list.component';
import { InventoryItemsListComponent } from './inventory-items-list/inventory-items-list.component';
import { ChangeModeComponent } from './change-mode/change-mode.component';

@Component({
  selector: 'app-display',
  standalone: true,
  imports: [CommonModule, InventoryItemsListComponent, SalesItemsListComponent, ChangeModeComponent],
  templateUrl: './display.component.html',
  styleUrl: './display.component.scss'
})
export class DisplayComponent {
  @Input() searchQuery: string = '';

  displayMode: string = 'inventory';

  changeMode(mode: boolean) {
    this.displayMode = mode ? 'sales' : 'inventory';
  }
}
