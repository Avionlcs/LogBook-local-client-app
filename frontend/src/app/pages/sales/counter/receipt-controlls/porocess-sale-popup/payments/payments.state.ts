import { evaluateFormula } from "./evaluateFormula/evaluateFormula";

export class PaymentsState {
  cashPaid = 0;
  cardPaid = 0;
  qrPaid = 0;
  totalPaid = 0;
  totalPaidDisplay = '';
  remainingAmount = 0;

  constructor(private getTotalAmount: () => number) {}

  update(method: 'cash' | 'card' | 'qr', amount: any) {
    var {value, displayValue}  = evaluateFormula(amount);
    this.totalPaidDisplay = displayValue;
    if (method === 'cash') this.cashPaid = value || 0;
    if (method === 'card') this.cardPaid = value || 0;
    if (method === 'qr') this.qrPaid = value || 0;
    this.recalculate();
  }

  recalculate() {
    this.totalPaid = this.cashPaid + this.cardPaid + this.qrPaid;
    this.remainingAmount = (this.getTotalAmount() || 0) - this.totalPaid;
  }
}
