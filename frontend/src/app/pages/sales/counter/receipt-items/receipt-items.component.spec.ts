import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReceiptItemsComponent } from './receipt-items.component';

describe('ReceiptItemsComponent', () => {
  let component: ReceiptItemsComponent;
  let fixture: ComponentFixture<ReceiptItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceiptItemsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReceiptItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
