// src/app/features/inventory-reports/inventory-reports.component.ts
import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HeaderComponent } from '../../../components/header/header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { ModalPopupComponent } from '../../../components/modal-popup/modal-popup.component';
import { ItemsComponent } from '../../inventory/items/items.component';
import { InventoryItemTableRowComponent } from './inventory-item-table-row/inventory-item-table-row.component';
import { BarcodePrintComponent } from './barcode-print/barcode-print.component';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { InventoryService } from './services/inventory.service';
import { BarcodeService } from './services/barcode.service';
import { BulkProcessService } from './services/bulk-process.service';
import { AuthenticationService } from '../../authentication/authentication.service';
import { KeyboardShortcutsService } from './utils/keyboard-shortcuts.service';
import { ValidationService } from './utils/validation.service';
import { ExportService } from './services/export.service';
import { ErrorComponent } from '../../../components/error/error.component';

@Component({
  selector: 'app-inventory-reports',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SidebarComponent,
    ModalPopupComponent,
    FormsModule,
    HttpClientModule,
    ItemsComponent,
    InventoryItemTableRowComponent,
    BarcodePrintComponent,
    LoadingComponent,
    ErrorComponent,
    LoadingComponent
  ],
  templateUrl: './inventory-reports.component.html',
  styleUrls: ['./inventory-reports.component.scss'],
  providers: [
    InventoryService,
    BarcodeService,
    ExportService,
    BulkProcessService,
    KeyboardShortcutsService,
    ValidationService
  ]
})
export class InventoryReportsComponent {
  isInitLoading: boolean = true;
  searchValue: string = '';
  selectedCategory: string = 'current inventory';
  tables: any = {};
  display_table: any = [];
  item: any = {
    imageUrl: '',
    name: '',
    stock: '',
    min_stock: '',
    buy_price: '',
    sale_price: '',
    barcode: '',
    sold: 0
  };
  addItemLoading: boolean = false;
  isDropdownVisible: boolean = false;
  modalVisible = { hash: '', value: false };
  loadingAmo: any = 0;
  processingState: string = 'add_item_init';
  processingMessage: string = '';
  feedData: any;
  barcodePrintMode = { hash: '', value: false };
  filter: any = {
    activated: false,
    minStock: { value: '', activated: false },
    maxStock: { value: '', activated: false },
    buy_price: { value: '', activated: false },
    sale_price: { value: '', activated: false },
    created: { value: '', activated: false },
    last_updated: { value: '', activated: false }
  };
  barcodePrintInfo: any = {
    count: 0,
    width: 25,
    pageWidth: 150,
    pageHeight: 250,
    barcodeType: '128'
  };
  bulkProcessStatus: any = {};
  templateUrl: string = './assets/templates/inventory_template.xlsx';
  table_limit: number = 10;
  lastSearchValue: string = '';
  searchLimit: number = 10;
  error: any = {};

  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('imageInput') imageInput!: ElementRef;

  constructor(
    public inventoryService: InventoryService,
    public barcodeService: BarcodeService,
    public exportService: ExportService,
    public bulkProcessService: BulkProcessService,
    public auth: AuthenticationService,
    public keyboardShortcutsService: KeyboardShortcutsService,
    public validationService: ValidationService // Changed to public
  ) { }

  ngOnInit() {
    this.bulkProcessService.resumeBulkProcess(this);
    this.keyboardShortcutsService.setupKeyboardShortcuts(this);
    this.inventoryService.loadTables(this, 0, 10);
    this.setTheme();
  }

  ngOnDestroy() {
    this.keyboardShortcutsService.ngOnDestroy();
  }

  setTheme() {
    let tm = this.auth.getStoredTheme();
    const a: any = document.querySelector('app-modal-popup .container');
    if (a) {
      a.style.backgroundColor = tm.text_color;
    }
  }

  onImageClick() {
    this.triggerImageInput();
  }

  triggerImageInput() {
    this.imageInput.nativeElement.click();
  }

