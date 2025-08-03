import { Component, OnDestroy, OnInit } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { ItemsComponent } from '../inventory/items/items.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceiptitemComponent } from './receiptitem/receiptitem.component';
import { ModalPopupComponent } from '../../components/modal-popup/modal-popup.component';
import { ReceiptComponent } from './receipt/receipt.component';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import e from 'cors';
import JsBarcode from 'jsbarcode';
import { RequestsService } from '../../services/requests.service';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    HeaderComponent,
    SidebarComponent,
    ItemsComponent,
    HttpClientModule,
    CommonModule,
    FormsModule,
    ReceiptitemComponent,
    ModalPopupComponent,
    ReceiptComponent,
    ItemsComponent
  ],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss'
})
export class SalesComponent implements OnInit, OnDestroy {
  private readonly SECRET_KEY = 'nwD23b41bf5c82w1';
  private readonly SESSION_STORAGE_KEY = 'xawqf3m2b41bf5c82w1';

  constructor(private http: HttpClient, private router: Router, private reqs: RequestsService) { }
  customItemAddModalVisible: any = false;
  receipt: any = {
    items: [],
    total: 0,
    paid: 0,
    balance: 0
  };
  searchKey = 'name';
  searchValue = '';
  searchResults: any[] = [];
  searchTimeout: any = 500;
  newItem: any = {};
  viewReceipts: boolean = false;
  receipts: any;
  printersList: any = [];
  typedAm = '';
  selectPrinterModalVisible = { hash: '', value: false };
  selectedPrinter = 0;
  inputFocused: boolean = false;
  cachedResults: any;
  helightedItem: number = 0;
  qtyMatch: any = 1;
  addNow = false;
  saleProcessing = { hash: '', value: false };
  selectedPayment = 'cash';
  cashReceived: any = '';
  cardReceived: any = '';
  cardReference: any = '';
  cardEnter: boolean = false;
  showLoading: boolean = false;
  multiplePricesModalVisible: any = { hash: '', value: false, prices: [], selectedPrice: '', item: null, selectedIndex: 0 };
  private spaceKeyTimer: any = null;

  ngOnInit() {
    const encryptedState = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
    if (encryptedState) {
      const state = this.decryptState(encryptedState);
      if (state) {
        this.setState(state);
      }
    }
    this.getPrinters();
    this.setupKeyboardShortcuts();
    //this.restoreLastReceipt();
    window.addEventListener('beforeunload', this.saveStateOnUnload);
    this.fetchMostSoldItems();
  }

  ngOnDestroy() {
    this.saveState();
    window.removeEventListener('beforeunload', this.saveStateOnUnload);
  }

  private saveStateOnUnload = () => {
    this.saveState();
  };

  private saveState() {
    const state = this.getState();
    const encryptedState = this.encryptState(state);
    sessionStorage.setItem(this.SESSION_STORAGE_KEY, encryptedState);
  }

  private encryptState(state: any): string {
    const jsonState = JSON.stringify(state);
    return CryptoJS.AES.encrypt(jsonState, this.SECRET_KEY).toString();
  }

