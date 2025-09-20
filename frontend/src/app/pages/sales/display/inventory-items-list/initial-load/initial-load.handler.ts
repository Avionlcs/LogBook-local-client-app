import { InitialLoadService } from './initial-load.service';
import { InventoryItemsListComponent } from '../inventory-items-list.component';

export class InitialLoadHandler {
  constructor(private service: InitialLoadService) {}

  load(component: InventoryItemsListComponent, limit: number = 10): void {
    component.loading = true;
    component.error = null;

    this.service.getInitialItems(limit).subscribe({
      next: (items) => {
        component.items = items;
        component.loading = false;
      },
      error: (err) => {
        console.error('❌ Error fetching inventory items', err);
        component.error = 'Failed to load inventory items.';
        component.loading = false;
      }
    });
  }
}
