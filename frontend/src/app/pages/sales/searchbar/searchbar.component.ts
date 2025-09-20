import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.scss']
})
export class SearchbarComponent {
  @Input() searchQuery: string = '';
  @Output() searchQueryChange = new EventEmitter<string>();

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const activeElement = document.activeElement as HTMLElement;

    // Skip if typing inside an input/textarea/contenteditable
    if (activeElement &&
        (activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.isContentEditable)) {
      return;
    }

    // Clear search with Shift + Backspace
    if (event.key === 'Backspace' && event.shiftKey) {
      this.searchQuery = '';
      this.search();
      return; // prevent falling through to normal Backspace
    }

    // Normal Backspace
    if (event.key === 'Backspace') {
      this.searchQuery = this.searchQuery.slice(0, -1);
      this.search();
      return;
    }

    // Append character keys
    if (event.key.length === 1) {
      this.searchQuery += event.key;
      this.search();
    }
  }

  search() {
    this.searchQueryChange.emit(this.searchQuery);
  }
}
