export class SearchbarKeyboardHandler {
  private lastTypedAt = 0; // timestamp of last key press
  private backspaceTimer?: number;

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
      (activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable ||
        (activeElement.tagName === 'INPUT' &&
          activeElement.id !== 'search-input'))
    ) {
      return;
    }

    if (event.shiftKey) return;

    const now = Date.now();
    const timeSinceLast = now - this.lastTypedAt;
    this.lastTypedAt = now;

    let query = this.getQuery();

    // If last typing was more than 2s ago → clear before new input
    if (timeSinceLast > 2000) {
      query = '';
    }

    // Backspace handling
    if (event.key === 'Backspace') {
      if (event.type === 'keydown') {
        // clear any previous timer first
        if (this.backspaceTimer) {
          clearTimeout(this.backspaceTimer);
          this.backspaceTimer = undefined;
        }

        // delete one char immediately
        query = query.slice(0, -1);
        this.setQuery(query);
        this.onUpdate(query);

        // schedule full clear if held >500ms
        this.backspaceTimer = window.setTimeout(() => {
          query = '';
          this.setQuery(query);
          this.onUpdate(query);
          this.backspaceTimer = undefined; // reset properly
        }, 500);
      }

      if (event.type === 'keyup' && this.backspaceTimer) {
        clearTimeout(this.backspaceTimer);
        this.backspaceTimer = undefined;
      }

      return;
    }

    // Append normal character keys
    if (event.key.length === 1) {
      if (!(event.key === '+' || event.key === '-')) {
        query += event.key;
        this.setQuery(query);
        this.onUpdate(query);
      }
    }
  }
}
