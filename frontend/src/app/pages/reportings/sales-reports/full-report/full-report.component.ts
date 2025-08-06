import { Component } from '@angular/core';
import { ModalPopupComponent } from '../../../../components/modal-popup/modal-popup.component';

@Component({
  selector: 'app-full-report',
  standalone: true,
  imports: [ModalPopupComponent],
  templateUrl: './full-report.component.html',
  styleUrl: './full-report.component.scss'
})
export class FullReportComponent {
  modalVisible2A3: any = { hash: '', value: false };

  changeModalVisible(vl: boolean) {
    this.modalVisible2A3 = { hash: Date.now(), value: vl }
  }
}
