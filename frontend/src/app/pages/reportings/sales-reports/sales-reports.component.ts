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
  milliseconds = Array.from({ length: 10 }, (_, i) => i * 100); // 0, 100, ..., 900


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
    this.loadSales();
  }

  onDateTimeChange(value: string | null) {
    console.log('Selected DateTime:', value);
  }

  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private parseDateTime(dateTimeStr: string): Date {
    return new Date(dateTimeStr);
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

    const start = this.timeframeStart && !isNaN(this.parseDateTime(this.timeframeStart).getTime())
      ? this.parseDateTime(this.timeframeStart).toISOString()
      : defaultStart;
    const end = this.timeframeEnd && !isNaN(this.parseDateTime(this.timeframeEnd).getTime())
      ? this.parseDateTime(this.timeframeEnd).toISOString()
      : defaultEnd;

    const cashierId = this.selectedCashier ? this.selectedCashier.id : '';
    const url = `/read-multiple/timeframe/sales/${start}/${end}`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.sales = data.map(sale => ({
          ...sale,
          totalAmount: Number(sale.totalAmount),
          date: new Date(sale.date)
        }));
        this.filterSales();
        this.cashiers_in_list = Array.from(
          new Map(this.sales.map(sale => [sale.user.id, sale.user])).values()
        );
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching sales:', err);
        this.sales = [];
        this.filteredSales = [];
        this.cashiers_in_list = [];
        this.cdr.detectChanges();
      }
    });
  }

  selectCashier(cashier?: any) {
    this.selectedCashier = cashier;

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
      const dateA = new Date(a.last_updated || a.created).getTime();
      const dateB = new Date(b.last_updated || b.created).getTime();
      return dateB - dateA;
    });

    console.log('Filtered sales:', this.filteredSales);
  }

  getLocalTime(iso: string): string {
    const date = new Date(iso);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
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
    this.timeframeStart = this.formatDateTime(new Date(new Date().setDate(new Date().getDate() - 3)));
    this.timeframeEnd = this.formatDateTime(new Date());
    this.loadSales();
  }

  toLocalTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString();
  }

  inChashierSelect() {
  }
}