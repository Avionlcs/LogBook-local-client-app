import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-sales-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales-reports.component.html',
  styleUrls: ['./sales-reports.component.scss']
})
export class SalesReportsComponent implements OnInit {
  searchQuery = '';
  selectedCashier?: any;
  cashiers: any[] = [];
  sales: any[] = [];
  filteredSales: any[] = [];
  timeframeStart: Date = new Date(new Date().setDate(new Date().getDate() - 30)); // Last 30 days
  timeframeEnd: Date = new Date();

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.loadSales();
  }

  loadSales() {
    const defaultStart = new Date('1990-01-01T00:00:00Z').toISOString();
    const defaultEndDate = new Date();
    defaultEndDate.setFullYear(defaultEndDate.getFullYear() + 10);
    const defaultEnd = defaultEndDate.toISOString();

    const start = this.timeframeStart && !isNaN(this.timeframeStart.getTime())
      ? new Date(this.timeframeStart).toISOString()
      : defaultStart;
    const end = this.timeframeEnd && !isNaN(this.timeframeEnd.getTime())
      ? new Date(this.timeframeEnd).toISOString()
      : defaultEnd;

    console.log('Fetching sales for range:', start, end);

    this.http.get<any[]>(`/read-multiple/timeframe/sales/${start}/${end}`).subscribe({
      next: (data) => {
        console.log('Sales data:', data);
        this.sales = data.map(sale => ({
          ...sale,
          totalAmount: Number(sale.totalAmount), // Ensure totalAmount is a number
          date: new Date(sale.date) // Ensure date is a Date object
        }));
        this.filterSales();
        this.cashiers = Array.from(
          new Map(this.sales.map(sale => [sale.cashier.id, sale.cashier])).values()
        );
      },
      error: (err) => console.error('Error fetching sales:', err)
    });
  }

  selectCashier(cashier?: any) {
    this.selectedCashier = cashier;
    this.filterSales();
  }

  filterSales() {
    if (!this.selectedCashier) {
      this.filteredSales = this.sales;
    } else {
      this.filteredSales = this.sales.filter(sale => {
        const matchesCashier = !this.selectedCashier || sale.cashier.id === this.selectedCashier.id;
        const matchesSearch = this.searchQuery
          ? sale.id.toString().includes(this.searchQuery) ||
          sale.cashier.name.toLowerCase().includes(this.searchQuery.toLowerCase())
          : true;
        return matchesCashier && matchesSearch;
      });
    }

    // Sort by last_updated descending (newest first)
    this.filteredSales.sort((a, b) => {
      const dateA = new Date(a.last_updated || a.created).getTime();
      const dateB = new Date(b.last_updated || b.created).getTime();
      return dateB - dateA;
    });

    console.log('Filtered sales:', this.filteredSales);
    this.cdr.detectChanges(); // Trigger change detection
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedCashier = undefined;
    this.filterSales();
  }

  toLocalTime(isoString: string): string {
    const date = new Date(isoString); // ISO string is UTC
    return date.toLocaleString();     // Converts to browser's local time
  }

}