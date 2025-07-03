import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AuthenticationService } from '../../../pages/authentication/authentication.service';
import { Router } from '@angular/router';
import { ModalPopupComponent } from '../../modal-popup/modal-popup.component';


@Component({
  selector: 'app-account',
  standalone: true,
  imports: [ModalPopupComponent],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss'
})
export class AccountComponent {
  modalVisible: any = { hash: '', value: false };
  constructor(
    private http: HttpClient,
    private auth: AuthenticationService,
    private router: Router
  ) {

    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.altKey && event.key === 'a') {
        this.modalVisible = {
          hash: Date.now().toString(),
          value: true
        };

      }
    });
  }
  signOut() {
    this.auth.signOut();
    this.router.navigate(['/signin']);
  }
}
