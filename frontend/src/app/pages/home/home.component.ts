import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication/authentication.service';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { HeaderComponent } from '../../components/header/header.component';
import { FirestoreService } from '../../services/firestore.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent,
    HeaderComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {

  home_data: any = {
    stamp: {
      from: new Date(new Date().setDate(new Date().getDate() - 1)),
      to: new Date(new Date().setDate(new Date().getDate() + 1)),
    },
    sales: { quantity: 0, totalValue: 0, average: 0 },
    products: {
      inStock: { variations_count: 0, stock_count: 0, value: 0 },
      lowStock: { quantity: 0, value: 0 },
      outOfStock: { quantity: 0, value: 0 },
    }
  };

  showStartDatePicker = false;
  showEndDatePicker = false;
  startDateTime = '';
  endDateTime = '';

  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private http: HttpClient,
    private auth: AuthenticationService,
    private firestoreService: FirestoreService
  ) { }

  ngOnInit() {
    this.initializeDateTime();
    this.loadData();
    // this.setDashboardHeight();
    // window.addEventListener('resize', () => {
    //   this.setDashboardHeight();
    // });
  }

  // setDashboardHeight(): number {
  //   const element = document.querySelector('.title-row') as HTMLElement;
  //   const element2 = document.querySelector('.loading-spinner') as HTMLElement;
  //   const element3 = document.querySelector('.error-message') as HTMLElement;
  //   var heights = element?.offsetHeight || 0 + element2?.offsetHeight || 0 + element3?.offsetHeight || 0 + element3?.offsetHeight || 0;
  //   const dashboardCards = document.querySelector('.dashboard-cards') as HTMLElement;
  //   const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

  //   if (dashboardCards) {
  //     dashboardCards.style.height = `${vh - heights - heights / 1.5}px`;
  //   }
  //   console.log('Viewport Height (vh):', vh);
  //   console.log('Title Row Height:', heights);

  //   return heights;
  // }

  initializeDateTime() {
    this.startDateTime = this.formatDateTime(this.home_data.stamp.from);
    this.endDateTime = this.formatDateTime(this.home_data.stamp.to);
  }

  formatDateTime(date: Date): string {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  parseDateTime(dateTimeStr: string): Date {
    return new Date(dateTimeStr);
  }

  toggleStartDatePicker() {
    this.showStartDatePicker = !this.showStartDatePicker;
  }

  toggleEndDatePicker() {
    this.showEndDatePicker = !this.showEndDatePicker;
  }

  updateStartDateTime() {
    if (this.startDateTime) {
      this.home_data.stamp.from = this.parseDateTime(this.startDateTime);
      this.loadData();
    }
  }

  updateEndDateTime() {
    if (this.endDateTime) {
      this.home_data.stamp.to = this.parseDateTime(this.endDateTime);
      this.loadData();
    }
  }

  reloadData() {
    this.loadData();
  }

  async loadData() {
    const fromISO = this.home_data.stamp.from.toISOString();
    const toISO = this.home_data.stamp.to.toISOString();
    const apiUrl = `/api/proxy/dashboard_info/${fromISO}/${toISO}`;

    this.errorMessage = '';

    try {
      const response: any = await lastValueFrom(this.http.get(apiUrl));
      this.home_data = this.mapResponse(response);
      this.startDateTime = this.formatDateTime(this.home_data.stamp.from);
      this.endDateTime = this.formatDateTime(this.home_data.stamp.to);
    } catch (error) {
      console.error('Failed to load data', error);
      this.showErrorNotification('Unable to load dashboard data. Please try again later.');
    } finally {
      this.isLoading = false;
    }
  }

  mapResponse(response: any): any {
    return {
      stamp: {
        from: new Date(response.stamp.from),
        to: new Date(response.stamp.to),
      },
      sales: response.sales,
      products: response.products,
    };
  }

  formatNumber(number: number): string {
    return number?.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  showErrorNotification(message: string) {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  async uploadHomeData() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const collectionName = 'reports';
      let hash = JSON.stringify(this.home_data);
      const docRef = await this.firestoreService.addDocument(collectionName, this.home_data);
      alert('Home data successfully uploaded to Firestore. ');
    } catch (error) {
      console.error('Error uploading home data:', error);
      this.showErrorNotification('Failed to upload home data. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }
}
