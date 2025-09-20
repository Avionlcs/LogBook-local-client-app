import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InitialLoadService } from './initial-load/initial-load.service';
import { InitialLoadHandler } from './initial-load/initial-load.handler';
import { LoadingComponent } from './loading/loading.component';

@Component({
  selector: 'app-inventory-items-list',
  standalone: true,
  imports: [CommonModule, LoadingComponent],
  templateUrl: './inventory-items-list.component.html',
  styleUrls: ['./inventory-items-list.component.scss'],
  providers: [InitialLoadService]
})
export class InventoryItemsListComponent implements OnInit {
  @Input() searchQuery: string = '';

  items: any[] = [];
  loading = true;
  error: string | null = null;

  private initialLoadHandler: InitialLoadHandler;

  constructor(private service: InitialLoadService) {
    this.initialLoadHandler = new InitialLoadHandler(this.service);
  }

  ngOnInit(): void {
    this.initialLoadHandler.load(this, 10);
  }
}
