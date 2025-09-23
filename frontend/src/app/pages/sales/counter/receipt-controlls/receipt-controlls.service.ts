import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReceiptControllsService {
  getItemCount(sale: any): number {
    return sale?.items?.length || 0;
  }

  getSubtotal(sale: any): number {
    return parseFloat(sale?.total_amount) ||
           sale?.items?.reduce((acc: number, item: any) => acc + (item.total_price || 0), 0) || 0;
  }

  getDiscount(sale: any): number {
    return parseFloat(sale?.total_offer_discount) || 0;
  }

  getTotal(sale: any): number {
    return this.getSubtotal(sale) - this.getDiscount(sale);
  }
}
