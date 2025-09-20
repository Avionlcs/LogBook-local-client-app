import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';


@Component({
  selector: 'app-inventory-item',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './inventory-item.component.html',
  styleUrls: ['./inventory-item.component.scss']
})
export class InventoryItemComponent  {
  @Input() item: any;
  imageSrc: string = 'assets/placeholder.png';


}