  private decryptState(encryptedState: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedState, this.SECRET_KEY);
      const jsonState = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(jsonState);
    } catch (error) {
      console.error('Error decrypting state:', error);
      return null;
    }
  }

  private getState(): any {
    return {
      customItemAddModalVisible: this.customItemAddModalVisible,
      receipt: this.receipt,
      searchKey: this.searchKey,
      searchValue: this.searchValue,
      searchResults: this.searchResults,
      newItem: this.newItem,
      viewReceipts: this.viewReceipts,
      receipts: this.receipts,
      printersList: this.printersList,
      typedAm: this.typedAm,
      selectPrinterModalVisible: this.selectPrinterModalVisible,
      selectedPrinter: this.selectedPrinter,
      inputFocused: this.inputFocused,
      cachedResults: this.cachedResults,
      helightedItem: this.helightedItem,
      qtyMatch: this.qtyMatch,
      addNow: this.addNow,
      saleProcessing: this.saleProcessing,
      selectedPayment: this.selectedPayment,
      cashReceived: this.cashReceived,
      cardReceived: this.cardReceived,
      cardReference: this.cardReference,
      cardEnter: this.cardEnter,
      showLoading: this.showLoading,
      multiplePricesModalVisible: this.multiplePricesModalVisible
    };
  }

  private setState(state: any): void {
    if (state) {
      this.customItemAddModalVisible = state.customItemAddModalVisible;
      this.receipt = state.receipt;
      this.searchKey = state.searchKey;
      this.searchValue = state.searchValue;
      this.searchResults = state.searchResults;
      this.newItem = state.newItem;
      this.viewReceipts = state.viewReceipts;
      this.receipts = state.receipts;
      this.printersList = state.printersList;
      this.typedAm = state.typedAm;
      this.selectPrinterModalVisible = state.selectPrinterModalVisible;
      this.selectedPrinter = state.selectedPrinter;
      this.inputFocused = state.inputFocused;
      this.cachedResults = state.cachedResults;
      this.helightedItem = state.helightedItem;
      this.qtyMatch = state.qtyMatch;
      this.addNow = state.addNow;
      this.saleProcessing = state.saleProcessing;
      this.selectedPayment = state.selectedPayment;
      this.cashReceived = state.cashReceived;
      this.cardReceived = state.cardReceived;
      this.cardReference = state.cardReference;
      this.cardEnter = state.cardEnter;
      this.showLoading = state.showLoading;
      this.multiplePricesModalVisible = state.multiplePricesModalVisible;
    }
  }

  cancelSale() {
    this.receipt = {
      items: [],
      total: 0,
      paid: 0,
      balance: 0
    };
    this.searchValue = '';
    this.helightedItem = 0;
    this.typedAm = '';
    this.addNow = false;
    this.searchResults = [];
    this.cachedResults = [];
    this.inputFocused = false;
    this.toggleSaleProcessing();
  }

  toggleSaleProcessing() {
    this.saleProcessing = {
      hash: Date.now().toString(),
      value: this.saleProcessing.value ? false : (this.receipt.items.length > 0)
    };
  }

  toggleselectPrinterModalVisible() {
    this.selectPrinterModalVisible = {
      hash: Date.now().toString(),
      value: this.selectPrinterModalVisible.value ? false : true
    };
  }

  isSelectedPrinter(prin: string) {
    const printerIndex = this.printersList.findIndex((i: any) => i === prin);
    return this.selectedPrinter == printerIndex;
  }

  selectPrinter(prin: string) {
    const printerIndex = this.printersList.findIndex((i: any) => i === prin);
    this.selectedPrinter = printerIndex;
    localStorage.setItem('selectedPrinter', printerIndex.toString());
  }

  getPrinters() {
    const url = '/printers';
    this.http.get(url).subscribe(
      (response: any) => {
        const storedPrinter: number = parseInt(localStorage.getItem('selectedPrinter') || '0', 10);
        this.printersList = response;
        this.selectedPrinter = storedPrinter;
      },
      (error) => { }
    );
  }

  openCustomItemModal() {
    this.customItemAddModalVisible = !this.customItemAddModalVisible;
  }

  toggleViewReceipts() {
    this.viewReceipts = !this.viewReceipts;
    if (this.viewReceipts) {
      this.loadReceipts();
    }
  }

  loadReceipts() {
    const receiptsUrl = '/read-multiple/range/sales/0/999999999';
    this.http.get(receiptsUrl).subscribe({
      next: (response: any) => {
        this.receipts = response.slice().sort((a: any, b: any) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()).slice(0, 30);
      },
      error: (error: any) => { }
    });
  }

  restoreLastReceipt() {
    const lastReceipt = this.receipts[this.receipts.length - 1];
    if (lastReceipt) {
      this.receipt = { ...lastReceipt };
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      const summary = document.querySelector('.receipt-summary') as HTMLElement;
      const button = document.querySelector('.sale-button') as HTMLElement;
      const bottom = document.querySelector('.receipt-bottom') as HTMLElement;
      if (summary && button && bottom) {
        const totalHeight = summary.offsetHeight + button.offsetHeight;
        bottom.style.height = `${totalHeight + 10}px`;
      }
    }, 0);
  }

  setupKeyboardShortcuts() {
    let lastKeyTime = Date.now();
    let ctrlPressed = false;

    document.addEventListener('keydown', (event: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (event.ctrlKey) {
        ctrlPressed = true;
      }

      this.handleKeydown(event, timeDiff);
    });

    document.addEventListener('keyup', (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        this.typedAm = '';
        ctrlPressed = false;
      }
    });

    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.ctrlKey && !ctrlPressed) {
        ctrlPressed = true;
      }
    });
  }

  onFocus() {
    this.inputFocused = true;
  }

  onBlur() {
    this.inputFocused = false;
  }

  onPaidValueChange() {
    this.receipt.balance = (this.receipt.total - this.receipt.paid) * -1;
  }

  private handleKeydown(event: KeyboardEvent, timeDiff: number) {
    const HELPER_KEYS = [
      'Shift', 'Backspace', 'Enter', 'Tab', 'Control', 'Alt', 'Escape', 'AltGraph',
      'ArrowRight', 'ArrowDown', 'ArrowUp', 'ArrowLeft', '*'
    ];
    const activeElement = document.activeElement;
    const itemList = document.querySelector('.item-list');
    let itemsPerRow = 3;
    if (itemList) {
      const appItems = itemList.querySelectorAll('app-item');
      if (appItems.length > 1) {
        const firstTop = (appItems[0] as HTMLElement).offsetTop;
        itemsPerRow = Array.from(appItems).filter(
          (el) => (el as HTMLElement).offsetTop === firstTop
        ).length;
      }
    }

    const clampIndex = (idx: number, arr: any[]) => Math.max(0, Math.min(idx, arr.length - 1));

    const isInputFocused = () =>
      this.inputFocused ||
      (activeElement && (
        ['INPUT', 'TEXTAREA'].includes(activeElement.tagName) ||
        (activeElement as HTMLElement).isContentEditable
      ));

    const isSalesPage = this.router.url.includes('/sales');

    const moveHighlight = (delta: number) => {
      if (!this.searchResults || !this.searchResults.length) return;
      this.helightedItem = clampIndex(this.helightedItem + delta, this.searchResults);
      this.helightItem();
    };

    const handleSaleInput = (key: string) => {
      if (this.selectedPayment === 'cash') {
        this.cashReceived = parseFloat((this.cashReceived ?? '').toString() + key);
      } else if (this.selectedPayment === 'card') {
        if (this.cardEnter) {
          this.cardReference += key.toString();
        } else {
          this.cardReceived = parseFloat((this.cardReceived ?? '').toString() + key);
        }
      }
    };

    const handleSaleBackspace = () => {
      if (this.selectedPayment === 'cash') {
        this.cashReceived = parseFloat((this.cashReceived ?? '').toString().slice(0, -1));
      } else if (this.selectedPayment === 'card') {
        if (this.cardEnter) {
          this.cardReference = parseFloat((this.cardReference ?? '').toString().slice(0, -1));
        } else {
          this.cardReceived = parseFloat((this.cardReceived ?? '').toString().slice(0, -1));
        }
      }
    };

    const handleSearchKey = (key: string) => {
      this.handleSearchInput(key, timeDiff);
    };

    const handleSearchBackspace = () => {
      this.searchValue = this.searchValue.slice(0, -1);
      clearTimeout(this.searchTimeout);
      this.searchItems();
    };

    const handleShowShortcuts = () => {
      this.displayShortcuts();
      const modal = document.getElementById('shortcuts-modal');
      if (modal) modal.style.display = 'block';
    };

    const handleCloseShortcuts = () => {
      const modal = document.getElementById('shortcuts-modal');
      if (modal) modal.style.display = 'none';
    };

    if (event.key === 'F1') {
      event.preventDefault();
      handleShowShortcuts();
      return;
    }

    if (event.key === '/') {
      event.preventDefault();
      this.selectedPayment = 'card';
      if (!this.saleProcessing.value) {
        this.toggleSaleProcessing();
      }
      return;
    }
    if (event.key === 'Escape') {
      handleCloseShortcuts();
    }

    if (event.ctrlKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      this.focusSearchInput();
      return;
    }

    if (event.altKey && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      this.openCustomItemModal();
      return;
    }

    if (event.altKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.toggleselectPrinterModalVisible();
      return;
    }

    if (event.altKey && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      this.restoreLastReceipt();
      return;
    }

    if (event.shiftKey && event.key.toLowerCase() === 'x') {
      event.preventDefault();
      this.cancelSale();
      return;
    }

    if (event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.sale();
      return;
    }

    if (event.altKey && event.key === 'ArrowRight' && this.receipt.id) {
      event.preventDefault();
      this.printReceipt(this.receipt.id);
      return;
    }

    switch (true) {
      case event.shiftKey && event.key.toLowerCase() === 's':
        event.preventDefault();
        this.focusSearchInput();
        break;
      case event.key === 'ArrowRight':
        event.preventDefault();
        if (this.multiplePricesModalVisible.value) {
          this.multiplePricesModalVisible.selectedIndex = this.multiplePricesModalVisible.selectedIndex == this.multiplePricesModalVisible.prices.length - 1 ? 0 : this.multiplePricesModalVisible.selectedIndex + 1;
          this.multiplePricesModalVisible.selectedPrice = this.multiplePricesModalVisible.prices[this.multiplePricesModalVisible.selectedIndex];
          return;
        }
        moveHighlight(1);
        break;
      case event.key === 'Enter':
        event.preventDefault();
        if (this.multiplePricesModalVisible.value) {
          this.onClickPriceSelect(this.multiplePricesModalVisible.prices[this.multiplePricesModalVisible.selectedIndex]);
          return;
        }

        if (this.saleProcessing.value) {
          if (this.selectedPayment === 'cash') {
            this.sale();
          } else if (this.selectedPayment === 'card') {
            if (!this.cardEnter) {
              this.cardEnter = true;
            } else {
              this.sale();
            }
          }
        } else {
          this.clickHelightedItem();
        }
        break;
      case event.key === 'ArrowLeft':
        event.preventDefault();
        if (this.multiplePricesModalVisible.value) {
          this.multiplePricesModalVisible.selectedIndex = this.multiplePricesModalVisible.selectedIndex == 0 ? this.multiplePricesModalVisible.prices.length - 1 : this.multiplePricesModalVisible.selectedIndex - 1;
          this.multiplePricesModalVisible.selectedPrice = this.multiplePricesModalVisible.prices[this.multiplePricesModalVisible.selectedIndex];
          return;
        }
        moveHighlight(-1);
        break;
      case event.key === 'ArrowDown':
        event.preventDefault();
        if (this.multiplePricesModalVisible.value) {
          this.multiplePricesModalVisible.selectedIndex = this.multiplePricesModalVisible.selectedIndex == this.multiplePricesModalVisible.prices.length - 1 ? 0 : this.multiplePricesModalVisible.selectedIndex + 1;
          this.multiplePricesModalVisible.selectedPrice = this.multiplePricesModalVisible.prices[this.multiplePricesModalVisible.selectedIndex];
          return;
        }
        moveHighlight(itemsPerRow);
        break;
      case event.key === 'ArrowUp':
        event.preventDefault();
        if (this.multiplePricesModalVisible.value) {
          this.multiplePricesModalVisible.selectedIndex = this.multiplePricesModalVisible.selectedIndex == 0 ? this.multiplePricesModalVisible.prices.length - 1 : this.multiplePricesModalVisible.selectedIndex - 1;
          this.multiplePricesModalVisible.selectedPrice = this.multiplePricesModalVisible.prices[this.multiplePricesModalVisible.selectedIndex];
          return;
        }
        moveHighlight(-itemsPerRow);
        break;
      case event.shiftKey && event.key === 'Backspace':
        event.preventDefault();
        this.clearSearch();
        break;
      case event.shiftKey && event.key.toLowerCase() === 'h':
        event.preventDefault();
        this.toggleViewReceipts();
        break;
      case event.ctrlKey && /[.0-9]/.test(event.key):
        if (isInputFocused()) return;
        event.preventDefault();
        this.incrementReceiptQuantity(event.key);
        break;
      case event.key.length === 1 && !HELPER_KEYS.includes(event.key) && isSalesPage && !isInputFocused() && !(activeElement && (activeElement as HTMLElement).className === 'recharge-input'):
        event.preventDefault();
        if (this.saleProcessing.value === true) {
          handleSaleInput(event.key);
        } else {
          handleSearchKey(event.key);
        }
        break;
      case event.key === 'Backspace':
        if (isInputFocused()) return;
        event.preventDefault();
        if (this.saleProcessing.value === true) {
          handleSaleBackspace();
        } else {
          handleSearchBackspace();
        }
        break;
      case event.key === '*':
        event.preventDefault();
        if (this.saleProcessing.value === true) {
          this.selectedPayment = 'cash';
        } else {
          if (!this.spaceKeyTimer) {
            this.spaceKeyTimer = setTimeout(() => {
              this.toggleSaleProcessing();
              this.spaceKeyTimer = null;
            }, 300);
          }
        }
        break;
    }
  }

  private handleKeyup(event: KeyboardEvent) {
    if (event.key === ' ') {
      if (this.spaceKeyTimer) {
        clearTimeout(this.spaceKeyTimer);
        this.spaceKeyTimer = null;
      }
    }
  }

  private handleSearchInput(key: string, timeDiff: number) {
    if (timeDiff < 50) {
      this.addNow = true;
    } else {
      this.addNow = false;
    }
    this.searchValue += key;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.searchItems();
    }, 500);
  }

  private async incrementReceiptQuantity(key: string) {
    if (key == '.') {
      this.typedAm = this.typedAm.length > 0 ? this.typedAm + '.' : '0.';
      return;
    }
    const lastItemIndex: number = this.receipt.items.length - 1;
    const searchItemIndex = this.searchResults.findIndex((i: any) => i.id === this.receipt.items[lastItemIndex].id);

    this.searchResults[searchItemIndex].sold = (this.searchResults[searchItemIndex].sold || 0) - this.receipt.items[lastItemIndex].quantity;

    this.typedAm += key;

    if (lastItemIndex >= 0) {
      this.receipt.items[lastItemIndex].quantity = Math.min(parseFloat(this.typedAm), this.getLastItemAvailableStock());
      this.searchResults[searchItemIndex].sold = (this.searchResults[searchItemIndex].sold || 0) + this.receipt.items[lastItemIndex].quantity;
      await this.updateItemQuantities([{ ...this.receipt.items[lastItemIndex], quantity: this.receipt.items[lastItemIndex].quantity }]);
      this.updateTotal();
    }
  }

  private getLastItemAvailableStock() {
    const lastItemIndex = this.receipt.items.length - 1;
    return lastItemIndex >= 0 ? (this.receipt.items[lastItemIndex].stock + 1 - this.receipt.items[lastItemIndex].sold) : 0;
  }

  private resetLastItemQuantity() {
    const lastItemIndex = this.receipt.items.length - 1;
    if (lastItemIndex >= 0) {
      this.receipt.items[lastItemIndex].quantity = 45654;
    }
  }

  private clearSearch() {
    this.searchValue = '';
    this.searchItems();
  }

  focusSearchInput() {
    const inputField = document.querySelector('.search-input') as HTMLInputElement;
    if (inputField) {
      inputField.focus();
    }
  }

  searchItems() {
    if (this.searchValue.length < 0) {
      this.fetchMostSoldItems();
    }
    this.helightedItem = 0;
    this.qtyMatch = 1;
    var searchTerm = this.searchValue;
    var isScaleCode = () => {
      if ((this.searchValue.length != 10) || isNaN(parseInt(this.searchValue))) {
        return;
      }
      let itemId = parseInt(this.searchValue.slice(0, 5));
      const chars = "QHZ0WSX1C2DER4FV3BGTN7AYUJ8M96K5IOLP";
      itemId += 40;
      let base36 = "";
      while (itemId > 0) {
        let remainder = itemId % 36;
        base36 = chars[remainder] + base36;
        itemId = Math.floor(itemId / 36);
      }
      return {
        id: base36,
        qty: parseInt(this.searchValue.slice(5, 10)) / 1000
      };
    };
    var scaleCode = isScaleCode();
    if (scaleCode) {
      searchTerm = scaleCode.id;
      this.qtyMatch = scaleCode.qty;
    }

    this.helightItem();

    let searchWords = this.searchValue.split(' ');

    for (let i = 0; i < searchWords.length; i++) {
      const qtyPattern = /([xX\*\+\-])(\d+(\.\d+)?)$/;
      const match = searchWords[i].match(qtyPattern);
      if (match) {
        searchTerm = this.searchValue.replace(searchWords[i], searchWords[i].replace(qtyPattern, ''));
        this.qtyMatch = match[2] ? parseFloat(match[2]) : 1;
      }
    }

    const searchUrl = `/search?keyword=${searchTerm}&schema=${this.viewReceipts ? 'sales' : 'inventory_items'}`;
    this.http.get<any[]>(searchUrl).subscribe({
      next: (response) => {
        if (this.viewReceipts) {
          this.receipts = response.slice().sort((a: any, b: any) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()).slice(0, 30);
        } else {
          this.searchResults = response;
          this.searchResults = response.filter(item => (item.sold || 0) < (item.stock || 0));

          this.helightedItem = 0;
          this.helightItem();

          if ((this.searchResults?.length === 1) && this.addNow) {
            this.onClickItem(this.searchResults[0]);
          }
        }
      },
      error: (error) => { }
    });
    this.helightedItem = 0;
    this.helightItem();
  }

  fetchMostSoldItems() {
    if (this.searchResults.length > 1) {
      return;
    }
    const url = '/sort_by?entity=inventory_items&sort_by=sold&limit=20';
    this.http.get<any[]>(url).subscribe({
      next: (response) => {
        this.searchResults = response;
        this.cachedResults = response;
        this.helightedItem = 0;
        this.helightItem();
      },
      error: (error) => { }
    });
  }

  addToCounter(receipt: any) {
    this.receipt = receipt;
  }

  helightItem() {
    if (!this.searchResults || !this.searchResults.length) return;

    var ilt: any = this.searchResults;
    for (let i = 0; i < ilt.length; i++) {
      ilt[i].selected = i == this.helightedItem;
    }
    this.searchResults = ilt;
  }

  clickHelightedItem() {
    var ilt: any = this.searchResults;
    for (let i = 0; i < ilt.length; i++) {
      if (i == this.helightedItem) {
        this.onClickItem(ilt[i]);
      }
    }
  }

  async updateReceipt() {
    if (!this.receipt.id) {
      const salePayload = {
        barcode: `FDS23`,
        items: this.receipt.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          sale_price: item.sale_price,
          total: item.quantity * item.sale_price
        })),
        total: this.receipt.items.map((item: any) => item.sale_price * item.quantity).reduce((acc: number, item: any) => acc + item, 0),
        paid: this.receipt.paid,
        balance: this.receipt.paid - this.receipt.total,
        timestamp: new Date().toISOString(),
      };
      const headers = { 'Content-Type': 'application/json' };

      this.http.post('/add/sales', salePayload, { headers })
        .subscribe({
          next: (response: any) => {
            this.receipt.id = response.id;
          },
          error: (error: any) => { },
          complete: () => { }
        });
    } else {
      const salePayload = {
        items: this.receipt.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          sale_price: item.sale_price,
          total: item.quantity * item.sale_price
        })),
        total: this.receipt.total,
        paid: this.receipt.paid,
        balance: this.receipt.paid - this.receipt.total,
        timestamp: new Date().toISOString()
      };
      const headers = { 'Content-Type': 'application/json' };

      this.http.put(`/update/sales/${this.receipt.id}`, salePayload, { headers })
        .subscribe({
          next: (response: any) => { },
          error: (error: any) => { },
          complete: () => { }
        });
    }
  }

  onClickPriceSelect(price: string) {
    this.multiplePricesModalVisible.selectedPrice = price;
    this.multiplePricesModalVisible.value = false;
    this.multiplePricesModalVisible.hash = Date.now().toString();
    this.onClickItem({ ...this.multiplePricesModalVisible.item, ...{ sale_price: this.multiplePricesModalVisible.selectedPrice } });
  }

  async onClickItem(item: any) {
    const priceOptions = typeof item.sale_price === 'string' ? item.sale_price.split(',') : [];
    if (priceOptions.length > 1 && this.multiplePricesModalVisible.selectedPrice == '') {
      this.multiplePricesModalVisible = {
        hash: Date.now().toString(),
        value: true,
        prices: priceOptions,
        selectedPrice: '',
        item: item,
        selectedIndex: 0
      };
      return;
    }

    this.multiplePricesModalVisible.selectedPrice = '';
    item.reciptHash = 'CH42' + item.id + item.sale_price;

    var cachedRecipt = {
      ...this.receipt,
      items: this.receipt.items.map((item: any) => ({ ...item }))
    };
    const searchItemIndex = this.searchResults.findIndex((i: any) => i.id === item.id);

    var qty = (this.searchResults[searchItemIndex].stock - this.searchResults[searchItemIndex].sold) < this.qtyMatch ? this.searchResults[searchItemIndex].stock - this.searchResults[searchItemIndex].sold : this.qtyMatch;
    this.qtyMatch = 1;
    if (searchItemIndex !== -1) {
      this.searchResults[searchItemIndex].sold = (this.searchResults[searchItemIndex].sold || 0) + qty;
      if (this.searchResults[searchItemIndex].stock - this.searchResults[searchItemIndex].sold <= 0) {
        this.searchResults.splice(searchItemIndex, 1);
      }
    }

    const existingItemIndex = cachedRecipt.items.findIndex((i: any) => i.reciptHash === item.reciptHash);

    if (existingItemIndex !== -1) {
      cachedRecipt.items[existingItemIndex]['quantity'] += qty;
      cachedRecipt.items[existingItemIndex]['index'] = Date.now();
    } else {
      cachedRecipt.items.push({ ...item, quantity: qty, index: Date.now() });
    }
    await this.updateItemQuantities([{ ...item, quantity: qty }]);
    cachedRecipt.total = cachedRecipt.items.reduce((acc: number, item: any) => {
      return acc + (parseFloat(item.sale_price) * parseFloat(item['quantity'].toString()));
    }, 0);
    cachedRecipt.items.sort((a: any, b: any) => (b.index ?? 0) - (a.index ?? 0));
    this.receipt = cachedRecipt;
    this.searchValue = '';
  }

  updateTotal() {
    this.receipt.total = this.receipt.items.reduce((acc: number, item: any) => {
      return acc + (parseFloat(item.sale_price) * parseFloat(item['quantity'].toString()));
    }, 0);
    this.receipt.items.sort((a: any, b: any) => (b.index ?? 0) - (a.index ?? 0));
    this.onPaidValueChange();
  }

  async removeItem(item: any) {
    const existingItemIndex = this.receipt.items.findIndex((i: any) => i.id === item.id);
    if (existingItemIndex !== -1) {
      this.receipt.items.splice(existingItemIndex, 1);
      await this.updateItemQuantities([{ ...item, quantity: item.quantity * -1 }]);
      this.updateTotal();
    }
    const searchItemIndex = this.searchResults.findIndex((i: any) => i.id === item.id);
    if (searchItemIndex !== -1) {
      const currentSold = this.searchResults[searchItemIndex].sold || 0;
      this.searchResults[searchItemIndex].sold = Math.max(0, currentSold - item.quantity);
      const remainingStock = this.searchResults[searchItemIndex].stock - this.searchResults[searchItemIndex].sold;

      if (remainingStock > 0 && currentSold - item.quantity === 0) {
        await this.updateItemQuantities([{ ...item, quantity: -1 }]);
      }
    } else {
      this.searchResults.push({
        ...item,
        sold: item.quantity
      });

      await this.updateItemQuantities([{ ...item, quantity: -1 }]);
    }
  }

  async sale() {
    if (!this.receipt.items.length || this.receipt.total <= 0 || !((this.cashReceived + this.cardReceived) >= this.receipt.total)) {
      return;
    }

    const salePayload = {
      items: this.receipt.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        sale_price: item.sale_price,
        total: item.quantity * item.sale_price
      })),
      total: this.receipt.total,
      paid: parseFloat(this.cardReceived + this.cashReceived),
      sold: true,
      balance: this.cardReceived + this.cashReceived - this.receipt.total,
      timestamp: new Date().toISOString()
    };

    const headers = { 'Content-Type': 'application/json' };
    this.showLoading = true;
    try {
      let sf2 = await this.reqs.put(`/update/sales/${this.receipt.id}`, salePayload);
      this.printReceipt(this.receipt.id);
      this.resetReceipt();
    } catch (error: any) {
      alert('An error occurred while processing the sale. Please try again.');
    }
  }

  async updateItemQuantities(items: any[]): Promise<void> {
    for (const item of items) {
      try {
        if (item.id) {
          const fetchedItem: any = await this.http.get(`/read/inventory_items/${item.id}`).toPromise();
          const soldQuantity = (fetchedItem.sold || 0) + item.quantity;
          const updatePayload = {
            ...fetchedItem,
            ...{ sold: soldQuantity }
          };

          await this.http.put(`/update/inventory_items/${item.id}`, updatePayload, { headers: { 'Content-Type': 'application/json' } }).toPromise();
        }
      } catch (error) { }
    }
    await this.updateReceipt();
    return Promise.resolve();
  }

  async printReceipt(refCode: string) {
    const htmlContent: any = await this.generateHTMLContent(refCode);
    try {
      var browserPrint = true;
      var response: any;
      if (browserPrint) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      } else {
        response = await fetch('/print-html', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            printerName: this.printersList[this.selectedPrinter],
            htmlContent: htmlContent,
            refCode: refCode
          }),
        });
      }
    } catch (error) { }
  }

  async generateHTMLContent(refCode: string): Promise<string> {
    const theme = JSON.parse(localStorage.getItem('theme') || '{}');
    const businessLogo = theme.receipt_header || theme.business_logo || '';
    const bottom_image = theme.receipt_bottom || '';
    const businessName = theme.business_name || '';

    function generateBarcode(value: any): Promise<string | null> {
      return new Promise((resolve) => {
        const width = 80;
        const canvas = document.createElement('canvas');
        const dpi = 300;
        const canvasWidthPx = Math.ceil((width / 25.4) * dpi);
        const barWidthPx = 2;
        const barHeightPx = 40;
        canvas.width = canvasWidthPx;
        canvas.height = barHeightPx + 20;

        try {
          JsBarcode(canvas, value, {
            format: 'CODE128',
            width: barWidthPx,
            height: barHeightPx,
            displayValue: true,
            margin: 0
          });
          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          resolve(null);
        } finally {
          canvas.remove();
        }
      });
    }

    const formatDate = (date: Date): string => {
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    };

    function formatPrice(amount: any) {
      return `${new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount).replace('LKR', '').trim()}`;
    }

    const receiptItemsHTML = this.receipt.items
      .map((item: any) => `
        <tr class="receipt-${refCode}-item">
          <td class="receipt-${refCode}-item-name">${item.name}</td>
          <td class="receipt-${refCode}-item-quantity">x${item.quantity}</td>
          <td class="receipt-${refCode}-item-price">Rs ${formatPrice(parseFloat((item.sale_price * item.quantity).toString()).toFixed(2))}</td>
        </tr>
      `)
      .join('');

    const barcodeDataUrl = await generateBarcode(refCode);

    if (barcodeDataUrl) {
      await new Promise<void>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = barcodeDataUrl;
      });
    }

    const htmlContent = `
      <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
      .receipt-${refCode}-container {
        width: 75mm;
        margin: 0 auto;
        background: #fff;
        font-size: 13px;
        font-family: 'Inter', 'Rubik', Arial, sans-serif;
        border-radius: 12px;
        box-shadow: 0 2px 16px rgba(0,0,0,0.08);
        padding: 24px 18px 18px 18px;
      }
      .receipt-${refCode}-business-logo {
        text-align: center;
        margin-bottom: 10px;
        padding-top: 0.5rem;
      }
      .receipt-${refCode}-business-logo img {
        max-width: 80px;
        max-height: 80px;
        border-radius: 8px;
        box-shadow: 0 1px 6px rgba(0,0,0,0.07);
      }
      .receipt-${refCode}-title {
        text-align: center;
        margin: 0;
        padding-bottom: 8px;
        font-size: 22px;
        font-weight: 600;
        color: #222;
        letter-spacing: 0.5px;
      }
      .receipt-${refCode}-details {
        text-align: center;
        margin-bottom: 18px;
        font-size: 13px;
        color: #6b7280;
      }
      .receipt-${refCode}-details div {
        margin: 2px 0;
      }
      .receipt-${refCode}-table {
        width: 100%;
        margin-bottom: 18px;
        border-collapse: collapse;
      }
      .receipt-${refCode}-table th,
      .receipt-${refCode}-table td {
        padding: 7px 0;
      }
      .receipt-${refCode}-table th {
        border-bottom: 2px solid #e5e7eb;
        font-weight: 600;
        font-size: 13px;
        color: #374151;
        background:rgb(255, 255, 255);
      }
      .receipt-${refCode}-table td {
        border-bottom: 1px solidrgb(255, 255, 255);
        font-size: 13px;
        color: #222;
      }
      .receipt-${refCode}-item-name {
        text-align: left !important;
      }
      .receipt-${refCode}-item-quantity {
        text-align: center !important;
      }
      .receipt-${refCode}-item-price {
        text-align: right !important;
      }
      .receipt-${refCode}-total-section,
      .receipt-${refCode}-paid-section,
      .receipt-${refCode}-balance-section {
        font-size: 15px;
        margin: 8px 0;
        padding: 7px 0 2px 0;
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solidrgb(255, 255, 255);
      }
      .receipt-${refCode}-total-section {
        color: #2563eb;
        font-weight: 600;
      }
      .receipt-${refCode}-paid-section {
        color: #059669;
      }
      .receipt-${refCode}-balance-section {
        color: #f59e42;
      }
      .receipt-${refCode}-barcode {
        text-align: center;
        margin-top: 18px;
      }
      .receipt-${refCode}-barcode img {
        height: 40px;
        max-width: 100%;
        background:rgb(255, 255, 255);
        padding: 4px;
        border-radius: 4px;
      }
      .receipt-${refCode}-qr-code {
        text-align: center;
        margin-top: 18px;
      }
      .receipt-${refCode}-qr-code img {
        height: 68px;
        border-radius: 8px;
        background: #f3f4f6;
        padding: 4px;
      }
      .receipt-${refCode}-qr-code-text {
        font-size: 12px;
        color: #6b7280;
        margin-top: 4px;
        letter-spacing: 1px;
      }
      .receipt-${refCode}-footer {
        text-align: center;
        margin-top: 22px;
        font-size: 12px;
        color: #9ca3af;
      }
      .receipt-${refCode}-footer img {
        max-width: 100%;
        height: auto;
        margin-top: 8px;
        border-radius: 6px;
      }
      .receipt-${refCode}-social-links {
        margin-top: 10px;
      }
      .receipt-${refCode}-social-links a {
        color: #2563eb;
        margin: 0 6px;
        text-decoration: none;
        font-size: 13px;
        transition: color 0.2s;
      }
      .receipt-${refCode}-social-links a:hover {
        color: #d9534f;
      }
      </style>
      <div class="receipt-${refCode}-container">
      <div class="receipt-${refCode}-business-logo">
        ${businessLogo ? `<img src="${businessLogo}" alt="Business Logo" />` : `<h2 class="receipt-${refCode}-title">${businessName}</h2>`}
      </div>
      <div class="receipt-${refCode}-details">
        <div>Date: ${formatDate(new Date())}</div>
      </div>
      <table class="receipt-${refCode}-table">
        <thead>
        <tr class="receipt-${refCode}-header">
          <th class="receipt-${refCode}-header-item">Item</th>
          <th class="receipt-${refCode}-header-quantity">Qty</th>
          <th class="receipt-${refCode}-header-price">Price</th>
        </tr>
        </thead>
        <tbody>
        ${receiptItemsHTML}
        </tbody>
      </table>
      <div class="receipt-${refCode}-total-section">
        <span>Total:</span>
        <span>Rs ${formatPrice(this.receipt.total)}</span>
      </div>
      <div class="receipt-${refCode}-paid-section">
        <span>Paid:</span>
        <span>Rs ${formatPrice(this.receipt.paid)}</span>
      </div>
      <div class="receipt-${refCode}-balance-section">
        <span>Balance:</span>
        <span>Rs ${formatPrice(this.receipt.paid - this.receipt.total)}</span>
      </div>
      <div class="receipt-${refCode}-barcode">
        <img src="${barcodeDataUrl}" alt="Barcode" />
      </div>
      <div class="receipt-${refCode}-footer">
        ${bottom_image
        ? `<img src="${bottom_image}" alt="Business Logo" />`
        : `<p>Thank you for your purchase!</p>
          ${theme?.business_contact_number ? `<p>Contact us: ${theme.business_contact_number}</p>` : ''}`
      }
      </div>
      </div>
    `;
    return htmlContent;
  }

  async generatePDF(htmlContent: string): Promise<void> {
    try {
      const container = document.createElement('div');
      container.style.width = '80mm';
      container.style.padding = '0';
      container.style.margin = '0';
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      document.body.removeChild(container);

      const pdfBlob = pdf.output('blob');
      await this.printPDF(pdfBlob);
    } catch (error: any) {
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  async printPDF(pdfBlob: Blob): Promise<void> {
    try {
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
      };
    } catch (error: any) {
      throw new Error(`PDF printing failed: ${error.message}`);
    }
  }

  downloadPDF(pdfBlob: Blob, fileName: string): void {
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }

  addCustomItem() {
    if (this.validateNewItem(this.newItem)) {
      this.receipt.items.push({ ...this.newItem });
      this.resetNewItem();
      this.customItemAddModalVisible = { hash: '', value: false };
    } else {
      alert('Please fill out all required fields.');
    }
  }

  resetNewItem() {
    this.newItem = {};
  }

  validateNewItem(item: any) {
    return item.name && item.quantity >= 0 && item.sale_price >= 0;
  }

  resetReceipt() {
    this.receipt = {
      items: [],
      total: 0,
      paid: 0,
      balance: 0
    };
    this.showLoading = false;
    this.cashReceived = '';
    this.cardReference = '';
    this.cardReceived = '';
    this.toggleSaleProcessing();
  }

  displayShortcuts() {
    const shortcuts = [
      { keys: 'Shift + S', action: 'Focus on the search input' },
      { keys: 'Shift + Backspace', action: 'Clear the search' },
      { keys: 'Shift + H', action: 'Toggle view of receipts' },
      { keys: 'Ctrl + (0-9 or .)', action: 'Increment quantity of the last item' },
      { keys: 'Arrow Right', action: 'Trigger sale if held for 600ms' },
    ];

    const shortcutsList: any = document.getElementById('shortcuts-list');
    shortcutsList.innerHTML = '';

    shortcuts.forEach(shortcut => {
      const row = document.createElement('tr');
      const keyCell = document.createElement('td');
      keyCell.textContent = shortcut.keys;
      const actionCell = document.createElement('td');
      actionCell.textContent = shortcut.action;
      row.appendChild(keyCell);
      row.appendChild(actionCell);
      shortcutsList.appendChild(row);
    });
  }
}