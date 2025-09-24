export class PaymentsState {
  cashPaid = 0;
  cardPaid = 0;
  qrPaid = 0;
  totalPaid = 0;
  remainingAmount = 0;

  constructor(private getTotalAmount: () => number) {}

  update(method: 'cash' | 'card' | 'qr', amount: number) {
    if (method === 'cash') this.cashPaid = amount;
    if (method === 'card') this.cardPaid = amount;
    if (method === 'qr') this.qrPaid = amount;
    this.recalculate();
  }

  recalculate() {
    this.totalPaid = this.cashPaid + this.cardPaid + this.qrPaid;
    this.remainingAmount = (this.getTotalAmount() || 0) - this.totalPaid;
  }
}
