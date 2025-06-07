import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreditTopUpComponent } from './credit-top-up.component';

describe('CreditTopUpComponent', () => {
  let component: CreditTopUpComponent;
  let fixture: ComponentFixture<CreditTopUpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditTopUpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreditTopUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