  onImageChange(event: any) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.item.imageUrl = e.target.result as string;
    };
    reader.readAsDataURL(file);
  }

  deleteItem(item: any) {
    const index = this.display_table.indexOf(item);
    if (index > -1) {
      this.display_table.splice(index, 1);
    }
  }

  getItemStock(item: any) {
    return item.stock - (item.sold ? item.sold : 0);
  }

  handleSearchChange() {
    this.inventoryService.searchItems(this);
  }

  searchItems() {
    this.handleSearchChange();
  }

  loadTables(start: any, end: any) {
    this.inventoryService.loadTables(this, start, end);
  }

  fetchOutOfStock() {
    this.inventoryService.fetchOutOfStock(this);
  }

  isItemValid(item: any) {
    return this.validationService.isItemValid(item);
  }

  onBarcodeCountChange() {
    // Your barcode count change logic here, if needed
  }

  handleMinStockChange() {
    this.display_table = this.feedData.filter((item: any) =>
      typeof item['stock'] === 'number' && item['stock'] >= this.filter.minStock.value
    );
    this.barcodePrintInfo.count = this.display_table?.length;
  }

  handleMaxStockChange() {
    this.display_table = this.feedData.filter((item: any) =>
      typeof item['stock'] === 'number' && item['stock'] <= this.filter.maxStock.value
    );
    this.barcodePrintInfo.count = this.display_table?.length;
  }

  handleBuyPriceChange() {
    this.display_table = this.feedData.filter((item: any) =>
      typeof item['buy_price'] === 'number' && item['buy_price'] === this.filter.buy_price.value
    );
    this.barcodePrintInfo.count = this.display_table?.length;
  }

  handleSalePriceChange() {
    this.display_table = this.feedData.filter((item: any) =>
      typeof item['sale_price'] === 'number' && item['sale_price'] === this.filter.sale_price.value
    );
    this.barcodePrintInfo.count = this.display_table?.length;
  }

  handleLastUpdatedChange() {
    if (!this.feedData) return;
    this.display_table = this.feedData.filter((item: any) =>
      item['last_updated'] && item['last_updated'] >= this.filter.last_updated.value
    );
    this.barcodePrintInfo.count = this.display_table?.length;
  }

  handleCreatedChange() {
    // Implement if needed
  }

  applyFilters() {
    // Implement combined filters if needed
  }

  resetFilters() {
    this.filter = {
      activated: false,
      minStock: { value: '', activated: false },
      maxStock: { value: '', activated: false },
      buy_price: { value: '', activated: false },
      sale_price: { value: '', activated: false },
      created: { value: '', activated: false },
      last_updated: { value: '', activated: false }
    };
    this.inventoryService.loadTables(this, 0, 10);
  }

  changeBarcodePrintMode() {
    this.barcodePrintMode = { hash: Date.now().toString(), value: !this.barcodePrintMode.value };
  }

  async printBarcode(operation: any) {
    this.barcodeService.printBarcode(this, operation);
  }

  toggleDropdown() {
    this.isDropdownVisible = !this.isDropdownVisible;
  }

  exportOption(format: string) {
    if (format === 'Excel') {
      this.exportService.exportToExcel(this);
    } else if (format === 'PDF') {
      this.exportService.exportToPDF(this);
    }
  }

  onSelectCategory(nm: string) {
    this.selectedCategory = nm;
    this.inventoryService.loadTables(this, 0, 10);
  }

  toggleModal() {
    this.modalVisible = {
      hash: Date.now().toString(),
      value: !this.modalVisible.value
    };
  }

  addItem() {
    this.inventoryService.addItem(this);
  }

  cloneItem(item: any) {
    this.item = { ...item };
    this.toggleModal();
  }

  onFileChange(event: any) {
    const files: FileList = event.target.files;
    this.processingState = 'add_item_bulk_update';

    if (files && files?.length > 0) {
      this.bulkProcessService.processMultipleExcelFiles(this, files);
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onScroll(event: any): void {
    const element = event.target;
    const scrollPosition = element.scrollTop + element.clientHeight;
    const totalHeight = element.scrollHeight;
    const scrollPercentage = (scrollPosition / totalHeight) * 100;

    if (scrollPercentage >= 75) {
      if (this.loadingAmo !== this.display_table?.length + 10) {
        this.loadingAmo = this.display_table?.length + 10;
        this.inventoryService.loadTables(this, 0, this.display_table?.length + 10);
      }
    }
  }

  setDataTable(e: any) {
    this.display_table = e;
    this.barcodePrintInfo.count = this.display_table?.length;
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

  isDatabaseEmpty(): boolean {
    return this.tables.out_of_stock?.length === 0 && this.tables.current_inventory?.length === 0;
  }
}