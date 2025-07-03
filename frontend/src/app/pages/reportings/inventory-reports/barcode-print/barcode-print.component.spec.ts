import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarcodePrintComponent } from './barcode-print.component';

describe('BarcodePrintComponent', () => {
  let component: BarcodePrintComponent;
  let fixture: ComponentFixture<BarcodePrintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarcodePrintComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BarcodePrintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
