// keyboard-shortcuts.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService {
    private buffer: string = '';
    private shortcuts$ = new Subject<{ key: string; buffer?: string }>();
    private shiftPressed = false;
    private timeout: any = null;

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
        // --- handle shift ---
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
            if (!this.shiftPressed) {
                this.shiftPressed = true;
                this.emit('ShiftDown');
            }
        }

        if (!this.shiftPressed) return;

        // --- nav / actions by code ---
        if (
            event.code === 'ArrowUp' ||
            event.code === 'ArrowDown' ||
            event.code === 'ArrowLeft' ||
            event.code === 'ArrowRight' ||
            event.code === 'Delete' ||
            event.code === 'NumpadAdd' ||
            event.code === 'NumpadSubtract' ||
            event.code === 'Equal' || // '=' / '+' key
            event.code === 'Minus'    // '-' key
        ) {
            this.emit(event.code);
            return;
        }

        // --- digits (top row or numpad) ---
        const digit = this.mapDigit(event.code);
        if (digit !== null) {
            this.buffer += digit;
            if (this.timeout) clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.emit('number', this.buffer);
                this.timeout = null;
            }, 800);
            return;
        }

        // --- confirm (enter) ---
        if ((event.code === 'Enter' || event.code === 'NumpadEnter') && this.buffer) {
            this.emit('confirm', this.buffer);
            this.buffer = '';
        }
    }

    private handleKeyUp(event: KeyboardEvent) {
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
            this.shiftPressed = false;
            if (this.timeout) clearTimeout(this.timeout);
            if (this.buffer) {
                this.emit('number', this.buffer);
                this.buffer = '';
            }
            this.emit('ShiftUp');
        }
    }

    private mapDigit(code: string): string | null {
        if (code.startsWith('Digit')) return code.replace('Digit', '');
        if (code.startsWith('Numpad')) return code.replace('Numpad', '');
        return null;
    }

    private emit(key: string, buffer?: string) {
        this.ngZone.run(() => {
            this.shortcuts$.next({ key, buffer });
        });
    }
}