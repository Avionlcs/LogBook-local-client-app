import { PaymentsState } from '../payments.state';
import { PaymentMethods } from '../payments.methods';

export class KeyboardBuffer {
  private buffer = '';

  constructor(
    private state: PaymentsState,
    private methods: PaymentMethods
  ) {}

  addDigit(digit: string) {
    this.buffer += digit;
    this.updateState();
  }

  backspace() {
    this.buffer = this.buffer.slice(0, -1);
    this.updateState();
  }

  clear() {
    this.buffer = '';
    this.updateState();
  }

  resetOnMethodChange() {
    this.buffer = '';
  }

  private updateState() {
    const amount = parseInt(this.buffer, 10) || 0;
    this.state.update(this.methods.active, amount);
  }
}
