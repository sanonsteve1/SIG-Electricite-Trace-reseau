import { Routes } from '@angular/router';
import { TraceReseau } from '@/reseau/trace-reseau/trace-reseau.component';
import { Modelisation } from '@/reseau/modelisation/modelisation.component';

export default [
	{
		path: 'trace-reseau',
		data: { breadcrumb: 'Carte du réseau' },
		component: TraceReseau
	},
	{
		path: 'modelisation',
		data: { breadcrumb: 'Modélisation' },
		component: Modelisation
	},
	{ path: '**', redirectTo: '/notfound' }
] as Routes;
