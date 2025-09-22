// keyboard-shortcuts.handler.ts
export class KeyboardShortcutsHandler {
    constructor(
        private getItems: () => any[],
        private onChangeItems: (items: any[]) => void,
        private getSelectedIndex: () => number,
        private setSelectedIndex: (i: number) => void,
        private removeSelected: () => void,
        private adjustQuantity: (op: '+' | '-', buffer?: string) => void,
        private setQuantity: (qty: number) => void,
        private setShiftPressing: (state: boolean) => void
    ) { }

    handle(e: { key: string; buffer?: string }) {
        const items = this.getItems();
        if (!items || items.length === 0) return;

        switch (e.key) {
            // SHIFT
            case 'ShiftDown':
                this.setShiftPressing(true);
                if (this.getSelectedIndex() === -1) {
                    this.setSelectedIndex(items.length - 1);
                }
                break;

            case 'ShiftUp':
                this.setShiftPressing(false);
                this.onChangeItems(this.getItems());
                break;

            // NAVIGATION
            case 'ArrowUp':
                this.setSelectedIndex(Math.max(0, this.getSelectedIndex() - 1));
                break;

            case 'ArrowDown':
                this.setSelectedIndex(Math.min(items.length - 1, this.getSelectedIndex() + 1));
                break;

            // DELETE ROW
            case 'Delete':
                this.removeSelected();
                break;

            // QUANTITY ADJUST (+ / - from multiple codes)
            case 'NumpadAdd':
            case 'Equal':       // Shift+'=' → '+'
            case 'ArrowRight':
                this.adjustQuantity('+', e.buffer);
                break;

            case 'NumpadSubtract':
            case 'Minus':
            case 'ArrowLeft':
                this.adjustQuantity('-', e.buffer);
                break;

            // NUMERIC INPUT
            case 'number':
                if (e.buffer) {
                    const qty = parseInt(e.buffer, 10);
                    if (!isNaN(qty)) {
                        this.setQuantity(qty);
                    }
                }
                break;

            // CONFIRM ENTER
            case 'confirm':
                // reserved for snackbar/finalize later
                break;
        }
    }
}