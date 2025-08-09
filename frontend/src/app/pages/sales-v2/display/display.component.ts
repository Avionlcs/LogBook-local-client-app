import { Component } from '@angular/core';
import { SearchbarComponent } from './searchbar/searchbar.component';
import { DisplayContentsComponent } from './display-contents/display-contents.component';

@Component({
  selector: 'app-display',
  standalone: true,
  imports: [SearchbarComponent, DisplayContentsComponent],
  templateUrl: './display.component.html',
  styleUrl: './display.component.scss'
})
export class DisplayComponent {
  searchKeyword: string = '';

  onSearchKeywordChange(newKeyword: string) {
    this.searchKeyword = newKeyword;
  }
}
