import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayRemainingAmountComponent } from './display-remaining-amount.component';

describe('DisplayRemainingAmountComponent', () => {
  let component: DisplayRemainingAmountComponent;
  let fixture: ComponentFixture<DisplayRemainingAmountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayRemainingAmountComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisplayRemainingAmountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
