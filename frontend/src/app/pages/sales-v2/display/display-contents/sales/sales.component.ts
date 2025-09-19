import { Component, Input } from '@angular/core';
import { ItemComponent } from '../items/item/item.component';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [ItemComponent],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss'
})
export class SalesComponent {
  @Input() keyword: string = '';

  sales: any[] = [];
}
