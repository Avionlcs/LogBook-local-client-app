import { Component } from '@angular/core';
import { AuthenticationService } from '../authentication.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PasswordMatchDirective } from './password-match.directive';
import { PasswordStrengthDirective } from './password-strength.directive';
import { GoogleAuthComponent } from '../google-auth/google-auth.component';
import { LoadingComponent } from '../../../components/loading/loading.component';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    HttpClientModule,
    RouterModule,
    PasswordStrengthDirective,
    PasswordMatchDirective,
    GoogleAuthComponent,
    LoadingComponent
  ],
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent {
  firstName: string = '';
  lastName: string = '';
  phoneNumber: string = '';
  password: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  email = '';
  passwordConfirm = '';
  isLoading: boolean = false;

  passwordRequirements = {
    length: false,
    uppercase: false,
    lowercase: false,
    digit: false,
    special: false
  };

  constructor(private router: Router, private http: HttpClient) { }

  hasAnyRequirementMet(): boolean {
    return Object.values(this.passwordRequirements).some(Boolean);
  }

  updatePasswordRequirements(password: string) {
    this.passwordRequirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      digit: /\d/.test(password),
      special: /[^a-zA-Z0-9]/.test(password)
    };
  }

  onSubmit() {
    this.isLoading = true;
    this.http.post<{ token: string }>('/signup', {
      firstName: this.firstName,
      lastName: this.lastName,
      phoneNumber: this.phoneNumber,
      password: this.password
    }).subscribe(
      response => {

        localStorage.setItem('authToken', response.token);


        this.successMessage = 'User registered successfully!';



        this.router.navigate(['/home']); // or any route you prefer
      },
      error => {
        this.errorMessage = error?.error?.message || 'Error signing up. Please try again.';
      }
    );
  }

  navigateToSignin() {
    this.router.navigate(['/signin']);
  }
}
