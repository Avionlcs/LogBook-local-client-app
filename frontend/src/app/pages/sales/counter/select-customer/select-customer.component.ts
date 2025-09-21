import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-select-customer',
  standalone: true,
  imports: [],
  templateUrl: './select-customer.component.html',
  styleUrl: './select-customer.component.scss'
})
export class SelectCustomerComponent {
  @Input() customer: any = {};
  @Output() onSelectCustomer = new EventEmitter<any>();

}
