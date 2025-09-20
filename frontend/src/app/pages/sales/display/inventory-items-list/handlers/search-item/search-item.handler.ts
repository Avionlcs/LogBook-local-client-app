import { InventoryItemsListComponent } from '../../inventory-items-list.component';
import { SearchItemService } from './search-item.service';

export class SearchItemsHandler {
  constructor(private service: SearchItemService) {}

  load(component: InventoryItemsListComponent, limit: number = 10): void {
    component.loading = true;
    component.error = null;
    component.items = []; // clear old items while searching

    let query = component.searchQuery;
    let itemName = query;

    // Support special shortcuts like pasta *52 or rice &2.5
    const match = query.match(/^(.*?)\s*[\*&]\s*([\d.]+)$/);
    if (match) {
      const [, name, qtyStr] = match;
      itemName = name.trim();
    }

    this.service.getSearchItems(itemName, limit).subscribe({
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
