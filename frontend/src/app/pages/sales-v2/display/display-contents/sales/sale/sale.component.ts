import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-in3-sale',
  standalone: true,
  imports: [],
  templateUrl: './sale.component.html',
  styleUrl: './sale.component.scss'
})
export class SaleComponent {
  @Input() sale: any = {};

}
