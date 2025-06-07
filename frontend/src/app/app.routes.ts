import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { InventoryComponent } from './pages/inventory/inventory.component';
import { SalesComponent } from './pages/sales/sales.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { SalesReportsComponent } from './pages/reportings/sales-reports/sales-reports.component';
import { InventoryReportsComponent } from './pages/reportings/inventory-reports/inventory-reports.component';
import { SignInComponent } from './pages/authentication/sign-in/sign-in.component';
import { AuthenticationGuard } from './pages/authentication/authentication.guard';
import { SignUpComponent } from './pages/authentication/sign-up/sign-up.component';
import { AccessControlComponent } from './pages/authentication/access-control/access-control.component';
import { UnauthoricedComponent } from './pages/unauthoriced/unauthoriced.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [AuthenticationGuard]
  },
  {
    path: 'inventory_management',
    component: InventoryReportsComponent,
    canActivate: [AuthenticationGuard]
  },
  {
    path: 'sales',
    component: SalesComponent,
    canActivate: [AuthenticationGuard]
  },
  {
    path: 'reportings',
    children: [
      {
        path: 'inventory',
        component: InventoryReportsComponent,
        canActivate: [AuthenticationGuard]
      },
      {
        path: 'sales',
        component: SalesReportsComponent,
        canActivate: [AuthenticationGuard]
      }
    ]
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [AuthenticationGuard]
  },
  {
    path: 'signin',
    component: SignInComponent,
    canActivate: [AuthenticationGuard]
  },
  {
    path: 'signup',
    component: SignUpComponent,
    canActivate: [AuthenticationGuard]
  },
  {
    path: 'access_control',
    component: AccessControlComponent,
    canActivate: [AuthenticationGuard]
  },
  {
    path: 'unauthorized',
    component: UnauthoricedComponent
  }
];
