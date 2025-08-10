import { CommonModule } from '@angular/common';
import { Component, Input, SimpleChanges } from '@angular/core';
import { ItemComponent } from './item/item.component';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-in-items',
  standalone: true,
  imports: [CommonModule, ItemComponent],
  templateUrl: './items.component.html',
  styleUrl: './items.component.scss'
})
export class ItemsComponent {
  @Input() keyword: string = '';

  items: any[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.fetchMostSoldItems();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['keyword']) {
      const kw = changes['keyword'].currentValue;
      if (kw && kw.trim().length >= 2) {
        this.fetchSalesByKeyword(kw.trim());
      } else if (!kw) {
        this.fetchMostSoldItems();
      }
    }
  }

  fetchMostSoldItems() {
    this.http.get<any[]>('/api/sales/get/most-sold', { params: { limit: '20' } })
      .subscribe({
        next: (res) => {
          this.items = res;
        },
        error: (err) => {
          console.error('Failed to fetch most sold items', err);
          this.items = [];
        }
      });
  }

  fetchSalesByKeyword(keyword: string) {
    this.http.get<{ success: boolean; sales: any[] }>('/api/sales', { params: { keyword, limit: '20' } })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.items = res.sales;
          } else {
            this.items = [];
          }
        },
        error: (err) => {
          console.error('Failed to fetch sales by keyword', err);
          this.items = [];
        }
      });
  }
}