import { Component, OnInit } from '@angular/core';
import { SearchbarComponent } from './searchbar/searchbar.component';
import { DisplayComponent } from './display/display.component';
import { SalesHandler } from './counter/handler/sales-handler';
import { SalesApiService } from './counter/handler/sales-api.service';
import { SalesStateService } from './counter/handler/sales-state.service';


@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [SearchbarComponent, DisplayComponent],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss'
})
export class SalesComponent implements OnInit {
  searchQuery = '';
  itemQuantity = 1;
  saleId = '';
  private handler: SalesHandler;

  constructor(api: SalesApiService, state: SalesStateService) {
    this.handler = new SalesHandler(api, state);
  }

  ngOnInit(): void {
    this.saleId = this.handler.saleId || '';
  }

  searchQueryChange(q: string) {
    this.searchQuery = q;
  }

  itemClick(item_id: string) {
    const unit_price = 10;
    this.handler.handleItemClick(
      item_id, this.itemQuantity, unit_price,
      (id: any) => { 
        this.saleId = id; 
      console.log('Added', id);
      
      },
      (e: any) => console.error('Add failed', e)
    );
  }

  clearSale() {
    this.handler.clearSale();
    this.saleId = '';
  }
}
