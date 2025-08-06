import {
  Component,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
  HostListener
} from '@angular/core';
import { ModalPopupComponent } from '../../../../components/modal-popup/modal-popup.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateTimePickerComponent } from '../date-time-picker/date-time-picker.component';

@Component({
  selector: 'app-full-report',
  standalone: true,
  imports: [ModalPopupComponent, CommonModule, FormsModule, DateTimePickerComponent],
  templateUrl: './full-report.component.html',
  styleUrl: './full-report.component.scss'
})
export class FullReportComponent implements AfterViewInit {
  modalVisible2A3: any = { hash: '', value: false };
  selectedSellar: any = null;
  sellars: any[] = [];
  moneyCount: any = {
    VISAMASTER: 0,
    AMEX: 0,
    M5000: 0,
    M1000: 0,
    M500: 0,
    M100: 0,
    M50: 0,
    M20: 0,
    MC20: 0,
    MC10: 0,
    MC5: 0,
    MC2: 0,
    MC1: 0
  };

  @ViewChildren('focusable') focusables!: QueryList<ElementRef<HTMLInputElement | HTMLSelectElement>>;
  currentIndex = 0;

  ngOnInit() {
    this.getAllSellars();
  }

  ngAfterViewInit() {
    this.focusFirstInput();
  }

  changeModalVisible(vl: boolean) {
    this.modalVisible2A3 = { hash: Date.now(), value: vl };
    // Delay focus until modal fully rendered
    setTimeout(() => this.focusFirstInput(), 0);
  }

  focusFirstInput() {
    const items = this.focusables.toArray();
    if (items.length > 0) {
      this.currentIndex = 0;
      items[0].nativeElement.focus();
    }
  }

  getAllSellars() {
    fetch('/api/reportings/sales/get-all-sellars')
      .then(response => response.json())
      .then(data => {
        this.sellars = data;
      })
      .catch(error => {
        console.error('Error fetching sellars:', error);
      });
  }

  onDateTimeChange(e: any) { }

  // Handle keyboard navigation and auto-typing
  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (!this.modalVisible2A3.value) return;

    const items = this.focusables.toArray();
    if (!items.length) return;

    // Navigate with Arrow Up / Down
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.currentIndex = (this.currentIndex + 1) % items.length;
      items[this.currentIndex].nativeElement.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.currentIndex = (this.currentIndex - 1 + items.length) % items.length;
      items[this.currentIndex].nativeElement.focus();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.currentIndex = (this.currentIndex - 1 + items.length) % items.length;
      items[this.currentIndex].nativeElement.focus();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.currentIndex = (this.currentIndex + 1) % items.length;
      items[this.currentIndex].nativeElement.focus();
      return;
    }

    // Type into focused input (numbers/characters)
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const el = items[this.currentIndex].nativeElement as HTMLInputElement;
      if (el.tagName === 'INPUT') {
        el.value += event.key; // append typed character
        el.dispatchEvent(new Event('input')); // trigger ngModel
        event.preventDefault();
      }
    }
  }
}
