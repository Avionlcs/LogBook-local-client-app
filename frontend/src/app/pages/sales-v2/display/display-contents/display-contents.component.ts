import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ItemsComponent } from './items/items.component';
import { SalesComponent } from './sales/sales.component';

@Component({
  selector: 'app-display-contents',
  standalone: true,
  imports: [CommonModule, ItemsComponent, SalesComponent],
  templateUrl: './display-contents.component.html',
  styleUrl: './display-contents.component.scss'
})
export class DisplayContentsComponent {
  displayMode: string = 'items';

  @Input() keyword: string = '';
}
