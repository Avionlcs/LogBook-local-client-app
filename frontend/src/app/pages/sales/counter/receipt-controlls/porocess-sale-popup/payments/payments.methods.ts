export class PaymentMethods {
  readonly list: Array<'cash' | 'card' | 'qr'> = ['cash', 'card', 'qr'];
  index = 0;

  get active(): 'cash' | 'card' | 'qr' {
    return this.list[this.index];
  }

  change(offset: number) {
    this.index = (this.index + offset + this.list.length) % this.list.length;
  }
}
