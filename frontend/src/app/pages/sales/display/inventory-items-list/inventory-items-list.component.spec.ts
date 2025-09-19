import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryItemsListComponent } from './inventory-items-list.component';

describe('InventoryItemsListComponent', () => {
  let component: InventoryItemsListComponent;
  let fixture: ComponentFixture<InventoryItemsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryItemsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryItemsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
