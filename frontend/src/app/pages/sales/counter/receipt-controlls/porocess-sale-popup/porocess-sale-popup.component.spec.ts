import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PorocessSalePopupComponent } from './porocess-sale-popup.component';

describe('PorocessSalePopupComponent', () => {
  let component: PorocessSalePopupComponent;
  let fixture: ComponentFixture<PorocessSalePopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PorocessSalePopupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PorocessSalePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
