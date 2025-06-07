import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ModalPopupComponent } from '../../../../components/modal-popup/modal-popup.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-inventory-item-table-row',
  standalone: true,
  imports: [ModalPopupComponent, CommonModule, FormsModule],
  templateUrl: './inventory-item-table-row.component.html',
  styleUrl: './inventory-item-table-row.component.scss'
})
export class InventoryItemTableRowComponent {
  @Input() item: any;

  modalVisible = { hash: '', value: false }
  edit = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  itemDeleted: boolean = false;

  @Output() cloneItem = new EventEmitter<any>();
  @Output() onDeleteItem = new EventEmitter<any>();
  @Output() onSelectItem = new EventEmitter<any>();

  constructor(private http: HttpClient) { }

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

  getTitle(): string {
    return this.edit ? `Edit ${this.item.name}` : this.item.name;
  }

  toggleEdit() {
    this.edit = !this.edit;
    this.successMessage = null;
    this.errorMessage = null;
  }

  deleteItem() {
    const deleteUrl = `/delete/inventory_items/${this.item.id}`;
    this.http.delete(deleteUrl).subscribe({
      next: (response: any) => {
        this.modalVisible = { hash: '', value: false }
        this.item = {
          name: '',
          stock: '',
          minStock: '',
          buyPrice: '',
          salePrice: '',
          barcode: ''
        };
      },
      error: (error: any) => { }
    });
    this.onDeleteItem.emit(this.item);
    this.itemDeleted = true;
  }

  saveItem() {
    if (!this.item.name || !this.item.stock || !this.item.buyPrice || !this.item.salePrice) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    const editUrl = `/update/inventory_items/${this.item.id}`;

    this.http.put(editUrl, this.item)
      .pipe(
        catchError((error) => {
          this.errorMessage = 'Failed to save item. Please try again later.';
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.successMessage = 'Item saved successfully!';
          this.edit = false;
          this.errorMessage = null;
        }
      });
  }

  getAdditionalFields(item: any): string[] {
    const knownFields = ['name', 'stock', 'minStock', 'buyPrice', 'salePrice', 'barcode', 'created', 'lastUpdated'];
    return Object.keys(item).filter(key => !knownFields.includes(key));
  }
}
