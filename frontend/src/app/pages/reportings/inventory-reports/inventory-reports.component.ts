import { Component, ElementRef, ViewChild } from '@angular/core';
import { HeaderComponent } from '../../../components/header/header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx'; // Import xlsx for Excel export
import jsPDF from 'jspdf'; // Import jsPDF
import 'jspdf-autotable'; // Import jsPDF autoTable plugin
import { ModalPopupComponent } from '../../../components/modal-popup/modal-popup.component';
import { ItemsComponent } from '../../inventory/items/items.component';
import { InventoryItemTableRowComponent } from './inventory-item-table-row/inventory-item-table-row.component';
import { AuthenticationService } from '../../authentication/authentication.service';
import { BarcodePrintComponent } from './barcode-print/barcode-print.component';
import JsBarcode from 'jsbarcode'; // Import JsBarcode
import { load } from 'mime';
import { LoadingComponent } from '../../../components/loading/loading.component';

@Component({
  selector: 'app-inventory-reports',
  standalone: true,
  imports: [
    HeaderComponent,
    SidebarComponent,
    ModalPopupComponent,
    FormsModule,
    HttpClientModule,
    CommonModule,
    ItemsComponent,
    InventoryItemTableRowComponent,
    BarcodePrintComponent,
    LoadingComponent
  ],
  templateUrl: './inventory-reports.component.html',
  styleUrls: ['./inventory-reports.component.scss']
})
export class InventoryReportsComponent {
  searchValue: string = '';
  selectedCategory: string = 'current inventory';
  tables: any = {};
  display_table: any = [];
  item = {
    imageUrl: '',
    name: '',
    stock: '',
    minStock: '',
    buyPrice: '',
    salePrice: '',
    barcode: '',
    sold: 0
  };
  addItemLoading: boolean = false;
  isDropdownVisible: boolean = false;
  modalVisible = { hash: '', value: false }
  loadingAmo: any = 0;
  processingState: any = 'add_item_init';
  feedData: any;
  barcodePrintMode = { hash: '', value: false };
  filter: any = {
    activated: false,
    minStock: { value: '', activated: false },
    maxStock: { value: '', activated: false },
    buyPrice: { value: '', activated: false },
    salePrice: { value: '', activated: false },
    created: { value: '', activated: false },
    lastUpdated: { value: '', activated: false }
  }
  barcodePrintInfo: any = {
    count: 0,
    width: 25,
    pageWidth: 150,
    pageHeight: 250,
    barcodeType: '128'
  }
  bulkProcessStatus: any = {};

  ngOnChanges() {
    this.barcodePrintInfo.count = this.display_table.length;
  }

  ngDoCheck() {
    if (this.barcodePrintInfo.count != this.display_table.length) {
      this.barcodePrintInfo.count = this.display_table.length;
    }
  }

  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('imageInput') imageInput!: ElementRef;

  constructor(private http: HttpClient, private router: Router, private auth: AuthenticationService) { }

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

  onBarcodeCountChange() {
  }

  deleteItem(item: any) {
    const index = this.display_table.indexOf(item);
    if (index > -1) {
      this.display_table.splice(index, 1);
    }
  }

  changeBarcodePrintMode() {
    this.barcodePrintMode = { hash: Date.now().toString(), value: !this.barcodePrintMode.value };
  }

  getItemStock(item: any) {
    return item.stock - (item.sold ? item.sold : 0);
  }

  onSearchKeywords() {
    // Your search logic here
  }

  handleSearchChange() {
    // handle search input change logic here
  }

  handleCreatedChange() {

  }

  handleMinStockChange() {
    this.display_table = this.feedData.filter((item: any) =>
      typeof item['stock'] == 'number' && item['stock'] >= this.filter.minStock.value
    );
    return
  }

  handleMaxStockChange() {
    this.display_table = this.feedData.filter((item: any) =>
      typeof item['stock'] == 'number' && item['stock'] <= this.filter.maxStock.value
    );
    return
  }

  handleBuyPriceChange() {
    this.display_table = this.feedData.filter((item: any) =>
      typeof item['buyPrice'] == 'number' && item['buyPrice'] == this.filter.buyPrice.value
    );
  }

  handleSalePriceChange() {
    this.display_table = this.feedData.filter((item: any) =>
      typeof item['salePrice'] == 'number' && item['salePrice'] == this.filter.salePrice.value
    );
  }

  handleLastUpdatedChange() {
    if (!this.feedData) return;
    this.display_table = this.feedData.filter((item: any) =>
      item['lastUpdated'] && item['lastUpdated'] >= this.filter.lastUpdated.value
    );
  }

