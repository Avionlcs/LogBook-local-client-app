import { UpdateItemQuantityService } from './update-item-quantity.service';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface QtyHandlerDeps {
  saleId: any;
  getItemById: (itemId: any) => any | undefined;
  onPatched: (res: any) => void;
  onError?: (err: any) => void;
}

export class UpdateItemQuantityHandler {
  private pending = new Set<any>();

  constructor(private svc: UpdateItemQuantityService, private deps: QtyHandlerDeps) {}

  inc(itemId: any, amount: any = 1, mode: any = 'strict'): Observable<any> {
    if (this.isLocked(itemId)) return of(this.lockedResp());
    this.lock(itemId);
    return this.svc.inc(this.deps.saleId, itemId, amount, mode).pipe(
      tap(res => this.deps.onPatched(res)),
      catchError(err => this.handleErr(itemId, err)),
      tap(() => this.unlock(itemId))
    );
  }

  dec(itemId: any, amount: any = 1, forceRemove: any = false): Observable<any> {
    if (this.isLocked(itemId)) return of(this.lockedResp());
    this.lock(itemId);
    return this.svc.dec(this.deps.saleId, itemId, amount, forceRemove).pipe(
      tap(res => this.deps.onPatched(res)),
      catchError(err => this.handleErr(itemId, err)),
      tap(() => this.unlock(itemId))
    );
  }

  setQty(itemId: any, nextQty: any, mode: any = 'strict'): Observable<any> {
    const rawItem: any = this.deps.getItemById(itemId);
    const current = Number(rawItem?.quantity ?? 0);
    if (this.isLocked(itemId)) return of(this.lockedResp());
    this.lock(itemId);
    return this.svc.setQty(this.deps.saleId, itemId, current, nextQty, mode).pipe(
      tap(res => this.deps.onPatched(res)),
      catchError(err => this.handleErr(itemId, err)),
      tap(() => this.unlock(itemId))
    );
  }

  private handleErr(itemId: any, err: any) {
    this.deps.onError?.(err);
    this.unlock(itemId);
    return of(err);
  }

  private isLocked(id: any) { return this.pending.has(id); }
  private lock(id: any) { this.pending.add(id); }
  private unlock(id: any) { this.pending.delete(id); }

  private lockedResp(): any {
    return { success: false, error: 'pending', item: null, applied: 0, remaining_stock: NaN };
  }
}
