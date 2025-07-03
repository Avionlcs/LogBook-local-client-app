import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../authentication/authentication.service';

@Component({
  selector: 'app-unauthoriced',
  standalone: true,
  imports: [],
  templateUrl: './unauthoriced.component.html',
  styleUrls: ['./unauthoriced.component.scss']
})
export class UnauthoricedComponent {
  constructor(private router: Router, private auth: AuthenticationService) { }

  navigate() {
    this.router.navigate(['/']);
  }

  logout() {
    this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
