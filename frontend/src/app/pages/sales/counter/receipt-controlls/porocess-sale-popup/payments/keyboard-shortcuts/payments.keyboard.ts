import { PaymentsState } from '../payments.state';
import { PaymentMethods } from '../payments.methods';
import { KeyboardBuffer } from './keyboard-buffer';
import { KeyboardNavigation } from './keyboard-navigation';

export class PaymentsKeyboard {
  private buffer: KeyboardBuffer;
  private navigation: KeyboardNavigation;
  private methods: PaymentMethods; // 👈 keep reference

  constructor(state: PaymentsState, methods: PaymentMethods) {
    this.buffer = new KeyboardBuffer(state, methods);
    this.navigation = new KeyboardNavigation(methods);
    this.methods = methods;
  }

  handle(event: KeyboardEvent): boolean {
    switch (event.key) {
      // 🔹 navigation keys
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.navigation.moveRight();
        this.buffer.resetOnMethodChange();
        return true;

      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.navigation.moveLeft();
        this.buffer.resetOnMethodChange();
        return true;

      default:
        // 🔹 typing only works for cash
        if (this.methods.active === 'cash') {
          if (/^\d$/.test(event.key)) {
            this.buffer.addDigit(event.key);
            return true;
          }
          if (event.key === 'Backspace') {
            this.buffer.backspace();
            return true;
          }
          if (event.key === 'Escape') {
            this.buffer.clear();
            return true;
          }
        }

        return false;
    }
  }
}
