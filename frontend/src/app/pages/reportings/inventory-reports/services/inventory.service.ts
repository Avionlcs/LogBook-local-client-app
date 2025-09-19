// src/app/features/inventory-reports/services/inventory.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { InventoryReportsComponent } from '../inventory-reports.component';

@Injectable()
export class InventoryService {
  constructor(private http: HttpClient) {}

  loadTables(component: InventoryReportsComponent, start: number, end: number) {
    const url = `/api/inventory/get/initial-inventory?limit=${component.table_limit}`;
    if (component.searchValue !== '') {
      this.searchInventory(component);
      return;
    }
    this.http.get<any[]>(url).subscribe({
      next: (response) => {
        component.tables.out_of_stock = response.filter((item: any) => (item.stock - item.sold) <= 0);
        component.tables.current_inventory = response;
        if (component.selectedCategory === 'current inventory') {
          component.display_table = response;
          component.feedData = response;
        } else if (component.selectedCategory === 'out of stock') {
          component.display_table = component.tables.out_of_stock;
          component.feedData = response;
        }
        component.barcodePrintInfo.count = component.display_table?.length;
        component.table_limit += 10;
       // component.isInitLoading = false;
      },
      error: (error) => {
        console.log('Error fetching inventory items ______________________ ', error);
        component.error = error?.error;
       // component.isInitLoading = false;
        console.log('Error fetching m', error?.error);
      }
    });
  }

  searchItems(component: InventoryReportsComponent) {
    this.searchInventory(component);
  }

  searchInventory(component: InventoryReportsComponent) {
    const searchTerm = component.searchValue.toLowerCase();
    if (searchTerm !== component.lastSearchValue) {
      component.searchLimit = 10;
    }
    component.lastSearchValue = searchTerm;
    const searchUrl = `/api/inventory/search?keyword=${searchTerm}&limit=${component.searchLimit}`;
    this.http.get<any[]>(searchUrl).subscribe({
      next: (response) => {
        component.display_table = response;
        component.feedData = response;
        component.barcodePrintInfo.count = component.display_table?.length;
        component.searchLimit += 10;
      },
      error: (error) => {
        console.error('Error during search', error);
      }
    });
  }

  fetchOutOfStock(component: InventoryReportsComponent) {
    const url = `/read-multiple/range/inventory_items/0/999999999999999`;
    this.http.get<any[]>(url).subscribe({
      next: (response: any) => {
        component.display_table = response.filter((item: any) => (item.stock - item.sold) <= 0);
      },
      error: (error) => {
        console.error('Error fetching inventory items', error);
      }
    });
  }

  addItem(component: InventoryReportsComponent) {
    const headers = { 'Content-Type': 'application/json' };
    component.addItemLoading = true;
    this.http.post('/api/inventory/add', { ...component.item }, { headers }).subscribe({
      next: (response: any) => {
        component.item = {
          imageUrl: '',
          name: '',
          stock: '',
          min_stock: '',
          buy_price: '',
          sale_price: '',
          barcode: '',
          sold: 0
        };
        component.addItemLoading = false;
        this.loadTables(component, 0, 10);
      },
      error: (error: any) => {
        component.item = {
          imageUrl: '',
          name: '',
          stock: '',
          min_stock: '',
          buy_price: '',
          sale_price: '',
          barcode: '',
          sold: 0
        };
        component.addItemLoading = false;
        console.error('Error adding item', error);
      }
    });
  }
}