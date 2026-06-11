import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/public/public.component').then((m) => m.PublicComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard/guest',
    canActivate: [authGuard],
    data: { roles: ['Guest'] },
    loadComponent: () =>
      import('./pages/dashboards/guest/guest-dashboard.component').then(
        (m) => m.GuestDashboardComponent
      ),
  },
  {
    path: 'dashboard/receptionist',
    canActivate: [authGuard],
    data: { roles: ['Receptionist', 'Admin'] },
    loadComponent: () =>
      import('./pages/dashboards/receptionist/receptionist-dashboard.component').then(
        (m) => m.ReceptionistDashboardComponent
      ),
  },
  {
    path: 'dashboard/housekeeping',
    canActivate: [authGuard],
    data: { roles: ['Housekeeping', 'Admin'] },
    loadComponent: () =>
      import('./pages/dashboards/housekeeping/housekeeping-dashboard.component').then(
        (m) => m.HousekeepingDashboardComponent
      ),
  },
  {
    path: 'dashboard/maintenance',
    canActivate: [authGuard],
    data: { roles: ['Maintenance', 'Admin'] },
    loadComponent: () =>
      import('./pages/dashboards/maintenance/maintenance-dashboard.component').then(
        (m) => m.MaintenanceDashboardComponent
      ),
  },
  {
    path: 'dashboard/admin',
    canActivate: [authGuard],
    data: { roles: ['Admin'] },
    loadComponent: () =>
      import('./pages/dashboards/admin/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent
      ),
  },
  { path: '**', redirectTo: '' },
];
