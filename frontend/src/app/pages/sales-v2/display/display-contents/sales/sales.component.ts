import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SaleComponent } from './sale/sale.component';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, SaleComponent],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss'
})
export class SalesComponent {
  @Input() keyword: string = '';

  sales: any[] = [];
}
