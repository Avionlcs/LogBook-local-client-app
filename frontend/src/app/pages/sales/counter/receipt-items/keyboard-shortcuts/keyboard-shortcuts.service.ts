import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

export interface ShortcutEvent {
  key: string;
  buffer?: string;
}

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService {
  private buffer: string = '';
  private shortcuts$ = new Subject<ShortcutEvent>();
  private shiftPressed = false;

  constructor(private ngZone: NgZone) {
    this.listenToKeyboard();
  }

  get events$() {
    return this.shortcuts$.asObservable();
  }

  private listenToKeyboard() {
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('keydown', (event) => this.handleKeyDown(event));
      document.addEventListener('keyup', (event) => this.handleKeyUp(event));
    });
  }

  private handleKeyDown(event: KeyboardEvent) {

    if (event.shiftKey) {
      if (!this.shiftPressed) {
        this.shiftPressed = true;
        this.emit('ShiftDown');
      }
      //return;
    }

    if (!this.shiftPressed) return; // only active while shift is held

    if (event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'Delete' ||
        event.key === '+' ||
        event.key === '-') {
      this.emit(event.key);
      return;
    }

    if (/^[0-9]$/.test(event.key)) {
      this.buffer += event.key;
      this.emit('number', this.buffer);
      return;
    }

    if (event.key === 'Enter' && this.buffer) {
      this.emit('confirm', this.buffer);
      this.buffer = '';
    }
  }

  private handleKeyUp(event: KeyboardEvent) {
    if (event.key === 'Shift') {
      this.shiftPressed = false;
      this.emit('ShiftUp');
    }
  }

  private emit(key: string, buffer?: string) {
    this.ngZone.run(() => {
      this.shortcuts$.next({ key, buffer });
    });
  }
}
