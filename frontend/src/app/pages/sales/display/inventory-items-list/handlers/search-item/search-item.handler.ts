import { InventoryItemsListComponent } from '../../inventory-items-list.component';
import { SearchItemService } from './search-item.service';

export class SearchItemsHandler {
  constructor(private service: SearchItemService) {}

  load(
    component: InventoryItemsListComponent,
    limit: number,
    onSuccess: (items: any[]) => void,
    onError: (err: any) => void,
    isScrollLoad: boolean
  ): void {
    let query = component.searchQuery;
    let itemName = query;

    const match = query.match(/^(.*?)\s*[\*&]\s*([\d.]+)$/);
    if (match) {
      const [, name, qtyStr] = match;
      itemName = name.trim();
    }

    this.service.getSearchItems(itemName, limit).subscribe({
      next: (items) => onSuccess(items),
      error: (err) => onError(err),
    });
  }
}
