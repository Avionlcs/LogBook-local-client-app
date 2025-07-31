import { Component, EventEmitter, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { fromEvent, Subscription, debounceTime } from 'rxjs';

@Component({
  selector: 'app-activity-watcher',
  standalone: true,
  template: ''
})
export class ActivityWatcherComponent implements OnInit, OnDestroy {
  @Output() refresh = new EventEmitter<void>();

  private activitySubscriptions: Subscription[] = [];
  private lastRefreshTime = 0;
  private readonly REFRESH_THROTTLE_MS = 10000;
  private readonly IDLE_TIMEOUT_MS = 5000;
  private activityTimeout: any;
  private isIdle = false;

  constructor(private ngZone: NgZone) { }

  ngOnInit() {
    this.setupActivityWatcher();
  }

  ngOnDestroy() {
    this.activitySubscriptions.forEach(sub => sub.unsubscribe());
    if (this.activityTimeout) clearTimeout(this.activityTimeout);
  }

  private setupActivityWatcher() {
    this.ngZone.runOutsideAngular(() => {
      const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
      events.forEach(event => {
        const sub = fromEvent(window, event).pipe(debounceTime(100)).subscribe(() => {
          this.handleUserActivity();
        });
        this.activitySubscriptions.push(sub);
      });
    });
    this.resetIdleTimer();
  }

  private handleUserActivity() {
    if (this.isIdle) {
      this.isIdle = false;
      this.ngZone.run(() => this.refreshDataIfAllowed());
    }
    this.resetIdleTimer();
  }

  private resetIdleTimer() {
    if (this.activityTimeout) clearTimeout(this.activityTimeout);
    this.activityTimeout = setTimeout(() => {
      this.isIdle = true;
    }, this.IDLE_TIMEOUT_MS);
  }

  private refreshDataIfAllowed() {
    const now = Date.now();
    if (now - this.lastRefreshTime > this.REFRESH_THROTTLE_MS) {
      this.lastRefreshTime = now;
      this.refresh.emit();
    }
  }
}