import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-generate-receipt',
  standalone: true,
  templateUrl: './generate-receipt.component.html',
  styleUrl: './generate-receipt.component.scss'
})
export class GenerateReceiptComponent {
  @Input() sale: any;
}
