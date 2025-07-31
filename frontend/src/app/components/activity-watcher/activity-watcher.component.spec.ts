import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityWatcherComponent } from './activity-watcher.component';

describe('ActivityWatcherComponent', () => {
  let component: ActivityWatcherComponent;
  let fixture: ComponentFixture<ActivityWatcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityWatcherComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityWatcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
