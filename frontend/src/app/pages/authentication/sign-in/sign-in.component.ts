import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { GoogleAuthComponent } from '../google-auth/google-auth.component';
import { LoadingComponent } from '../../../components/loading/loading.component';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    HttpClientModule,
    RouterModule,
    GoogleAuthComponent,
    LoadingComponent
  ],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})
export class SignInComponent {
  phoneNumber: string = '';
  password: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  loading: any = { hash: '62', value: false };

  constructor(private router: Router, private http: HttpClient) { }

  onGoogleAuthLoading(isLoading: any): void {
    console.log('Google Auth Loading:', isLoading);
    this.loading = { ...this.loading, value: isLoading.value };
  }

  onSubmit() {
    // Reset messages
    this.errorMessage = '';
    this.successMessage = '';

    // Validation
    if (!this.phoneNumber || !this.password) {
      this.errorMessage = 'Phone number and password are required';
      return;
    }

    this.loading = { hash: Date.now(), value: true };

    this.http.post<{ token: string; message?: string }>('/signin', {
      phoneNumber: this.phoneNumber,
      password: this.password
    }).subscribe({
      next: (response) => {
        localStorage.setItem('authToken', response.token);
        this.successMessage = response.message || 'Sign-in successful!';
        this.loading = { hash: Date.now(), value: false };
        this.router.navigate(['/home']);
      },
      error: (error) => {
        this.loading = { hash: Date.now(), value: false };
        this.errorMessage = error?.error?.message || 'Error signing in. Please try again.';
        console.error('Sign-in error:', error);
      }
    });
  }

  navigateToSignup() {
    this.loading = true;
    // this.router.navigate(['/signup']);
  }
}
