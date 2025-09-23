import { SalesApiService } from "./sales-api.service";
import { SalesStateService } from "./sales-state.service";
import { Observable } from 'rxjs';

export class SalesHandler {
  constructor(private api: SalesApiService, private state: SalesStateService) {}

  getSaleId(): Observable<string> {
    return this.state.getSaleId();
  }

  clearSale(): void {
    this.state.clearSale();
  }

  handleItemClick(
    item_id: string,
    quantity: number,
    unit_price: number,
    onOk?: (saleId: string, msg?: string) => void,
    onErr?: (err: any) => void
  ): void {
    if (!quantity || quantity <= 0) { onErr?.('Invalid quantity'); return; }
    const item = { item_id, quantity, unit_price };

    this.getSaleId().subscribe({
      next: saleId => {
        if (!saleId) {
          // start new sale
          this.api.initiateSale(item).subscribe({
            next: r => { 
              this.state.setSaleId(r.sale.public_id); 
              onOk?.(r.sale.public_id); 
            },
            error: e => onErr?.(e)
          });
        } else {
          // add to existing sale
          this.api.addItemToSale(saleId, item).subscribe({
            next: r => onOk?.(saleId, r.message),
            error: e => onErr?.(e)
          });
        }
      },
      error: e => onErr?.(e)
    });
  }

  getSale(
    onOk?: (sale: any) => void,
    onErr?: (err: any) => void
  ): void {
    this.getSaleId().subscribe({
      next: saleId => {
        if (!saleId) { onErr?.('No active sale'); return; }

        this.api.getSale(saleId).subscribe({
          next: sale => onOk?.(sale),
          error: e => onErr?.(e)
        });
      },
      error: e => onErr?.(e)
    });
  }
}
