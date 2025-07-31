import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../../../components/header/header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { ItemsComponent } from './items/items.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RolesItemsComponent } from './roles/items.component';

@Component({
  selector: 'app-access-control',
  standalone: true,
  imports: [
    HeaderComponent,
    SidebarComponent,
    ItemsComponent,
    HttpClientModule,
    CommonModule,
    RolesItemsComponent
  ],
  templateUrl: './access-control.component.html',
  styleUrls: ['./access-control.component.scss']
})
export class AccessControlComponent implements OnInit {
  usersList: any = [];
  rolesList: any = [];
  selectedCategory: string = 'users';

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadData();
  }

  onSelectCategory(nm: string) {
    this.selectedCategory = nm;
    this.loadData();
  }

  onClickItem(event: any) { }

  refreshUsers() {
    this.loadData();
  }


  private loadData() {
    const url = `/sort_by?entity=${this.selectedCategory}&sort_by=created&limit=20`;
    this.http.get(url).subscribe({
      next: (response: any) => {
        if (Array.isArray(response) && response.length > 0) {
          if (this.selectedCategory == 'roles') {
            this.rolesList = response;
          } else {
            this.usersList = response;
          }
          this.usersList = response;
        }
      },
      error: (error: any) => {
        console.error('Error fetching users:', error);
      }
    });
  }

}
