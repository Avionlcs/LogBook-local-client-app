import { PaymentMethods } from '../payments.methods';

export class KeyboardNavigation {
  constructor(private methods: PaymentMethods) {}

  moveLeft() {
    this.methods.change(-1);
  }

  moveRight() {
    this.methods.change(+1);
  }
}
