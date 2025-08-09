import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss'
})
export class SalesComponent {
  @Input() keyword: string = '';

  sales: any[] = [];
}
