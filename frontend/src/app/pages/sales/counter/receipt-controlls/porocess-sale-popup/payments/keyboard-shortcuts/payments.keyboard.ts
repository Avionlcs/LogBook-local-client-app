import { PaymentsState } from '../payments.state';
import { PaymentMethods } from '../payments.methods';
import { KeyboardBuffer } from './keyboard-buffer';
import { KeyboardNavigation } from './keyboard-navigation';

export class PaymentsKeyboard {
  static consumingInput = true; // 👈 global flag

  private buffer: KeyboardBuffer;
  private navigation: KeyboardNavigation;
  private methods: PaymentMethods;

  constructor(state: PaymentsState, methods: PaymentMethods) {
    this.buffer = new KeyboardBuffer(state, methods);
    this.navigation = new KeyboardNavigation(methods);
    this.methods = methods;
  }

  handle(event: KeyboardEvent): boolean {
    PaymentsKeyboard.consumingInput = true;
    switch (event.key) {
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

        PaymentsKeyboard.consumingInput = false;
        return false;
    }
  }
}
