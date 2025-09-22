import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UpdateItemQuantityService {
  constructor(
    private http: HttpClient,
    @Inject('API_BASE_URL') private baseUrl: string
  ) {}

  adjust(body: any): Observable<any> {
    return this.http
      .post<any>(`/api/sales/item/update-quantity`, body)
      .pipe(
        catchError((e: HttpErrorResponse) =>
          throwError(() => (e.error ?? { success: false, error: e.message }))
        )
      );
  }

  inc(saleid: any, itemid: any, amount: any = 1, mode: any = 'strict'): Observable<any> {
    return this.adjust({ saleid, itemid, amount, incordec: 'inc', mode });
  }

  dec(saleid: any, itemid: any, amount: any = 1, forceRemove: any = false): Observable<any> {
    return this.adjust({ saleid, itemid, amount, incordec: 'dec', forceRemove });
  }

  setQty(saleid: any, itemid: any, currentQty: any, nextQty: any, mode: any = 'strict'): Observable<any> {
    const delta = Number(nextQty) - Number(currentQty);
    if (Number(nextQty) <= 0) return this.dec(saleid, itemid, Math.max(Number(currentQty) || 0, 1), true);
    if (delta > 0)   return this.inc(saleid, itemid, delta, mode);
    if (delta < 0)   return this.dec(saleid, itemid, Math.abs(delta), false);
    return this.adjust({ saleid, itemid, amount: 0, incordec: 'inc' });
  }
}
