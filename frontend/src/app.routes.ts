import {Routes} from '@angular/router';
import {AppLayout} from '@/layout/components/app.layout';

export const appRoutes: Routes = [
	{
		path: '',
		component: AppLayout,
		children: [
			{path: '', redirectTo: '/stock/tableau-de-bord', pathMatch: 'full'},
			{
				path: 'administration',
				data: {breadcrumb: 'Administration'},
				loadChildren: () => import('@/administration/administration.routes')
			},
			{
				path: 'stock',
				data: {breadcrumb: 'Stock'},
				loadChildren: () => import('@/stock/stock.routes')
			},
			{
				path: 'emplacement',
				data: {breadcrumb: 'Emplacement'},
				loadChildren: () => import('@/emplacement/emplacement.routes')
			},
			{
				path: 'referentiel',
				data: {breadcrumb: 'Projets'},
				loadChildren: () => import('@/referentiel/referentiel.routes')
			},
			{
				path: 'mouvement',
				data: {breadcrumb: 'Mouvements'},
				loadChildren: () => import('@/mouvement/mouvement.routes')
			},
			{
				path: 'reseau',
				data: {breadcrumb: 'Réseau'},
				loadChildren: () => import('@/reseau/reseau.routes')
			}
		]
	},
	{
		path: 'connexion',
		loadComponent: () => import('@/login/login').then((c) => c.Login)
	},
	{
		path: 'notfound',
		loadComponent: () => import('@/pages/notfound/notfound').then((c) => c.Notfound)
	},
	{path: '**', redirectTo: '/notfound'}
];
