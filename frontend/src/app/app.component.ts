import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { OrientationService } from './services/orientation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'LogBook';
  isDesktop: boolean = true;
  isRestrictedRoute: boolean = false;
  restrictedRoutes = ['/signin', '/signup', '/unauthorized'];

  constructor(private http: HttpClient, private router: Router, private orientationService: OrientationService) { }

  ngOnInit(): void {
    if (this.orientationService.isMobileDevice()) {
    }
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isRestrictedRoute = this.restrictedRoutes.includes(event.urlAfterRedirects);
      }
    });
    this.loadThemeFromAPI();
  }

  changeOrientation() {
    if (this.orientationService.isMobileDevice()) {
      this.orientationService.lockToLandscape();
      this.isDesktop = true;
    }
  }

  loadThemeFromAPI() {
    this.http.get('/read/theme/1').subscribe((theme: any) => {
      this.applyTheme(theme);
    });
  }

  applyTheme(theme: any) {
    localStorage.setItem('theme', JSON.stringify(theme));
    if (!theme || typeof theme !== 'object') return;
    if (theme.styles?.variables && typeof theme.styles.variables === 'object') {
      Object.entries(theme.styles.variables).forEach(([key, value]) => {
        if (typeof value === 'string') {
          document.documentElement.style.setProperty(`--${key.replace(/_/g, '-')}`, value);
        }
      });
    }
  }
}
