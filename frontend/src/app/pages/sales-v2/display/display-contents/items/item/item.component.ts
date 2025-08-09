import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-in3-item',
  standalone: true,
  imports: [],
  templateUrl: './item.component.html',
  styleUrl: './item.component.scss'
})
export class ItemComponent {
  @Input() item: any = {};

}
