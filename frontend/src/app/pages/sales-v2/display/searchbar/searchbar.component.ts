import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './searchbar.component.html',
  styleUrl: './searchbar.component.scss'
})
export class SearchbarComponent {
  searchQuery: string = '';

  @Output() searchValueChange = new EventEmitter<string>();

  onInputChange() {
    this.searchValueChange.emit(this.searchQuery);
  }
}
