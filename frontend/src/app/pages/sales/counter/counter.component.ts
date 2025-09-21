import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TimeAgoPipe } from '../display/inventory-items-list/inventory-item/time-ago.pipe';
import { SelectCustomerComponent } from './select-customer/select-customer.component';
import { ReceiptItemsComponent } from './receipt-items/receipt-items.component';
import { ReceiptControllsComponent } from './receipt-controlls/receipt-controlls.component';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [SelectCustomerComponent, ReceiptItemsComponent, ReceiptControllsComponent, TimeAgoPipe],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.scss'
})
export class CounterComponent {
  @Input() sale: any = {
    id: 1,
    public_id: "1",
    seller_user_id: "USER-001",
    customer_user_id: "CUST-001",

    card_payment_amount: 1500.00,
    card_payment_reference: "CARD-REF-9988",
    cash_payment_amount: 500.00,
    qr_payment_amount: 0,
    qr_payment_reference: null,
    loyalty_claimed_amount: 0,
    loyalty_reference: null,

    total_paid_amount: 2000.00,
    total_offer_discount: 450.00,
    total_amount: 2450.00,

    status: "processing",
    payment_method: "mixed",
    created_at: new Date(),
    updated_at: new Date(),

    items: [
      { id: 'ITEM-001', barcode: '8901001', name: 'Coca Cola 1L', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/coca_cola.jpg', qty: 2, sale_price: 350, total_price: 700 },
      { id: 'ITEM-002', barcode: '8901002', name: 'Sunlight Soap', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/sunlight.jpg', qty: 3, sale_price: 120, total_price: 360 },
      { id: 'ITEM-003', barcode: '8901003', name: 'Anchor Milk Powder 1kg', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/anchor.jpg', qty: 1, sale_price: 1250, total_price: 1250 },
      { id: 'ITEM-004', barcode: '8901004', name: 'Kist Jam 500g', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/jam.jpg', qty: 2, sale_price: 600, total_price: 1200 },
      { id: 'ITEM-005', barcode: '8901005', name: 'Munchee Lemon Puff', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/lemonpuff.jpg', qty: 5, sale_price: 150, total_price: 750 },
      { id: 'ITEM-006', barcode: '8901006', name: 'Prima Noodles 400g', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/noodles.jpg', qty: 4, sale_price: 320, total_price: 1280 },
      { id: 'ITEM-007', barcode: '8901007', name: 'Lipton Tea 200g', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/tea.jpg', qty: 2, sale_price: 450, total_price: 900 },
      { id: 'ITEM-008', barcode: '8901008', name: 'Kist Tomato Sauce 300ml', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/sauce.jpg', qty: 1, sale_price: 350, total_price: 350 },
      { id: 'ITEM-009', barcode: '8901009', name: 'Elephant House Ice Cream 1L', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/icecream.jpg', qty: 1, sale_price: 950, total_price: 950 },
      { id: 'ITEM-010', barcode: '8901010', name: 'Rice Samba 5kg', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/samba.jpg', qty: 1, sale_price: 1800, total_price: 1800 },
      { id: 'ITEM-011', barcode: '8901011', name: 'CIC Basmathi Rice 5kg', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/basmathi.jpg', qty: 1, sale_price: 2500, total_price: 2500 },
      { id: 'ITEM-012', barcode: '8901012', name: 'Maliban Cream Crackers', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/crackers.jpg', qty: 3, sale_price: 400, total_price: 1200 },
      { id: 'ITEM-013', barcode: '8901013', name: 'Samaposha 400g', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/samaposha.jpg', qty: 2, sale_price: 280, total_price: 560 },
      { id: 'ITEM-014', barcode: '8901014', name: 'Surf Excel 1kg', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/surf.jpg', qty: 1, sale_price: 750, total_price: 750 },
      { id: 'ITEM-015', barcode: '8901015', name: 'Signal Toothpaste 120g', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/signal.jpg', qty: 3, sale_price: 180, total_price: 540 },
      { id: 'ITEM-016', barcode: '8901016', name: 'Lifebuoy Handwash 200ml', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/lifebuoy.jpg', qty: 2, sale_price: 350, total_price: 700 },
      { id: 'ITEM-017', barcode: '8901017', name: 'Dettol Soap 100g', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/dettol.jpg', qty: 6, sale_price: 140, total_price: 840 },
      { id: 'ITEM-018', barcode: '8901018', name: 'Nestomalt 400g', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/nestomalt.jpg', qty: 1, sale_price: 600, total_price: 600 },
      { id: 'ITEM-019', barcode: '8901019', name: 'Milo Packet 200g', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/milo.jpg', qty: 2, sale_price: 550, total_price: 1100 },
      { id: 'ITEM-020', barcode: '8901020', name: 'Kandos Chocolate 90g', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1690000000/kandos.jpg', qty: 4, sale_price: 250, total_price: 1000 }
    ],

    offers: [
      { id: 1, public_id: "1", sale_public_id: "1", offer_code: "DISC10", offer_description: "10% off on groceries", discount_amount: 200 },
      { id: 2, public_id: "2", sale_public_id: "1", offer_code: "LOYAL50", offer_description: "Loyalty discount", discount_amount: 250 }
    ]
  };
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
