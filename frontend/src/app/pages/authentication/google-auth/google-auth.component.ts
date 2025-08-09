import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-google-auth',
  imports: [CommonModule, LoadingComponent],
  templateUrl: './google-auth.component.html',
  styleUrls: ['./google-auth.component.scss']
})
export class GoogleAuthComponent implements OnInit {
  private router = inject(Router);
  loading: boolean = false;

  ngOnInit() {
    // @ts-ignore
    google.accounts.id.initialize({
      client_id: '1012711247018-rat4mho4oav87obdrpmi0gcj32vb7d32.apps.googleusercontent.com',
      callback: (response: any) => this.handleCredentialResponse(response),
    });

    // @ts-ignore
    google.accounts.id.renderButton(
      document.getElementById('google-auth-button'),
      {
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
        type: 'standard'
      }
    );
  }

  c() {
    this.loading = true;
  }

  private handleCredentialResponse(response: { credential: string }) {
    fetch('/api/verify-google-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: response.credential }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          //console.log('+++++++ ', data);
          localStorage.setItem('authToken', data.token);

          this.router.navigate(['/home']);
        }
      })
      .catch(err => console.error('Error:', err));
  }
}
