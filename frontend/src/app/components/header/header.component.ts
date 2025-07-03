import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ModalPopupComponent } from '../modal-popup/modal-popup.component';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../../pages/authentication/authentication.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CreditTopUpComponent } from '../credit-top-up/credit-top-up.component';
import { AccountComponent } from './account/account.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    ModalPopupComponent,
    CommonModule,
    HttpClientModule,
    FormsModule,
    CreditTopUpComponent,
    AccountComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  port: string = '';
  modalVisible: any = { hash: '', value: false };
  networkInterfaces: any = null;
  theme: any;
  isMobile: boolean = false;
  private intervalId: any;

  constructor(
    private http: HttpClient,
    private auth: AuthenticationService,
    private router: Router
  ) {
    this.port = window.location.port;
    this.getNetworkInterfaces();
  }

  ngOnInit() {
    this.setTheme();
  }

  ngOnDestroy() { }

  setTheme() {
    this.theme = this.auth.getStoredTheme();
  }

  toggleModal() {
    this.modalVisible = {
      hash: Date.now().toString(),
      value: this.modalVisible.value ? false : true
    };
  }

  ipWithPortToCustomText(ip: string, port: string | number): string {
    const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const convertToCustomText = (num: number): string => {
      let result = '';
      do {
        result = charSet[num % charSet.length] + result;
        num = Math.floor(num / charSet.length);
      } while (num > 0);
      return result;
    };
    const ipText = ip
      .split('.')
      .map(part => convertToCustomText(parseInt(part)))
      .join(' ');
    const portText = convertToCustomText(Number(port));
    return `${ipText}|${portText}`;
  }

  getNetworkInterfaces() {
    this.http.get('/network-interfaces').subscribe(
      res => this.networkInterfaces = res,
      err => console.error('Error fetching network interfaces', err)
    );
  }

  signOut() {
    this.auth.signOut();
    this.router.navigate(['/signin']);
  }
}