  handleBarcodeCountChange() {
    // handle barcodeCount input change logic here
  }

  handleBarcodeWidthChange() {
    // handle barcodeWidth input change logic here
  }

  handlePageWidthChange() {
    // handle pageWidth input change logic here
  }

  handlePageHeightChange() {
    // handle pageHeight input change logic here
  }

  handlePageCountChange() {
    // handle pageCount input change logic here
  }

  applyFilters() {
    // Your apply filters logic here
  }

  resetFilters() {
    // this.search = '';
    // this.minStock = '';
    // this.maxStock = '';
    // this.buyPrice = '';
    // this.salePrice = '';
    // this.lastUpdated = '';
    // this.barcodeCount = '';
    // this.barcodeWidth = '';
    // this.pageWidth = '';
    // this.pageHeight = '';
    // this.pageCount = '';
  }

  async printBarcode(operation: any) {
    const { count, width, pageWidth, pageHeight, barcodeType } = this.barcodePrintInfo;

    const barcodes = this.display_table
      .slice(0, count)
      .map((item: any) => String(item.barcode || item.id || ''))
      .filter((barcode: string) => barcode && typeof barcode === 'string');

    const docHtml = `
    <html>
      <head>
        <style>
            body {
              margin: 0;
              padding: 0;
            }
            .barcode-container {
              display: flex;
              flex-wrap: wrap;
            }
            .barcode-item {
              display: flex;
              flex-direction: column;
              margin: ${width / 20}mm;
              text-align: center;
              justify-content: center;
            }
            .barcode-item img {
              width: ${width}mm;
              height: auto;
            }
            .barcode-item span {
              display: block;
              font-size: ${width / 10}mm;
            }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          ${barcodes.map((barcode: string) => `
            <div class="barcode-item">
              <img src="${generateBarcodeURI(barcodeType, barcode)?.img ? generateBarcodeURI(barcodeType, barcode)?.img : 'https://barcodeapi.org/api/' + barcodeType + '/' + barcode}" alt="${barcode}" />
              <span>${generateBarcodeURI(barcodeType, barcode)?.value ? generateBarcodeURI(barcodeType, barcode)?.value : barcode}</span>
            </div>
          `).join('')}
        </div>
      </body>
    </html>
    `;

    if (operation === 'preview') {
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(docHtml);
        win.document.close();
      }
      return;
    }

    if (operation === 'print') {
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
      if (frameDoc && 'document' in frameDoc) {
        (frameDoc as any).document.open();
        (frameDoc as any).document.write(docHtml);
        (frameDoc as any).document.close();

        (frameDoc as any).focus();
        (frameDoc as any).onload = () => {
          setTimeout(() => {
            (frameDoc as any).print();
            document.body.removeChild(printFrame);
          }, 500);
        };
      } else {
        document.body.removeChild(printFrame);
      }
      return;
    }

