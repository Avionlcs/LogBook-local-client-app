import { Component, OnInit } from '@angular/core';
import { SearchbarComponent } from './searchbar/searchbar.component';
import { DisplayComponent } from './display/display.component';
import { SalesHandler } from './counter/handler/sales-handler';
import { SalesApiService } from './counter/handler/sales-api.service';
import { SalesStateService } from './counter/handler/sales-state.service';
import { CounterComponent } from './counter/counter.component';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [SearchbarComponent, DisplayComponent, CounterComponent],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss'
})
export class SalesComponent implements OnInit {
  searchQuery = '';
  itemQuantity = 1;
  saleId = '';
  sale: any = {};
  private handler: SalesHandler;

  constructor(api: SalesApiService, state: SalesStateService) {
    this.handler = new SalesHandler(api, state);
  }

  ngOnInit(): void {
    this.saleId = this.handler.saleId || '';
    if (this.saleId) {
      this.loadSale();
    }
  }

  loadSale(): void {
    this.handler.getSale(
      (sale: any) => {
        this.sale = sale;
        console.log('Loaded sale:', this.sale);
      },
      (err: any) => {
        console.error('Failed to load sale:', err);
        this.sale = {};
      }
    );
  }

  searchQueryChange(q: string) {
    this.searchQuery = q;
  }

  itemClick(item_id: string) {
    const unit_price = 10;
    this.handler.handleItemClick(
      item_id,
      this.itemQuantity,
      unit_price,
      (id: any, msg?: string) => {
        this.saleId = id;
        console.log('Added', id, msg);
        this.loadSale(); // refresh sale after adding item
      },
      (e: any) => console.error('Add failed', e)
    );
  }

  clearSale() {
    this.handler.clearSale();
    this.saleId = '';
    this.sale = {};
  }
}
