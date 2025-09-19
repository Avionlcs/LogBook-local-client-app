import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReceiptControllsComponent } from './receipt-controlls.component';

describe('ReceiptControllsComponent', () => {
  let component: ReceiptControllsComponent;
  let fixture: ComponentFixture<ReceiptControllsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceiptControllsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReceiptControllsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
