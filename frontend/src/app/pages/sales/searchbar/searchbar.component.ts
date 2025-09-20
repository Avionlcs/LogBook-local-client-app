import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';
import { SearchbarKeyboardHandler } from './searchbar-keyboard';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.scss']
})
export class SearchbarComponent {
  @Input() searchQuery: string = '';
  @Output() searchQueryChange = new EventEmitter<string>();

  private keyboardHandler = new SearchbarKeyboardHandler(
    () => this.searchQuery,
    (q: string) => this.searchQuery = q,
    (q: string) => this.searchQueryChange.emit(q)
  );

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.keyboardHandler.handle(event);
  }

  search(){
   this.searchQueryChange.emit(this.searchQuery);
  }
}
