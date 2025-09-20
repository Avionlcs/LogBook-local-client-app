export class SearchbarKeyboardHandler {
  private lastTypedAt = 0; // timestamp of last key press

  constructor(
    private getQuery: () => string,
    private setQuery: (q: string) => void,
    private onUpdate: (q: string) => void
  ) {}

  handle(event: KeyboardEvent) {
    const activeElement = document.activeElement as HTMLElement;

    // Ignore if typing inside form fields
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable)
    ) {
      return;
    }

    // 🚫 Reserve Shift+S for mode change
    if (event.key.toLowerCase() === 's' && event.shiftKey) {
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - this.lastTypedAt;
    this.lastTypedAt = now;

    let query = this.getQuery();

    // ⏱ If last typing was more than 2s ago → clear before new input
    if (timeSinceLast > 2000) {
      query = '';
    }

    // Shift + Backspace => clear immediately
    if (event.key === 'Backspace' && event.shiftKey) {
      query = '';
      this.setQuery(query);
      this.onUpdate(query);
      return;
    }

    // Normal Backspace
    if (event.key === 'Backspace') {
      query = query.slice(0, -1);
      this.setQuery(query);
      this.onUpdate(query);
      return;
    }

    // Append normal character keys
    if (event.key.length === 1) {
      query += event.key;
      this.setQuery(query);
      this.onUpdate(query);
    }
  }
}
