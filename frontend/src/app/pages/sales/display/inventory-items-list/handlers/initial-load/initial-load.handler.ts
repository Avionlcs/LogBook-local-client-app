import { InventoryItemsListComponent } from '../../inventory-items-list.component';
import { InitialLoadService } from './initial-load.service';

export class InitialLoadHandler {
  constructor(private service: InitialLoadService) {}

  load(
    component: InventoryItemsListComponent,
    limit: number,
    onSuccess: (items: any[]) => void,
    onError: (err: any) => void,
    isScrollLoad: boolean
  ): void {
    this.service.getInitialItems(limit).subscribe({
      next: (items) => onSuccess(items),
      error: (err) => onError(err),
    });
  }
}
