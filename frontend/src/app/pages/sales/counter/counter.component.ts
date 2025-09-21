import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TimeAgoPipe } from '../display/inventory-items-list/inventory-item/time-ago.pipe';
import { SelectCustomerComponent } from './select-customer/select-customer.component';
import { ReceiptItemsComponent } from './receipt-items/receipt-items.component';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [SelectCustomerComponent, ReceiptItemsComponent, CounterComponent, TimeAgoPipe],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.scss'
})
export class CounterComponent {
  @Input() sale: any = {};
  @Output() saleProcess = new EventEmitter<any>();

  onSelectCustomer(customer: any) {
    this.sale.customer = customer;
    this.saleProcess.emit(this.sale);
  }

  onChangeItems(items: any) {
    this.sale.items = items;
    this.saleProcess.emit(this.sale);
  }

  onUpdateSale(sale: any) {
    this.sale = sale;
    this.saleProcess.emit(this.sale);
  }
}
