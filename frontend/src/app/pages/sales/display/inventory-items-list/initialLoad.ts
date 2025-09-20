// inventory-items-list.init.ts
import { InventoryItemsService } from './inventory-items.service';

export class InventoryItemsListInit {
  constructor(
    private service: InventoryItemsService,
    private setState: (state: Partial<{ items: any[]; loading: boolean; error: string | null }>) => void
  ) {}

  loadInitial(limit: number = 100) {
    this.setState({ loading: true, error: null });

    this.service.getInventoryItems(limit).subscribe({
      next: (data) => {
        this.setState({ items: data, loading: false });
      },
      error: (err) => {
        console.error('Error fetching inventory:', err);
        this.setState({ error: 'Failed to load inventory items.', loading: false });
      }
    });
  }
}