    function generateBarcodeURI(barcodeType: any, value: any) {
      const width = 30;
      const canvas = document.createElement('canvas');
      const dpi = 1000;
      const canvasWidthPx = Math.ceil((width / 25.4) * dpi);
      const minBarWidthMm = 0.19;
      const barWidthPx = Math.ceil((minBarWidthMm / width) * canvasWidthPx);
      const barHeightPx = Math.ceil(canvasWidthPx * 0.3);
      canvas.width = canvasWidthPx;
      canvas.height = barHeightPx + 40;

      const barcodeFormatMapping: any = {
        '128': 'CODE128',
        '13': 'EAN13',
        '8': 'EAN8',
        'a': 'UPC',
        'e': 'UPCE',
        '39': 'CODE39',
        '14': 'ITF14',
        'codabar': 'codabar',
        'msi': 'MSI',
        'pharmacode': 'pharmacode',
        'code128a': 'CODE128A',
        'code128b': 'CODE128B',
        'code128c': 'CODE128C'
      };

      try {

        if (!value || !barcodeFormatMapping[barcodeType]) {
          return null;
        }

        function fixBarcode(barcodeValue: string | number, barcodeType: string): string {
          let cleanedValue: string = String(barcodeValue).replace(/\s/g, '');
          barcodeType = barcodeType.toLowerCase();

          function calculateEAN13CheckDigit(digits: string): number {
            let sum: number = 0;
            for (let i: number = 0; i < 12; i++) {
              sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
            }
            return (10 - (sum % 10)) % 10;
          }

          function calculateUPCACheckDigit(digits: string): number {
            let sum: number = 0;
            for (let i: number = 0; i < 11; i++) {
              sum += parseInt(digits[i]) * (i % 2 === 0 ? 3 : 1);
            }
            return (10 - (sum % 10)) % 10;
          }

          switch (barcodeType) {
            case '13':
            case 'ean-13':
              if (/^\d{13}$/.test(cleanedValue)) {
                const providedCheckDigit: number = parseInt(cleanedValue[12]);
                const calculatedCheckDigit: number = calculateEAN13CheckDigit(cleanedValue.slice(0, 12));
                if (providedCheckDigit !== calculatedCheckDigit) {
                  return cleanedValue.slice(0, 12) + calculatedCheckDigit;
                }
                return cleanedValue;
              } else if (/^\d{12}$/.test(cleanedValue)) {
                return cleanedValue + calculateEAN13CheckDigit(cleanedValue);
              }
              return cleanedValue;

            case 'a':
            case 'upc-a':
              if (/^\d{12}$/.test(cleanedValue)) {
                const providedCheckDigit: number = parseInt(cleanedValue[11]);
                const calculatedCheckDigit: number = calculateUPCACheckDigit(cleanedValue.slice(0, 11));
                if (providedCheckDigit !== calculatedCheckDigit) {
                  return cleanedValue.slice(0, 11) + calculatedCheckDigit;
                }
                return cleanedValue;
              } else if (/^\d{11}$/.test(cleanedValue)) {
                return cleanedValue + calculateUPCACheckDigit(cleanedValue);
              }
              return cleanedValue;

            case '8':
            case 'ean-8':
              if (/^\d{8}$/.test(cleanedValue)) {
                return cleanedValue;
              } else if (/^\d{7}$/.test(cleanedValue)) {
                let sum: number = 0;
                for (let i: number = 0; i < 7; i++) {
                  sum += parseInt(cleanedValue[i]) * (i % 2 === 0 ? 3 : 1);
                }
                const checkDigit: number = (10 - (sum % 10)) % 10;
                return cleanedValue + checkDigit;
              }
              return cleanedValue;

            case '128':
              if (/^[A-Za-z0-9\s\-\/]+$/.test(cleanedValue)) {
                return cleanedValue;
              }
              return cleanedValue;

            case '39':
              if (/^[A-Z0-9\-.\s\/+$%*]+$/.test(cleanedValue)) {
                return cleanedValue;
              }
              return cleanedValue;
          }

          return cleanedValue;
        }

        value = fixBarcode(value, barcodeType);

        if (barcodeFormatMapping[barcodeType] == undefined) {
          return null;
        }
        JsBarcode(canvas, value, {
          format: barcodeFormatMapping[barcodeType] || 'CODE128',
          width: barWidthPx,
          height: barHeightPx,
          displayValue: false,
          fontSize: 12,
          margin: 10
        });

        return { img: canvas.toDataURL('image/png'), value: value };
      } catch (error) {
        return null;
      } finally {
        canvas.remove();
      }
    }
  }

  downloadBarcode() {
    // Your download barcode logic here
  }

  printBarcodePreview() {
    // Your print barcode preview logic here
  }

  printBarcodePreviewPage() {
    // Your print barcode preview page logic here
  }

  printBarcodePreviewPageCount() {
    // Your print barcode preview page count logic here
  }

  printBarcodePreviewPageWidth() {
    // Your print barcode preview page width logic here
  }

  printBarcodePreviewPageHeight() {
    // Your print barcode preview page height logic here
  }

  openModal() {
    // Your open modal logic here
  }

  handleSelectAllBarcodesChange() {
    // handle select all barcodes change logic here
  }

  ngOnInit() {
    this.setupKeyboardShortcuts();
    this.loadTables(0, 10);
    this.setTheme();
  }

  setTheme() {
    let tm = this.auth.getStoredTheme();
    const a: any = document.querySelector('app-modal-popup .container');
    a.style.backgroundColor = tm.text_color;
  }

  setDataTable(e: any) {
    console.log('settabe ');

    this.display_table = e;
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === 'N') {
        event.preventDefault();
        this.toggleModal();
        this.focusAddItemNameInput();
      }

      if (event.key === 'Enter' && document.activeElement?.classList.contains('input')) {
        event.preventDefault();
        this.searchItems();
      }
      if (event.shiftKey && event.key === 'S') {
        event.preventDefault();
        this.focusSearchInput();
      }
      if (event.shiftKey && event.key === 'C') {
        event.preventDefault();
        this.searchValue = '';
      }
    });
  }

  toggleModal() {
    this.modalVisible = {
      hash: Date.now().toString(),
      value: this.modalVisible.value ? false : true
    };
  }

  addItem() {
    const headers = { 'Content-Type': 'application/json' };
    this.addItemLoading = true;
    this.http.post('/add/inventory_items',
      {
        ...{
          name: 'N/A',
          stock: '',
          minStock: '',
          buyPrice: '',
          salePrice: '',
          barcode: '',
          sold: 0
        },
        ...this.item
      },
      { headers })
      .subscribe({
        next: (response: any) => {
          this.item = {
            imageUrl: '',
            name: '',
            stock: '',
            minStock: '',
            buyPrice: '',
            salePrice: '',
            barcode: '',
            sold: this.item.sold + 1 * 10
          };
          this.addItemLoading = false;
        },
        error: (error: any) => {
          this.item = {
            imageUrl: '',
            name: '',
            stock: '',
            minStock: '',
            buyPrice: '',
            salePrice: '',
            barcode: '',
            sold: this.item.sold + 1 * 10
          };
          this.addItemLoading = false;
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
    if (this.modalVisible) {
      const inputField = document.querySelector('.add-item-name') as HTMLInputElement;
      if (inputField) {
        inputField.focus();
      }
    }
  }

  onScroll(event: any): void {
    const element = event.target;
    const scrollPosition = element.scrollTop + element.clientHeight;
    const totalHeight = element.scrollHeight;
    const scrollPercentage = (scrollPosition / totalHeight) * 100;

    if (scrollPercentage >= 75) {
      if (this.loadingAmo != this.display_table.length + 10) {
        this.loadingAmo = this.display_table.length + 10;
        this.loadTables(0, this.display_table.length + 10);
      }
    }
  }

  cloneItem(item: any): any {
    const clonedItem = item;
    this.item = clonedItem;
    this.toggleModal();
  }
  onFileChange(event: any) {
    const files: FileList = event.target.files;
    this.processingState = 'add_item_bulk_update';

    if (files && files.length > 0) {
      this.processMultipleExcelFiles(files);
    }
  }

  processMultipleExcelFiles(files: FileList) {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file, file.name);
    });

    this.processingState = 'Uploading files...';
    const uploadStartTime = Date.now();

    this.http.post<{ processId: string }>(
      `/add/bulk/inventory_items`,
      formData
    ).subscribe({
      next: (response) => {
        const processId = response.processId;
        this.bulkProcessStatus = {
          processId,
          status: 'processing',
          percentage: 0,
          _startTime: uploadStartTime,
          _lastPoll: Date.now()
        };

        const baseInterval = 100;
        let maxInterval = 30000;
        let currentInterval = baseInterval;
        let retryCount = 0;
        const maxRetries = 10;
        let timeoutId: any;

        const pollStatus = () => {
          this.http.get<any>(`/bulk/status/${processId}`).subscribe({
            next: (status) => {
              this.bulkProcessStatus = {
                ...status,
                _lastPoll: Date.now()
              };

              const marginMs = Math.floor(Math.random() * 24000) + 24000;
              const elapsedMs = (Date.now() - uploadStartTime) + marginMs;
              const percent = status.percentage;
              const estimatedTotalMs = percent > 0 ? elapsedMs / (percent / 100) : 0;
              const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);

              this.bulkProcessStatus._elapsed = this.formatDuration(elapsedMs);
              this.bulkProcessStatus._remaining = this.formatDuration(remainingMs);

              currentInterval = baseInterval;
              retryCount = 0;

              if (status.status === 'completed') {
                this.processingState = `Woohoo! ${status.results?.length || 0} items added. Inventory just got fatter!`;
                this.loadTables(0, 10);
                clearTimeout(timeoutId);
                setTimeout(() => {
                  this.processingState = 'add_item_init';
                }, 3000);
              } else if (status.status === 'processing') {
                currentInterval = Math.min(
                  baseInterval * Math.pow(2, retryCount),
                  maxInterval
                );
                timeoutId = setTimeout(pollStatus, currentInterval);
              } else if (status.status === 'failed') {
                this.processingState = `Processing failed: ${status.message || 'Unknown error'}`;
                clearTimeout(timeoutId);
              }
            },
            error: (err) => {
              retryCount++;
              if (retryCount > maxRetries) {
                this.processingState = 'Polling failed after multiple attempts';
                console.error('Polling failed', err);
                return;
              }

              const jitter = Math.random() * 1000;
              currentInterval = Math.min(
                baseInterval * Math.pow(2, retryCount) + jitter,
                maxInterval
              );

              this.processingState = `Connection issue (retrying ${retryCount}/${maxRetries})...`;
              timeoutId = setTimeout(pollStatus, currentInterval);
            }
          });
        };

        timeoutId = setTimeout(pollStatus, baseInterval);
      },
      error: (error) => {
        this.processingState = 'Upload failed: ' + (error.error?.message || error.message || 'Unknown error');
        console.error('Upload error', error);
        setTimeout(() => {
          this.processingState = 'add_item_init';
        }, 5000);
      }
    });
  }

  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  addItemsFromExcel(items: any[]) {
    const headers = { 'Content-Type': 'application/json' };

    this.http.post('/add/bulk/inventory_items',
      { items },
      { headers })
      .subscribe({
        next: (response: any) => {
        },
        error: (error: any) => {
          console.error('Error adding items from Excel in bulk', error);
        }
      });
  }

  toggleDropdown() {
    this.isDropdownVisible = !this.isDropdownVisible;
  }

  exportOption(format: string) {
    if (format === 'Excel') {
      this.exportToExcel();
    } else if (format === 'PDF') {
      this.exportToPDF();
    }
  }

  searchItems() {
    this.searchInventory();
  }

  onSelectCategory(nm: string) {
    this.selectedCategory = nm;
  }

  loadTables(start: any, end: any) {
    const url = `/read/inventory_items/${start}/${end}`;

    this.http.get<any[]>(url).subscribe({
      next: (response) => {
        this.tables.out_of_stock = response.filter((item: any) => {
          const isOutOfStock = (item.stock - item.sold) <= 0;
          return isOutOfStock;
        });
        this.tables.current_inventory = response;
        if (this.selectedCategory == 'current inventory') {
          this.display_table = response;
          this.feedData = response;
        } else if (this.selectedCategory == 'out of stock') {
          this.display_table = this.tables.out_of_stock;
          this.feedData = response;
        }
      },
      error: (error) => {
        console.log('Error fetching most sold items', error);
      }
    });
  }

  searchInventory() {

    const searchTerm = this.searchValue.toLowerCase();
    if (searchTerm.length < 1) {
      this.loadTables(0, 999999999999999);
    }

    const searchUrl = `/search?keyword=${searchTerm}&schema=${'inventory_items'}`;
    this.http.get<any[]>(searchUrl).subscribe({
      next: (response) => {

        this.display_table = response;
        this.feedData = response;
      },
      error: (error) => {
        console.error('Error during search', error);
      }
    });
  }

  fetchOutOfStock() {
    const url = `/read/inventory_items/0/999999999999999`;

    this.http.get<any[]>(url).toPromise()
      .then((response: any) => {
        this.display_table = response.filter((item: any) => {
          const isOutOfStock = (item.stock - item.sold) <= 0;
          return isOutOfStock;
        });
      })
      .catch(error => {
        console.error('Error fetching inventory items', error);
      });
  }

  exportToExcel() {
    const url = `/read/inventory_items/0/999999999999999`;

    this.http.get<any[]>(url).toPromise()
      .then(response => {
        const data_to_export: any = response;
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data_to_export);
        const workbook: XLSX.WorkBook = {
          Sheets: { 'Inventory Report': worksheet },
          SheetNames: ['Inventory Report']
        };
        const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsFile(excelBuffer, 'Inventory_Report', 'xlsx');
      })
      .catch(error => {
        console.error('Error fetching inventory items', error);
      });
  }

  exportToPDF() {
    const doc = new jsPDF();
    doc.text('Inventory Report', 14, 20);

    if (this.display_table.length > 0) {
      const tableColumnHeaders = Object.keys(this.display_table[0]);
      const tableRows = this.display_table.map((item: any) => {
        return tableColumnHeaders.map(header => item[header]);
      });

      const columnStyles = tableColumnHeaders.reduce((acc: any, header, index) => {
        acc[index] = { cellWidth: 30 };
        return acc;
      }, {});

      (doc as any).autoTable({
        head: [tableColumnHeaders],
        body: tableRows,
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133] },
        columnStyles: columnStyles,
        styles: {
          cellPadding: 3,
          fontSize: 10,
        },
      });

      doc.save('Inventory_Report.pdf');
    } else {
      console.log('No data available to export.');
    }
  }

  saveAsFile(buffer: any, fileName: string, fileType: string): void {
    const data: Blob = new Blob([buffer], { type: fileType });
    const link: HTMLAnchorElement = document.createElement('a');
    const url = URL.createObjectURL(data);

    link.href = url;
    link.download = `${fileName}.${fileType}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  isDatabaseEmpty(): boolean {
    return Object.keys(this.tables).length == 0;
  }
}
