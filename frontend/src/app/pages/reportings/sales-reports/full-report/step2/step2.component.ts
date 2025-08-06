import { Component, Input } from '@angular/core';
import { DateTimePickerComponent } from '../../date-time-picker/date-time-picker.component';
import { PieChartComponent } from '../../pie-chart/pie-chart.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-step2',
  standalone: true,
  imports: [DateTimePickerComponent, PieChartComponent, CommonModule, FormsModule],
  templateUrl: './step2.component.html',
  styleUrl: './step2.component.scss'
})
export class Step2Component {
  selectedSellar: any = null;
  sellars: any[] = [];
  pieChart: any = [];
  dateRange: any = {};
  totalCashPayments: number = 0;
  totalCardPayments: number = 0;
  totalPayments: number = 0;
  sales: any = [];
  @Input() cashTotal: any = 0;
  @Input() cardTotal: any = 0;

  constructor(private http: HttpClient) {
  }

  ngOnInit() {
  }

  onDateTimeChange(e: any) {
    if (e) {
      this.dateRange = e;
    } else {
      this.dateRange = {};
    }

    this.filterSales();
  }

  filterSales() {
    const url = '/api/reportings/sales/filter-summery';
    var t = this.dateRange;

    var body: any = {
      keywords: '',
      cashiers: this.selectedSellar ? [this.selectedSellar.id] : [],
      dataLimit: 1000,
      ...t
    };

    this.http.post<any>(url, body).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.sales = response.data.map((sale: any) => ({
            ...sale,
            totalAmount: Number(sale.totalAmount),
            date: sale.date,
            paid: Number(sale.paid || 0),
            balance: Number(sale.balance || sale.totalAmount - (sale.paid || 0)),
          }));

          this.sales.sort((a: any, b: any) => {
            const dateA = new Date(a.last_updated || a.created).getTime();
            const dateB = new Date(b.last_updated || b.created).getTime();
            return dateB - dateA;
          });
        } else {
          this.sales = [];
        }
        this.calculateTotals();
      },
      error: (err) => {
        console.error('Error fetching sales:', err);
        this.sales = [];
        this.calculateTotals();
      },
    });
  }

  getGrandTotal() {
    return Number(this.cardTotal + this.cashTotal);
  }

  makePieChartData() {
    this.pieChart = [
      { label: 'Money reccived', amount: this.getGrandTotal() },
      { label: 'Money reccived cash', amount: this.cashTotal },
      { label: 'Money reccived card', amount: this.cardTotal },
      { label: 'Total payments', amount: this.totalPayments },
      { label: 'Card payments', amount: this.totalCardPayments },
      { label: 'Cash payments', amount: this.totalCashPayments },
      { label: 'Card Lost', amount: this.totalPayments },
      { label: 'Cash Lost', amount: this.totalPayments },
      { label: 'card Extra', amount: this.getGrandTotal() },
      { label: 'cash Extra', amount: this.getGrandTotal() }
    ]
  }

  onSelectSellar() {
    this.filterSales();
  }

  calculateTotals() {
    let cashSum = 0;
    let cardSum = 0;
    let sum = 0;

    this.sales.forEach((sale: any) => {
      cashSum += sale.cashPayment || 0;
      cardSum += sale.cardPayment || 0;
      sum += ((sale.cashPayment || 0) + (sale.cardPayment || 0))
    });

    this.totalCashPayments = cashSum;
    this.totalCardPayments = cardSum;
    this.totalPayments = sum;
  }
}
