import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class SalesStateService {
    private readonly storageKey = 'activeSaleId';

    getSaleId(): string {
        return localStorage.getItem(this.storageKey) || '';
    }


    setSaleId(saleId: string): void {
        localStorage.setItem(this.storageKey, saleId);
    }

    clearSale(): void {
        localStorage.removeItem(this.storageKey);
    }
}
