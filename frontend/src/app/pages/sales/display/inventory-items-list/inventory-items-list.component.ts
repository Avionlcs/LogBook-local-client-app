import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InitialLoadService } from './initial-load/initial-load.service';
import { InitialLoadHandler } from './initial-load/initial-load.handler';
import { SearchItemService } from './fetch/search-item/search-item.service';
import { SearchItemsHandler } from './fetch/search-item/search-item.handler';
import { LoadingComponent } from './loading/loading.component';
import { InventoryItemComponent } from './inventory-item/inventory-item.component';

@Component({
  selector: 'app-inventory-items-list',
  standalone: true,
  imports: [CommonModule, LoadingComponent, InventoryItemComponent],
  templateUrl: './inventory-items-list.component.html',
  styleUrls: ['./inventory-items-list.component.scss'],
  providers: [InitialLoadService, SearchItemService]
})
export class InventoryItemsListComponent implements OnInit, OnChanges {
  @Input() searchQuery: string = '';

  items: any[] = [];
  loading = true;
  error: string | null = null;

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
    this.loadItems();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchQuery'] && !changes['searchQuery'].firstChange) {
      this.loadItems();
    }
  }

  private loadItems(limit: number = 10): void {
    console.log('🚀 Search query changed', this.searchQuery);
    
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      this.searchHandler.load(this, limit);
    } else {
      this.initialLoadHandler.load(this, limit);
    }
  }
}
