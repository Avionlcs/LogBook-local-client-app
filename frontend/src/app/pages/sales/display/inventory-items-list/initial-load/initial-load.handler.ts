import { InitialLoadService } from './initial-load.service';

export class InitialLoadHandler {
  items: any[] = [];
  loading = false;
  error: string | null = null;

  constructor(private initialLoadService: InitialLoadService) {}

  loadInitialItems(limit: number = 10): void {
    this.loading = true;
    this.error = null;

    this.initialLoadService.getInitialItems(limit).subscribe({
      next: (data) => {
        this.items = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching inventory:', err);
        this.error = 'Failed to load inventory items.';
        this.loading = false;
      }
    });
  }
}
