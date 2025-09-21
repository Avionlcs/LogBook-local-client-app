import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InitialLoadService } from './handlers/initial-load/initial-load.service';
import { InitialLoadHandler } from './handlers/initial-load/initial-load.handler';
import { SearchItemService } from './handlers/search-item/search-item.service';
import { SearchItemsHandler } from './handlers/search-item/search-item.handler';
import { LoadingComponent } from './loading/loading.component';
import { InventoryItemComponent } from './inventory-item/inventory-item.component';
import { EmptyMessageComponent } from './empty-message/empty-message.component';

@Component({
  selector: 'app-inventory-items-list',
  standalone: true,
  imports: [
    CommonModule,
    LoadingComponent,
    InventoryItemComponent,
    EmptyMessageComponent,
  ],
  templateUrl: './inventory-items-list.component.html',
  styleUrls: ['./inventory-items-list.component.scss'],
  providers: [InitialLoadService, SearchItemService],
})
export class InventoryItemsListComponent implements OnInit, OnChanges {
  @Input() searchQuery: string = '';
  @Output() onItemClick = new EventEmitter<string>();

  @ViewChild('itemsContainer') itemsContainer!: ElementRef<HTMLDivElement>;

  items: any[] = [];
  loading = true;
  loadingMore = false; // 👈 for bottom spinner
  error: string | null = null;
  private limit: number = 10;
  private endOfResults: boolean = false;

  private initialLoadHandler: InitialLoadHandler;
  private searchHandler: SearchItemsHandler;

  constructor(
    private initialLoadService: InitialLoadService,
    private searchService: SearchItemService
  ) {
    this.initialLoadHandler = new InitialLoadHandler(this.initialLoadService);
    this.searchHandler = new SearchItemsHandler(this.searchService);
  }

  ngOnInit(): void {
    this.loadItems(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchQuery'] && !changes['searchQuery'].firstChange) {
      this.limit = 10; // reset on new search
      this.endOfResults = false;
      this.loadItems(false);
    }
  }

  private loadItems(isScrollLoad: boolean): void {
    if (this.endOfResults) {
      return
    }
    if (isScrollLoad) {
      this.loadingMore = true;
    } else {
      this.loading = true;
      this.error = null;
      this.items = [];
    }

    const onSuccess = (newItems: any[]) => {
      if (isScrollLoad) {
        let nwit = newItems.slice(this.items.length, this.limit);
        this.endOfResults = nwit.length <= this.limit;
        this.items = [...this.items, ...nwit];
        this.loadingMore = false;
      } else {
        this.items = newItems;
        this.loading = false;
      }
    };

    const onError = (err: any) => {
      console.error('❌ Error fetching inventory items', err);
      this.error = 'Failed to load inventory items.';
      this.loading = false;
      this.loadingMore = false;
    };

    if (this.searchQuery && this.searchQuery.trim() !== '') {
      this.searchHandler.load(this, this.limit, onSuccess, onError, isScrollLoad);
    } else {
      this.initialLoadHandler.load(this, this.limit, onSuccess, onError, isScrollLoad);
    }
  }

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const threshold = 100;

    if (this.loading || this.loadingMore) return;

    if (target.scrollHeight - target.scrollTop - target.clientHeight < threshold) {
      this.limit += 10;
      this.loadItems(true); // 👈 load more
    }
  }

  itemClick(item_id: string) {
    this.onItemClick.emit(item_id);
  }
}
