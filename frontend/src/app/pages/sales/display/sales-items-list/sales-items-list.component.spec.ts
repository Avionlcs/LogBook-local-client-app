import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesItemsListComponent } from './sales-items-list.component';

describe('SalesItemsListComponent', () => {
  let component: SalesItemsListComponent;
  let fixture: ComponentFixture<SalesItemsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesItemsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesItemsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
