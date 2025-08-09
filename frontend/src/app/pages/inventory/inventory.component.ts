import { Component, ElementRef, ViewChild } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { ModalPopupComponent } from '../../components/modal-popup/modal-popup.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ItemsComponent } from './items/items.component';
import * as XLSX from 'xlsx';
import { AuthenticationService } from '../authentication/authentication.service';
import { log } from 'console';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    HeaderComponent,
    SidebarComponent,
    ModalPopupComponent,
    FormsModule,
    HttpClientModule,
    CommonModule,
    ItemsComponent
  ],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent {
  modalVisible = { hash: '', value: false };
  item = {
    name: '',
    stock: '',
    min_stock: '',
    buy_price: '',
    sale_price: '',
    barcode: '',
    sold: 0
  };
  searchKey = 'name';
  searchValue = '';
  searchResults = [];
  fileClicked: Boolean = false;
  @ViewChild('fileInput') fileInput!: ElementRef;

  triggerFileInput() {
    this.fileClicked = true;
    this.fileInput.nativeElement.click();
  }

  constructor(private http: HttpClient, private auth: AuthenticationService) { }

  setTheme() {
    let tm = this.auth.getStoredTheme();
    const a: any = document.querySelector('app-inventory .body');
    a.querySelector('.container .search-bar').style.backgroundColor = tm.background_color;
    // a.style.backgroundColor = tm.text_color;
  }

  ngOnInit() {
    this.setupKeyboardShortcuts();
    this.setTheme();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === 'N') {
        event.preventDefault(); // Prevent the default action (if any)
        this.toggleModal();
        this.focusAddItemNameInput();
      }

      if (event.key === 'Enter' && document.activeElement?.classList.contains('input')) {
        event.preventDefault(); // Prevent the default action (if any)
        this.searchItems();
      }
      if (event.shiftKey && event.key === 'S') {
        event.preventDefault(); // Prevent the default action (if any)
        this.focusSearchInput();
      }
      if (event.shiftKey && event.key === 'C') {
        event.preventDefault(); // Prevent the default action (if any)
        this.searchValue = '';
      }
    });
  }

  toggleModal() {
    this.modalVisible = {
      hash: Date.now().toString(),
      value: true
    };
    log('Modal toggled:', this.modalVisible);
  }

  searchItems() {
    const searchUrl = `/searc211h?keyword=${this.searchValue}&schema=inventory_items`;

    this.http.get(searchUrl).subscribe({
      next: (response: any) => {
        this.searchResults = response;
      },
      error: (error: any) => {
      }
    });
  }

  addItem() {
    const headers = { 'Content-Type': 'application/json' }; // Optional, HttpClient sets JSON content type automatically.

    this.http.post('/add/inventory_items',
      {
        ...{
          name: 'N/A',
          stock: 0,
          min_stock: 0,
          buy_price: 0,
          sale_price: 0,
          barcode: 0,
          sold: 0
        },
        ...this.item
      },
      { headers })
      .subscribe({
        next: (response: any) => {
          // Reset form after successful submission
          this.item = {
            name: '',
            stock: '',
            min_stock: '',
            buy_price: '',
            sale_price: '',
            barcode: '',
            sold: this.item.sold + 1 * 10
          };
          //  this.toggleModal(); // Close the modal
        },
        error: (error: any) => {
          console.error('Error adding item', error);
        }
      });
  }

  focusSearchInput() {
    const inputField = document.querySelector('.input') as HTMLInputElement;
    if (inputField) {
      inputField.focus();
    }
  }

  focusAddItemNameInput() {
    if (this.modalVisible.value) {
      const inputField = document.querySelector('.add-item-name') as HTMLInputElement;
      if (inputField) {
        inputField.focus();
      }
    }
  }

  cloneItem(item: any): any {
    const clonedItem = item;
    this.item = clonedItem; // Update the current item with the cloned item
    this.toggleModal();
  }

  onFileChange(event: any) {
    const target: DataTransfer = <DataTransfer>(event.target);
    if (target.files.length !== 1) throw new Error('Cannot upload multiple files at once');

    const file: File = target.files[0];

    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      // Assuming the first sheet contains the inventory items
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      // Parse the data
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Process each row (assuming the first row is the header)
      this.processExcelData(data);
    };

    reader.readAsBinaryString(file);
  }

  // Function to process Excel data
  processExcelData(data: any[]) {
    const headers = data[0]; // First row is the header
    const rows = data.slice(1); // Remaining rows are the item data

    // Create a mapping of column names to their respective indexes
    const headerMap = headers.reduce((acc: any, header: string, index: number) => {
      acc[header.toLowerCase()] = index; // Convert header to lowercase for consistent access
      return acc;
    }, {});

    rows.forEach((row) => {
      // Create the basic item object with known fields
      const item: any = {
        name: row[headerMap['name']] || 'N/A',
        stock: row[headerMap['stock']] || 0,
        min_stock: row[headerMap['min_stock']] || 0,
        buy_price: row[headerMap['buy_price']] || 0,
        sale_price: row[headerMap['sale_price']] || 0,
        barcode: row[headerMap['barcode']] || 'N/A',
        sold: row[headerMap['sold']] || 0
      };

      // Loop through the remaining headers and add any additional fields dynamically
      Object.keys(headerMap).forEach((key) => {
        if (!item.hasOwnProperty(key)) {
          item[key] = row[headerMap[key]] || null; // Add any extra fields that are not part of the known ones
        }
      });

      this.addItemFromExcel(item); // Call the function to add each item
    });
  }

  // Function to add an item to the inventory (from Excel file)
  addItemFromExcel(item: any) {
    const headers = { 'Content-Type': 'application/json' };

    this.http.post('/add/inventory_items',
      { ...item },
      { headers })
      .subscribe({
        next: (response: any) => {
          this.fileClicked = false;
        },
        error: (error: any) => {
          console.error('Error adding item from Excel', error);
        }
      });
  }

}