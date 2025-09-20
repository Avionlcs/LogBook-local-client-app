import { InventoryItemsListComponent } from '../inventory-items-list.component';
import { SearchItemService } from './search-item.service';

export class SearchItemsHandler {
  constructor(private service: SearchItemService) {}

  load(component: InventoryItemsListComponent, limit: number = 10): void {
    component.loading = true;
    component.error = null;
    component.items = []; // clear old items while searching

    this.service.getSearchItems(component.searchQuery, limit).subscribe({
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
