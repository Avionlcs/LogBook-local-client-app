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
import { PieChartComponent } from '../pie-chart/pie-chart.component';
import { Step2Component } from './step2/step2.component';

@Component({
  selector: 'app-full-report',
  standalone: true,
  imports: [ModalPopupComponent, CommonModule, FormsModule, DateTimePickerComponent, PieChartComponent, Step2Component],
  templateUrl: './full-report.component.html',
  styleUrl: './full-report.component.scss'
})
export class FullReportComponent implements AfterViewInit {
  modalVisible2A3: any = { hash: '', value: false };
  selectedSellar: any = null;
  step: number = 0;

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

  ngAfterViewInit() {
    this.focusFirstInput();
  }

  changeModalVisible(vl: boolean) {
    this.modalVisible2A3 = { hash: Date.now(), value: vl };
    setTimeout(() => this.focusFirstInput(), 0);
  }

  focusFirstInput() {
    const items = this.focusables.toArray();
    if (items?.length > 0) {
      this.currentIndex = 0;
      items[0].nativeElement.focus();
    }
  }

  setFocusIndex(index: number) {
    this.currentIndex = index;
  }

  onDateTimeChange(e: any) { }

  getCardTotal(): number {
    return (
      Number(this.moneyCount.VISAMASTER) +
      Number(this.moneyCount.AMEX)
    );
  }

  getCashTotal(): number {
    return (
      Number(this.moneyCount.M5000) * 5000 +
      Number(this.moneyCount.M1000) * 1000 +
      Number(this.moneyCount.M500) * 500 +
      Number(this.moneyCount.M100) * 100 +
      Number(this.moneyCount.M50) * 50 +
      Number(this.moneyCount.M20) * 20
    );
  }

  getCoinTotal(): number {
    return (
      Number(this.moneyCount.MC10) * 10 +
      Number(this.moneyCount.MC5) * 5 +
      Number(this.moneyCount.MC2) * 2 +
      Number(this.moneyCount.MC1) * 1
    );
  }

  getGrandTotal(): number {
    return this.getCardTotal() + this.getCashTotal() + this.getCoinTotal();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (!this.modalVisible2A3.value) return;

    const items = this.focusables.toArray();
    if (!items?.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.currentIndex = (this.currentIndex + 1) % items?.length;
      items[this.currentIndex].nativeElement.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.currentIndex = (this.currentIndex - 1 + items?.length) % items?.length;
      items[this.currentIndex].nativeElement.focus();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.currentIndex = (this.currentIndex - 1 + items?.length) % items?.length;
      items[this.currentIndex].nativeElement.focus();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.currentIndex = (this.currentIndex + 1) % items?.length;
      items[this.currentIndex].nativeElement.focus();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.currentIndex < items?.length - 1) {
        this.currentIndex = (this.currentIndex + 1) % items?.length;
        items[this.currentIndex].nativeElement.focus();
      } else {
        const btn = document.querySelector('.button') as HTMLElement;
        if (btn) btn.click();
      }
      return;
    }

    if (event.key?.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const el = items[this.currentIndex].nativeElement as HTMLInputElement;
      if (el.tagName === 'INPUT') {
        el.value += event.key;
        el.dispatchEvent(new Event('input'));
        event.preventDefault();
      }
    }
  }
}