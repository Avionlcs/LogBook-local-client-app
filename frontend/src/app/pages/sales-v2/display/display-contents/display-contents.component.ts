import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-display-contents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './display-contents.component.html',
  styleUrl: './display-contents.component.scss'
})
export class DisplayContentsComponent {
  displayMode: string = 'items';
}
