import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InitiateRes { success: boolean; sale_public_id: string; }
export interface AddItemRes { success: boolean; message: string; }

@Injectable({ providedIn: 'root' })
export class SalesApiService {
    constructor(private http: HttpClient) { }

    initiateSale(item: { item_id: string; quantity: number; unit_price: number })
        : Observable<InitiateRes> {
        return this.http.post<InitiateRes>('/api/sales/initiate', { item });
    }
    getSale(sale_public_id: string): Observable<any> {
        return this.http.get<any>(`/api/sales/${sale_public_id}`);
    }
    addItemToSale(
        sale_id: string,
        item: { item_id: string; quantity: number; unit_price: number }
    ): Observable<AddItemRes> {
        return this.http.post<AddItemRes>('/api/sales/item/add', { sale_id, ...item });
    }
}
