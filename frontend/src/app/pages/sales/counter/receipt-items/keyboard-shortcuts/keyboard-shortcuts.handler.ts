import { ShortcutEvent } from "./keyboard-shortcuts.service";

export class KeyboardShortcutsHandler {
    constructor(
        private getItems: () => any[],
        private onChangeItems: (items: any[]) => void,
        private getSelectedIndex: () => number,
        private setSelectedIndex: (i: number) => void,
        private removeSelected: () => void,
        private adjustQuantity: (key: string, buffer?: string) => void,
        private setQuantity: (qty: number) => void,
        private setShiftPressing: (state: boolean) => void
    ) { }

    handle(e: ShortcutEvent) {
        const items = this.getItems();
        if (!items || items.length === 0) return;

        switch (e.key) {
            case 'ShiftDown':
                this.setShiftPressing(true);
                if (this.getSelectedIndex() === -1) {
                    this.setSelectedIndex(items.length - 1); // select last item only if none selected
                }
                break;

            case 'ShiftUp':
                this.setShiftPressing(false);
                break;

            case 'ArrowUp':
                this.setSelectedIndex(Math.max(0, this.getSelectedIndex() - 1));
                break;

            case 'ArrowDown':
                this.setSelectedIndex(Math.min(items.length - 1, this.getSelectedIndex() + 1));
                break;

            case 'Delete':
                this.removeSelected();
                break;

            case '+':
            case '-':
                this.adjustQuantity(e.key, e.buffer);
                break;

            case 'number':
                if (e.buffer) {
                    this.setQuantity(parseInt(e.buffer, 10));
                }
                break;

            case 'confirm':
                // could show snackbar/finalize input later
                break;
        }
    }
}
