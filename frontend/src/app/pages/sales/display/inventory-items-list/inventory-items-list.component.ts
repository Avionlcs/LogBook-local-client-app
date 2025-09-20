import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InitialLoadService } from './initial-load/initial-load.service';
import { InitialLoadHandler } from './initial-load/initial-load.handler';


@Component({
  selector: 'app-inventory-items-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-items-list.component.html',
  styleUrls: ['./inventory-items-list.component.scss'],
  providers: [InitialLoadService] 
})
export class InventoryItemsListComponent implements OnInit {
  @Input() searchQuery: string = '';
  handler: InitialLoadHandler;

  constructor(private initialLoadService: InitialLoadService) {
    this.handler = new InitialLoadHandler(this.initialLoadService);
  }

  ngOnInit(): void {
    this.handler.loadInitialItems();
  }
}
