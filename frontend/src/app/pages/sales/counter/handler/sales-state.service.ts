import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class SalesStateService {
    private readonly storageKey = 'activeSaleId';

    constructor(private http: HttpClient) { }

    getSaleId() {
        const raw = localStorage.getItem(this.storageKey);

        // normalize value
        const saleId = raw ?? '';  // null → '', undefined → ''

        if (!saleId || saleId === 'undefined') {
            // don’t even call backend if bad value
            return of('');
        }

        return this.http.get<{ success: boolean; saleId?: string }>(`/api/sales/verify/${saleId}`).pipe(
            map(res => (res.success ? saleId : '')),
            catchError(() => of(''))
        );
    }



    setSaleId(saleId: string): void {
        console.log('setSaleId&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&', saleId);
        
        localStorage.setItem(this.storageKey, saleId);
    }

    clearSale(): void {
        localStorage.removeItem(this.storageKey);
    }
}
