import { Routes } from '@angular/router';

export default [
    { path: '', redirectTo: 'analytics', pathMatch: 'full' },
    { path: 'analytics', data: { breadcrumb: 'Analytics Dashboard' }, loadComponent: () => import('./analytics/dashboardanalytics').then((c) => c.DashboardAnalytics) },
    { path: 'sales', data: { breadcrumb: 'Sales Dashboard' }, loadComponent: () => import('./sales/dashboardsales').then((c) => c.DashboardSales) },
    { path: 'saas', data: { breadcrumb: 'Saas Dashboard' }, loadComponent: () => import('./saas/dashboardsaas').then((c) => c.DashboardSaas) }
] as Routes;
