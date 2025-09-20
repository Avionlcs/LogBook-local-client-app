import { Component } from '@angular/core';
import { SearchbarComponent } from './searchbar/searchbar.component';
import { DisplayComponent } from './display/display.component';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [SearchbarComponent, DisplayComponent],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss'
})
export class SalesComponent {
  searchQuery: string = '';
  itemQuantity: number = 0;

  searchQueryChange(query: string) {
    // Regex: capture "name <sep><number>"
    // <sep> can be *, &, or + (expand easily)
    const match = query.match(/^(.*?)\s*[\*&]\s*([\d.]+)$/);

    if (match) {
      const [, itemName, qtyStr] = match;
      this.itemQuantity = parseFloat(qtyStr); 
      this.searchQuery = query;
    } else {
      this.searchQuery = query;
    }
  }
}
