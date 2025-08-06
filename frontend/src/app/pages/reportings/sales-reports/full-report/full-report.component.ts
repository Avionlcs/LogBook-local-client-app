import { Component } from '@angular/core';
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
export class FullReportComponent {
  modalVisible2A3: any = { hash: '', value: false };
  selectedSellar: any = null;
  sellars: any[] = [];
  moneyCount: any = {
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
  coinsCount: any;
  reportType: string = "daily";

  ngOnInit() {
    this.getAllSellars();
  }

  changeModalVisible(vl: boolean) {
    this.modalVisible2A3 = { hash: Date.now(), value: vl }
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

  onDateTimeChange(e: any) {

  }
}
