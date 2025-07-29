import { Component } from '@angular/core';
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
  name: string = '';
  phoneNumber: string = '';
  password: string = '';
  passwordConfirm: string = '';

  errorMessage: string = '';
  phoneError: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  nameError: string = '';

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

  validatePhoneNumber() {
    this.phoneError = '';

    if (!this.phoneNumber) {
      this.phoneError = 'Phone number is required';
      return;
    }
    const phoneRegex = /^(?:0(71|72|75|76|77|78|79|5\d|[6-9]\d|[1-4]\d|[5-9][1-9]|\d{1,2})\d{7}|\+94(71|72|75|76|77|78|79|5\d|[6-9]\d|[1-4]\d|[5-9][1-9]|\d{1,2})\d{7})$/;
    if (!phoneRegex.test(this.phoneNumber)) {
      this.phoneError = 'Invalid phone number format';
      return;
    }

    // Call backend API to check if number exists
    this.http.get<{ valid: boolean }>(`/validatePhoneNumber/${encodeURIComponent(this.phoneNumber)}`)
      .subscribe({
        next: (res) => {
          // If valid = true, phone is not registered
          this.phoneError = '';
        },
        error: (err) => {
          if (err.status === 400) {
            // Phone already exists
            this.phoneError = err.error?.error || 'Phone number already exists';
          } else {
            console.error('Error validating phone number:', err);
            this.phoneError = 'Could not validate phone number. Try again.';
          }
        }
      });
  }

  checkPhoneExists(phone: string) {
    // Make GET request to your search API endpoint
    this.http.get<any[]>(`/read_key_value/user/search/phoneNumber/${encodeURIComponent(phone)}`)
      .subscribe({
        next: (results) => {
          if (results.length > 0) {
            this.phoneError = 'Phone number already registered';
          } else {
            this.phoneError = '';
          }
        },
        error: (err) => {
          console.error('Error checking phone existence', err);
          // optionally clear or set a generic error
        }
      });
  }


  onSubmit() {
    // Reset messages
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.name) {
      this.nameError = 'Name is required';
      return;
    }
    // Basic validation
    if (!this.name || !this.phoneNumber || !this.password) {
      this.errorMessage = 'All fields are required';
      return;
    }

    this.isLoading = true;

    this.http.post<{ token: string; message?: string }>('/signup', {
      name: this.name,
      phoneNumber: this.phoneNumber,
      password: this.password
    }).subscribe({
      next: (response) => {
        localStorage.setItem('authToken', response.token);
        this.successMessage = response.message || 'User registered successfully!';
        this.isLoading = false;
        this.router.navigate(['/home']);
      },
      error: (error) => {
        this.isLoading = false;
        console.log('Signup error:', error);

        if (error.error?.error?.phoneNumber) {
          this.phoneError = error.error.error.phoneNumber;
        } else {
          this.errorMessage = error.error?.error || error.error?.message || 'Error signing up. Please try again.';
        }

        console.error('Signup error:', error);
      }
    });
  }

  navigateToSignin() {
    this.router.navigate(['/signin']);
  }
}
