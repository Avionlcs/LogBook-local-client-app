import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [],
  templateUrl: './searchbar.component.html',
  styleUrl: './searchbar.component.scss'
})
export class SearchbarComponent {
  @Input() searchQuery: string = '';

  search(){
    
  }
}
