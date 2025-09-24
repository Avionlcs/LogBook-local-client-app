import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-display-remaining-amount',
  standalone: true,
  imports: [],
  templateUrl: './display-remaining-amount.component.html',
  styleUrl: './display-remaining-amount.component.scss'
})
export class DisplayRemainingAmountComponent {
  @Input() amount: number = 0;
}