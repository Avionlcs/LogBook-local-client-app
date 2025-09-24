import { PaymentsState } from '../payments.state';
import { PaymentMethods } from '../payments.methods';
import { KeyboardBuffer } from './keyboard-buffer';
import { KeyboardNavigation } from './keyboard-navigation';

enum InputMode {
  Normal,    // digits + + - * / z
  Expanded   // digits + + - only
}

export class PaymentsKeyboard {
  static consumingInput = true; 

  private buffer: KeyboardBuffer;
  private navigation: KeyboardNavigation;
  private methods: PaymentMethods;
  private mode: InputMode = InputMode.Normal;

  constructor(state: PaymentsState, methods: PaymentMethods) {
    this.buffer = new KeyboardBuffer(state, methods);
    this.navigation = new KeyboardNavigation(methods);
    this.methods = methods;
  }

  // call this after billMapExpand runs → lock to Expanded mode
  lockExpandedMode() {
    this.mode = InputMode.Expanded;
  }

  handle(event: KeyboardEvent): boolean {
    PaymentsKeyboard.consumingInput = true;

    switch (event.key) {
      // 🔹 navigation
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
          if (this.isAllowedKey(event.key)) {
            this.buffer.addDigit(event.key.toLowerCase()); // normalize z/Z
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

  private isAllowedKey(key: string): boolean {
    if (this.mode === InputMode.Normal) {
      return /^[0-9+\-*/zZ]$/.test(key);
    }
    if (this.mode === InputMode.Expanded) {
      return /^[0-9+\-]$/.test(key);
    }
    return false;
  }
}
