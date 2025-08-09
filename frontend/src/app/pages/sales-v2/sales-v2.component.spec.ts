import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesV2Component } from './sales-v2.component';

describe('SalesV2Component', () => {
  let component: SalesV2Component;
  let fixture: ComponentFixture<SalesV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
