import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { debounceTime, Subject } from 'rxjs';
import { DateTimePickerComponent } from './date-time-picker/date-time-picker.component';

@Component({
  selector: 'app-sales-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DateTimePickerComponent],
  templateUrl: './sales-reports.component.html',
  styleUrls: ['./sales-reports.component.scss']
})
export class SalesReportsComponent implements OnInit {
  searchQuery = '';
  searchInput: any = {
    keywords: '',
    cashier: '',
    dateRange: ``
  };
  selectedCashier?: any;
  cashiers: any[] = [];
  cashiers_in_list: any[] = [];
  sales: any[] = [];
  filteredSales: any[] = [];
  timeframeStart: string = this.formatDateTime(new Date(new Date().setDate(new Date().getDate() - 3)));
  timeframeEnd: string = this.formatDateTime(new Date());
  private timeframeChangeSubject = new Subject<void>();

  currentYear = new Date().getFullYear();
  years = Array.from({ length: this.currentYear - 2000 + 1 }, (_, i) => 2000 + i);
  months = Array.from({ length: 12 }, (_, i) => i + 1);
  hours = Array.from({ length: 24 }, (_, i) => i);
  minutes = Array.from({ length: 60 }, (_, i) => i);
  seconds = Array.from({ length: 60 }, (_, i) => i);
  milliseconds = Array.from({ length: 10 }, (_, i) => i * 100);

  selectedYear: number | null = null;
  selectedMonth: number | null = null;
  selectedDay: number | null = null;
  selectedHour: number | null = null;
  selectedMinute: number | null = null;
  selectedSecond: number | null = null;
  selectedMillisecond: number | null = null;

  days: number[] = [];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {
    this.timeframeChangeSubject.pipe(debounceTime(500)).subscribe(() => {
      this.loadSales();
    });
  }

  ngOnInit() {
    this.loadCashiersWithSalesPermission();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    this.searchInput = {
      keywords: '',
      cashier: '',
      dateRange: `timestampy${year} timestampm${month} timestampd${day}`
    };
    this.loadSales();
  }

  onDateTimeChange(value: string | null) {
    this.searchInput.dateRange = value;
    this.loadSales();
  }

  onSearchChange() {
    //this.searchQuery = this.searchInput.keywords.trim();
    this.searchInput.keywords = this.searchQuery;
    this.loadSales();
  }

  private formatDateTime(date: Date): string {
    // Return as local string (no UTC conversion)
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  onTimeframeChange() {
    this.timeframeChangeSubject.next();
  }

  loadCashiersWithSalesPermission() {
    this.http.get<any[]>(`/users/by-permission/sales`).subscribe({
      next: (users) => {
        this.cashiers = users.map(user => ({
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber
        }));
      },
      error: (err) => {
        this.cashiers = [];
      }
    });
  }

  getCashierById(id: string): any {
    return this.cashiers.find(c => c.id === id) || { name: 'Unknown' };
  }

  loadSales() {
    let kw = this.searchInput.keywords.trim() + ' ' + this.searchInput.dateRange;
    if (this.selectedCashier) {
      kw += ` user${this.selectedCashier.id}`;
    }
    const url = `/search?keyword=${kw.trim()}&schema=sales`;
    console.log(`Loading sales with URL: ${url}`);

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        // Do not convert to Date(), keep raw
        this.sales = data.map(sale => ({
          ...sale,
          totalAmount: Number(sale.totalAmount),
          date: sale.date
        }));
        this.filterSales();
        this.cashiers_in_list = Array.from(
          new Map(this.sales.map(sale => [sale.user.id, sale.user])).values()
        );
        //this.cdr.detectChanges();
      },
      error: (err) => {
        this.sales = [];
        this.filteredSales = [];
        this.cashiers_in_list = [];
        //this.cdr.detectChanges();
      }
    });
  }

  selectCashier(cashier?: any) {
    this.selectedCashier = cashier;
    this.searchInput.cashier = cashier ? cashier.id : '';
    this.loadSales();
  }

  filterSales() {
    this.filteredSales = this.sales.filter(sale => {
      const matchesSearch = this.searchQuery
        ? sale.id.toString().includes(this.searchQuery) ||
        sale.user.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        : true;
      return matchesSearch;
    });

    this.filteredSales.sort((a, b) => {
      // Compare raw timestamps (no UTC conversion)
      const dateA = new Date(a.last_updated || a.created).getTime();
      const dateB = new Date(b.last_updated || b.created).getTime();
      return dateB - dateA;
    });
  }

  getLocalTime(raw: string): string {
    // Treat raw string as local
    const date = new Date(raw);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')} ${ampm}`;
  }

  getLocalDate(raw: string): string {
    // Treat raw string as local
    return new Date(raw).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedCashier = undefined;
    this.timeframeStart = this.formatDateTime(new Date(new Date().setDate(new Date().getDate() - 3)));
    this.timeframeEnd = this.formatDateTime(new Date());
    this.loadSales();
  }

  toLocalTime(raw: string): string {
    // Show as-is using local Date parsing
    return new Date(raw).toLocaleString();
  }

  inChashierSelect() { }
}
