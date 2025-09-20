import { SalesApiService } from "./sales-api.service";
import { SalesStateService } from "./sales-state.service";

export class SalesHandler {
  constructor(private api: SalesApiService, private state: SalesStateService) {}

  get saleId(): string { return this.state.getSaleId(); }
  clearSale(): void { this.state.clearSale(); }

  handleItemClick(
    item_id: string,
    quantity: number,
    unit_price: number,
    onOk?: (saleId: string, msg?: string) => void,
    onErr?: (err: any) => void
  ): void {
    if (!quantity || quantity <= 0) { onErr?.('Invalid quantity'); return; }
    const item = { item_id, quantity, unit_price };

    if (!this.saleId) {
      this.api.initiateSale(item).subscribe({
        next: r => { this.state.setSaleId(r.sale_public_id); onOk?.(r.sale_public_id); },
        error: e => onErr?.(e)
      });
    } else {
      this.api.addItemToSale(this.saleId, item).subscribe({
        next: r => onOk?.(this.saleId, r.message),
        error: e => onErr?.(e)
      });
    }
  }
}
