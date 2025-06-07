import { Component } from '@angular/core';
import { AuthenticationService } from '../authentication.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { GoogleAuthComponent } from '../google-auth/google-auth.component';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { hash } from 'crypto';

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
    // Ensure you update the loading object reference to trigger Angular change detection
    this.loading = { ...this.loading, value: isLoading.value };
  }


  onSubmit() {
    this.loading = { hash: Date.now(), value: true };
    this.http.post<{ token: string }>('/signin', {
      phoneNumber: this.phoneNumber,
      password: this.password
    }).subscribe(
      response => {
        localStorage.setItem('authToken', response.token);

        this.successMessage = 'User registered successfully!';

        this.router.navigate(['/home']);
      },
      error => {
        this.errorMessage = error?.error?.message || 'Error signing up. Please try again.';
      }
    );
  }

  navigateToSignup() {
    this.loading = true;
    // this.router.navigate(['/signup']);
  }

}
