import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { HeaderComponent } from '../../../components/header/header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { ItemsComponent } from './items/items.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RolesItemsComponent } from './roles/items.component';
import { fromEvent, Subscription, debounceTime } from 'rxjs';

@Component({
  selector: 'app-access-control',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, ItemsComponent, HttpClientModule, CommonModule, RolesItemsComponent],
  templateUrl: './access-control.component.html',
  styleUrls: ['./access-control.component.scss']
})
export class AccessControlComponent implements OnInit, OnDestroy {
  usersList: any = [];
  selectedCategory: string = 'users';

  private activitySubscriptions: Subscription[] = [];
  private lastRefreshTime: number = 0;
  private readonly REFRESH_THROTTLE_MS = 10000;
  private readonly IDLE_TIMEOUT_MS = 5000;

  private activityTimeout: any;
  private isIdle: boolean = false;

  constructor(private http: HttpClient, private router: Router, private ngZone: NgZone) { }

  ngOnInit() {
    this.loadUsers();
    this.setupActivityWatcher();
  }

  ngOnDestroy() {
    this.activitySubscriptions.forEach(sub => sub.unsubscribe());
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }
  }

  onSelectCategory(nm: string) {
    this.selectedCategory = nm;
  }

  onClickItem(event: any) {

  }

  loadUsers() {
    const receiptsUrl = '/read/user/0/99999999999999999999';
    this.http.get(receiptsUrl).subscribe({
      next: (response: any) => {
        this.usersList = response.slice().sort((a: any, b: any) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()).slice(0, 30);
        console.log('Users list refreshed:', this.usersList);
      },
      error: (error: any) => {
        console.error('Error fetching users:', error);
      }
    });
  }

  private setupActivityWatcher(): void {
    this.ngZone.runOutsideAngular(() => {
      const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart'];

      activityEvents.forEach(event => {
        const sub = fromEvent(window, event)
          .pipe(debounceTime(100))
          .subscribe(() => {
            this.handleUserActivity();
          });
        this.activitySubscriptions.push(sub);
      });
    });

    this.resetIdleTimer();
  }

  private handleUserActivity(): void {
    if (this.isIdle) {
      console.log('User activity detected after idle period.');
      this.isIdle = false;
      this.ngZone.run(() => {
        this.refreshDataIfAllowed();
      });
    }
    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }
    this.activityTimeout = setTimeout(() => {
      this.isIdle = true;
      console.log('User is now idle.');
    }, this.IDLE_TIMEOUT_MS);
  }

  private refreshDataIfAllowed(): void {
    const now = Date.now();
    if (now - this.lastRefreshTime > this.REFRESH_THROTTLE_MS) {
      console.log('Refreshing data due to user activity...');
      this.lastRefreshTime = now;
      this.loadUsers();
    } else {
      console.log('Refresh throttled: Too soon to refresh again.');
    }
  }
}