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
  cashiers_in_list: any[] = [];
  sales: any[] = [];
  filteredSales: any[] = [];
  timeframeStart: Date = new Date(new Date().setDate(new Date().getDate() - 3)); // Last 30 days
  timeframeEnd: Date = new Date();

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.loadCashiersWithSalesPermission();
    this.loadSales();
  }

  loadCashiersWithSalesPermission() {
    this.http.get<any[]>(`/users/by-permission/sales`).subscribe({
      next: (users) => {
        // Map users to cashier format (id, name) expected by your dropdown
        this.cashiers = users.map(user => ({
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber
        }));
        console.log('Cashiers with sales permission:', this.cashiers);
      },
      error: (err) => {
        console.error('Error fetching cashiers with sales permission:', err);
        this.cashiers = [];
      }
    });
  }

  getCashierById(id: string): any {
    return this.cashiers.find(c => c.id === id) || { name: 'Unknown' };
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
    this.http.get<any[]>(`/read-multiple/timeframe/sales/${start}/${end}`).subscribe({
      next: (data) => {
        console.log('Sales data:', data);
        this.sales = data.map(sale => ({
          ...sale,
          totalAmount: Number(sale.totalAmount),
          date: new Date(sale.date)
        }));
        this.filterSales();
        this.cashiers_in_list = Array.from(
          new Map(this.sales.map(sale => [sale.user.id, sale.user])).values()
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
        const matchesCashier = !this.selectedCashier || sale.user.id === this.selectedCashier.id;
        const matchesSearch = this.searchQuery
          ? sale.id.toString().includes(this.searchQuery) ||
          sale.user.name.toLowerCase().includes(this.searchQuery.toLowerCase())
          : true;
        return matchesCashier && matchesSearch;
      });
    }
    this.filteredSales.sort((a, b) => {
      const dateA = new Date(a.last_updated || a.created).getTime();
      const dateB = new Date(b.last_updated || b.created).getTime();
      return dateB - dateA;
    });

    console.log('Filtered sales:', this.filteredSales);
    this.cdr.detectChanges(); // Trigger change detection
  }

  getLocalTime(iso: string): string {
    const date = new Date(iso);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12; // 12 AM or 12 PM

    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    const mss = milliseconds.toString().padStart(3, '0');

    return `${hours}:${mm}:${ss} ${ampm}`;
  }

  getLocalDate(iso: string): string {
    return new Date(iso).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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