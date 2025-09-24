import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-cash-payment',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './cash-payment.component.html',
  styleUrl: './cash-payment.component.scss',
  providers: [CurrencyPipe]
})
export class CashPaymentComponent {
  @Input() paid = 0;
  @Input() dValue = '';
  @Output() cashAmountUpdate = new EventEmitter<number>();

  displayValue = '';

  constructor(private currencyPipe: CurrencyPipe) { }

  ngOnInit() {
    this.formatValue();
  }

  ngOnChanges(changes: SimpleChanges) {
    // if parent updates the paid amount, reformat it
    if (changes['paid']) {
      this.formatValue();
    }
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;

    // remove everything except digits and dot
    const raw = input.value.replace(/[^\d.]/g, '');
    this.paid = parseFloat(raw) || 0;

    // emit updated value to parent
    this.cashAmountUpdate.emit(this.paid);

    // reformat as currency
    this.formatValue();
  }

  private formatValue() {
    this.displayValue =
      this.currencyPipe.transform(this.paid, 'LKR ', 'symbol', '1.2-2', 'en-LK') || '';
  }
}
