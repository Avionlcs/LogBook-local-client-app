import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { HeaderComponent } from '../../../components/header/header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { ItemsComponent } from './items/items.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RolesItemsComponent } from './roles/items.component';
import { ActivityWatcherComponent } from '../../../components/activity-watcher/activity-watcher.component';

@Component({
  selector: 'app-access-control',
  standalone: true,
  imports: [
    HeaderComponent,
    SidebarComponent,
    ItemsComponent,
    HttpClientModule,
    CommonModule,
    RolesItemsComponent,
    ActivityWatcherComponent
  ],
  templateUrl: './access-control.component.html',
  styleUrls: ['./access-control.component.scss']
})
export class AccessControlComponent implements OnInit {
  usersList: any[] = [];
  selectedCategory = 'user';

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadUsers();
  }

  onSelectCategory(nm: string) {
    this.selectedCategory = nm;
  }

  onClickItem(event: any) { }

  loadUsers() {
    this.http.get('/sort_by?entity=user&sort_by=created&limit=20').subscribe({
      next: (response: any) => {
        if (Array.isArray(response) && response.length) {
          this.usersList = response;
        }
      },
      error: (error: any) => console.error('Error fetching users:', error)
    });
  }

  onRefreshTriggered() {
    this.loadUsers();
  }
}
