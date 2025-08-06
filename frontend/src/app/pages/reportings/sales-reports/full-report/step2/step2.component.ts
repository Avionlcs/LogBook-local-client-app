import { Component, Input, OnInit } from '@angular/core';
import { DateTimePickerComponent } from '../../date-time-picker/date-time-picker.component';
import { PieChartComponent } from '../../pie-chart/pie-chart.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Sale {
  id: number;
  totalAmount: number;
  date: string;
  paid: number;
  balance: number;
  cashPayment?: number;
  cardPayment?: number;
  created?: string;
  last_updated?: string;
}

interface DateRange {
  startDate?: string;
  endDate?: string;
}

interface PieChartData {
  label: string;
  amount: number;
}

interface Sellar {
  id: number;
  name: string;
}

@Component({
  selector: 'app-step2',
  standalone: true,
  imports: [DateTimePickerComponent, PieChartComponent, CommonModule, FormsModule],
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.scss']
})
export class Step2Component implements OnInit {
  @Input() cashTotal = 0;
  @Input() cardTotal = 0;

  selectedSellar: Sellar | null = null;
  sellars: Sellar[] = [];
  dateRange: DateRange = {};
  sales: Sale[] = [];

  totalCashPayments = 0;
  totalCardPayments = 0;
  totalPayments = 0;

  pieChart: PieChartData[] = [];

  private readonly API_FILTER = '/api/reportings/sales/filter-summery';
  private readonly API_SELLARS = '/api/reportings/sales/get-all-sellars';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadSellars();
  }

  onDateTimeChange(range: DateRange): void {
    this.dateRange = range || {};
    this.filterSales();
  }

  onSelectSellar(): void {
    this.filterSales();
  }

  private loadSellars(): void {
    this.http.get<any>(this.API_SELLARS).subscribe({
      next: (response) => {
        this.sellars = response;
      },
      error: () => {
        this.sellars = [];
      }
    });
  }

  private filterSales(): void {
    const body = {
      keywords: '',
      cashiers: this.selectedSellar ? [this.selectedSellar.id] : [],
      dataLimit: 1000,
      ...this.dateRange
    };

    this.http.post<any>(this.API_FILTER, body).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.sales = response.data.map((sale: any) => this.transformSale(sale));
          this.sortSales();
        } else {
          this.sales = [];
        }
        this.updateTotalsAndChart();
      },
      error: () => {
        this.sales = [];
        this.updateTotalsAndChart();
      }
    });
  }

  private transformSale(sale: any): Sale {
    return {
      ...sale,
      totalAmount: Number(sale.totalAmount),
      paid: Number(sale.paid || 0),
      balance: Number(sale.balance ?? sale.totalAmount - (sale.paid || 0)),
      date: sale.date
    };
  }

  private sortSales(): void {
    this.sales.sort((a, b) => {
      const dateA = new Date(a.last_updated || a.created || a.date).getTime();
      const dateB = new Date(b.last_updated || b.created || b.date).getTime();
      return dateB - dateA;
    });
  }

  private updateTotalsAndChart(): void {
    this.calculateTotals();
    this.buildPieChartData();
  }

  private calculateTotals(): void {
    const { cashSum, cardSum, total } = this.sales.reduce(
      (acc, sale) => {
        acc.cashSum += sale.cashPayment || 0;
        acc.cardSum += sale.cardPayment || 0;
        acc.total += (sale.cashPayment || 0) + (sale.cardPayment || 0);
        return acc;
      },
      { cashSum: 0, cardSum: 0, total: 0 }
    );

    this.totalCashPayments = cashSum;
    this.totalCardPayments = cardSum;
    this.totalPayments = total;
  }

  private getGrandTotal(): number {
    return this.cardTotal + this.cashTotal;
  }

  private buildPieChartData(): void {
    const grandTotal = this.getGrandTotal();

    const cashLost = this.totalCashPayments - this.cashTotal;
    const cardLost = this.totalCardPayments - this.cardTotal;
    const cashExtra = this.cashTotal - this.totalCashPayments;
    const cardExtra = this.cardTotal - this.totalCardPayments;

    const totalLost = (cashLost > 0 ? cashLost : 0) + (cardLost > 0 ? cardLost : 0);
    const totalExtra = (cashExtra > 0 ? cashExtra : 0) + (cardExtra > 0 ? cardExtra : 0);

    const chart: PieChartData[] = [];

    if (grandTotal) chart.push({ label: 'Money received (Total)', amount: grandTotal });
    if (this.cashTotal) chart.push({ label: 'Cash received', amount: this.cashTotal });
    if (this.cardTotal) chart.push({ label: 'Card received', amount: this.cardTotal });
    if (this.totalCashPayments) chart.push({ label: 'Cash payments', amount: this.totalCashPayments });
    if (this.totalCardPayments) chart.push({ label: 'Card payments', amount: this.totalCardPayments });

    if (cashLost > 0) chart.push({ label: 'Cash lost', amount: cashLost });
    if (cardLost > 0) chart.push({ label: 'Card lost', amount: cardLost });
    if (totalLost > 0) chart.push({ label: 'Total lost', amount: totalLost });

    if (cashExtra > 0) chart.push({ label: 'Cash extra', amount: cashExtra });
    if (cardExtra > 0) chart.push({ label: 'Card extra', amount: cardExtra });
    if (totalExtra > 0) chart.push({ label: 'Total extra', amount: totalExtra });
    console.log('??????????????????? pie ', chart);

    this.pieChart = chart;
  }
}
