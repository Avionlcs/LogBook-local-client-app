import { Injectable, Inject, Optional } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AriaAnnouncerService {
  private liveElement: HTMLElement | null = null;

  constructor(@Optional() @Inject('DOCUMENT') private document: Document) {
    this.createLiveRegion();
  }

  private createLiveRegion(): void {
    if (this.document) {
      const el = this.document.createElement('div');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      el.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      this.document.body.appendChild(el);
      this.liveElement = el;
    }
  }

  announce(message: string): void {
    if (this.liveElement) {
      this.liveElement.textContent = '';
      setTimeout(() => {
        if (this.liveElement) {
          this.liveElement.textContent = message;
        }
      }, 100);
    }
  }

  announceShortcut(keys: string[], action: string): void {
    this.announce(`${action}: ${keys.join(' + ')}`);
  }
}