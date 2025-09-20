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

  searchQueryChange(query: string) {
    this.searchQuery = query;
  }
}
