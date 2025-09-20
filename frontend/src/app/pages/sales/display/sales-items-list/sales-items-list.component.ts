import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sales-items-list',
  standalone: true,
  imports: [],
  templateUrl: './sales-items-list.component.html',
  styleUrl: './sales-items-list.component.scss'
})
export class SalesItemsListComponent {
  @Input() searchQuery: string = '';

}
