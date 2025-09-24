import { Component, Input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-display-remaining-amount',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './display-remaining-amount.component.html',
  styleUrl: './display-remaining-amount.component.scss',
  providers: [CurrencyPipe]
})
export class DisplayRemainingAmountComponent {
  @Input() amount = 0;

  constructor(private currencyPipe: CurrencyPipe) {}

  get isRemaining(): boolean {
    return this.amount > 0;
  }

  get displayValue(): string {
    const absValue = Math.abs(this.amount);
    const formatted = this.currencyPipe.transform(
      absValue,
      'LKR ',         
      'symbol',      
      '1.2-2',       
      'en-LK'         
    ) ?? '';

    if (this.amount > 0) {
      // show as negative (red)
      return `- ${formatted}`;
    } else {
      // show as positive with plus sign (green)
      return `+ ${formatted}`;
    }
  }
}
