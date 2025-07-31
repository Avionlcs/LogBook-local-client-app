import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ItemComponent } from './item/item.component';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [ItemComponent, CommonModule, HttpClientModule],
  templateUrl: './items.component.html',
  styleUrl: './items.component.scss'
})
export class ItemsComponent {
  @Input() items: any[] = [];
  @Input() onClickEnabled: any;
  @Output() forwardCloneItem = new EventEmitter<any>();
  @Output() forwardOnClickItem = new EventEmitter<any>();
  roles: any[] = [];

  constructor(private http: HttpClient) { }

  handleCloneFromGrandchild(item: any) {
    this.forwardCloneItem.emit(item);
  }

  ngOnInit() {
    // this.loadRoles();
  }

  loadRoles() {
    const receiptsUrl = '/sort_by?entity=roles&sort_by=created&limit=2000';
    this.http.get(receiptsUrl).subscribe({
      next: (response: any) => {
        this.roles = response || [];
      },
      error: (error: any) => {
        console.error('Error fetching receipts:', error);
      }
    });
  }

  handleOnClickFromGrandchild(item: any) {
    this.forwardOnClickItem.emit(item);
  }
}
