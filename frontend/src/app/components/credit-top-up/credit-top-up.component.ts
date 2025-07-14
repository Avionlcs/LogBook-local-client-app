import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalPopupComponent } from '../modal-popup/modal-popup.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { lastValueFrom } from 'rxjs';
import { hash } from 'crypto';

interface BalanceResponse {
  balance: number;
}

interface RechargeResponse {
  updatedCredits: number;
}

interface IpgOrderResponse {

  payUrl: string;

}

interface ModalContent {
  message: string;
  type?: 'success' | 'error';
  payUrl?: string;
}

@Component({
  selector: 'app-credit-top-up',
  standalone: true,
  imports: [FormsModule, CommonModule, ModalPopupComponent],
  templateUrl: './credit-top-up.component.html',
  styleUrls: ['./credit-top-up.component.scss']
})
export class CreditTopUpComponent implements OnInit, OnDestroy {
  balance: number = 0;
  rechargeCode: string = '';
  rechargeAmount: number = 0;
  rechargeMode: boolean = false;
  creditRechargeCode: string = '';
  creditRechargeMode: boolean = false;
  modalVisible: any = { hash: '', value: false };
  paymentAmount: any;
  modalContent: ModalContent | null = null;
  modalData: any = {
    state: 'topup',
    paymentOptions: {
      state: 'select'
    }
  };
  trustedIpgUrl: SafeResourceUrl | null = null;
  logs: any[] = [];

  private intervalId: any;
  private readonly API_KEY = environment.IPG_API_KEY;
  private readonly SANDBOX = environment.production ? false : true;

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) { }

  ngOnInit() {
    this.fetchBalance();
    this.intervalId = setInterval(() => this.fetchBalance(), 10000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  fetchBalance() {
    this.http.get<BalanceResponse>('/creditBalance').subscribe({
      next: (res) => {
        this.balance = res.balance
      },
      error: () => this.showErrorModal('Failed to fetch balance. Please try again later.')
    });
  }

  setAmount(amount: number) {
    this.paymentAmount = amount;
  }

  toggleRechargeMode() {
    this.rechargeMode = !this.rechargeMode;
  }

  toggleCreditRechargeMode() {

    this.modalVisible = {
      hash: Date.now().toString(),
      value: true
    };
  }

  selectRechargeMode(mode: string) {
    this.modalData.paymentOptions.state = mode;
  }

  async createIpgOrder(): Promise<string> {
    const req = {
      amount: this.paymentAmount,
      customerMail: 'default@email.com',
      customerMobile: '+94712345678',
      returnLink: `${window.location.host}`
    };
    const url = 'http://app.logbook.lk/api/create-payment-link';
    const headers = new HttpHeaders().set('merchant-api-key', 'this.API_KEY');
    const res = await lastValueFrom(this.http.post<IpgOrderResponse>(url, req, { headers }));
    this.trustedIpgUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.payUrl);
    this.openPayment(res.payUrl);
    this.modalData.paymentOptions.state = 'ipgPending';
    return res.payUrl;
  }

  private showModal(content: ModalContent) {
    this.modalContent = content;
    this.modalVisible = {
      hash: Date.now().toString(),
      value: true
    };
  }

  private showErrorModal(message: string) {
    this.showModal({ message, type: 'error' });
  }

  changeModalState(state: string) {
    this.modalData.state = state;
  }

  openPayment(url: string) {
    window.open(url, '_blank', 'width=1000,height=600');
  }

  async fetchLogs() {
    try {
      const res: any = await lastValueFrom(this.http.get<any[]>('/creditLogs'));
      this.logs = res.creditLogs;
    } catch (error) {
      this.showErrorModal('Failed to fetch logs. Please try again later.');
    }
  }
}