import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiplePricesComponent } from './multiple-prices.component';

describe('MultiplePricesComponent', () => {
  let component: MultiplePricesComponent;
  let fixture: ComponentFixture<MultiplePricesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiplePricesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultiplePricesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
