// searchbar-keyboard.ts
export class SearchbarKeyboardHandler {
  constructor(
    private getQuery: () => string,
    private setQuery: (q: string) => void,
    private onUpdate: (q: string) => void
  ) {}

  handle(event: KeyboardEvent) {
    const activeElement = document.activeElement as HTMLElement;

    // Ignore if typing inside form fields
    if (activeElement &&
        (activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.isContentEditable)) {
      return;
    }

    let query = this.getQuery();

    // Shift + Backspace => clear
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
