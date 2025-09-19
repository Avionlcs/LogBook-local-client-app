import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { ModalPopupComponent } from '../../../../../components/modal-popup/modal-popup.component';

@Component({
  selector: 'app-item',
  standalone: true,
  imports: [ModalPopupComponent, CommonModule, FormsModule],
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.scss'],
  providers: [DatePipe]  // Provide DatePipe if needed
})
export class ItemComponent {
  @Input() item: any;
  @Input() roles: any = [];
  @Input() onClickEnabled: boolean = false;
  modalVisible = { hash: '', value: false }
  edit = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  itemDeleted: boolean = false;

  @Output() cloneItem = new EventEmitter<any>();
  @Output() onSelectItem = new EventEmitter<any>();


  constructor(private http: HttpClient) { }

  ngOnInit() {
    if (!this.item.roles) {
      this.item.roles = [];
    }
  }

  loadRoles() {
    const receiptsUrl = '/sort_by?entity=roles&sort_by=created&limit=2000';
    this.http.get(receiptsUrl).subscribe({
      next: (response: any) => {
        console.log('Roles loaded::::::::::::::::::::::::::::::::: ', response);

        this.roles = response || [];
      },
      error: (error: any) => {
        console.error('Error fetching receipts:', error);
      }
    });
  }

  addRole = (pr: { id: string; name: string }) => {
    if (!this.item || typeof this.item !== 'object') {
      console.error('this.item is not defined or not an object:', this.item);
      return;
    }

    if (!this.item.roles) {
      this.item.roles = [];
    }

    // Check if the role is already included
    const index = this.item.roles.findIndex((role: any) => role.id === pr.id);

    if (index === -1) {
      // Role doesn't exist, add it
      this.item.roles.push(pr);
    } else {
      // Role exists, remove it
      this.item.roles.splice(index, 1);
    }
  };

  isRoleSelected(role: any): boolean {
    return this.item.roles.findIndex((r: any) => r.id === role.id) !== -1;
  }

  convertToTitleCase(text: any): string {
    if (typeof text !== 'string') {
      return '';
    }

    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getFormattedRoles(): string {
    if (!this.item || !this.item.roles) {
      return 'Select roles';
    }

    return this.item.roles?.length > 0
      ? this.item.roles.map((role: { name: string }) => this.convertToTitleCase(role.name)).join(', ')
      : 'Select roles';
  }

  onClone() {
    this.toggleModal();
    let clone = { ...this.item, cacheBrust: Date.now() };

    this.cloneItem.emit(clone);
  }

  toggleModal() {
    this.modalVisible = {
      hash: Date.now().toString(),
      value: this.modalVisible.value ? false : true
    };

  }

  isDropdownVisible: boolean = false;

  toggleDropdown() {
    this.loadRoles();
    this.isDropdownVisible = !this.isDropdownVisible;
  }

  toggleEdit() {
    this.toggleModal();
    this.edit = true;
    this.successMessage = null;
    this.errorMessage = null;
  }

  deleteItem() {
    const deleteUrl = `/delete/users/${this.item.id}`;
    this.http.delete(deleteUrl).subscribe({
      next: (response: any) => {

        this.modalVisible = { hash: '', value: false }
      },
      error: (error: any) => {
        console.error('Error deleting item', error);
      }
    });
    this.itemDeleted = true;
  }

  saveItem() {
    if (!this.item.phoneNumber) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }
    console.log('updateing role');

    const editUrl = `/update/user/${this.item.id}`;

    this.http.put(editUrl, this.item)
      .pipe(
        catchError((error) => {
          this.errorMessage = 'Failed to save item. Please try again later.';
          console.error('Error saving item:', error);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.successMessage = 'Item saved successfully!';
          this.edit = false;
          this.errorMessage = null;
          this.modalVisible = { hash: '', value: false }
        }
      });
  }

  getAdditionalFields(item: any): string[] {
    const knownFields = ['createdAt', 'last_updated', 'password', 'id', 'user', 'firstName', 'lastName', 'name', 'phoneNumber', 'roles'];
    return Object.keys(item).filter(key => !knownFields.includes(key));
  }
}
