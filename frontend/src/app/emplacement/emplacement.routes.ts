import {Routes} from '@angular/router';
import {Emplacement} from "@/emplacement/emplacement/emplacement.component";
import {Entrepot} from "@/emplacement/entrepot/entrepot.component";
import {Zone} from "@/emplacement/zone/zone.component";
import {Allee} from "@/emplacement/allee/allee.component";
import {Quai} from "@/emplacement/quai/quai.component";

export default [
	{path: '', redirectTo: '/emplacement/liste-emplacement', pathMatch: 'full'},
	{
		path: 'liste-emplacement',
		data: {breadcrumb: 'Liste des emplacements'},
		component: Emplacement
	},
	{
		path: 'entrepot',
		data: {breadcrumb: 'Entrepot'},
		component: Entrepot
	},
	{
		path: 'zone',
		data: {breadcrumb: 'Zone'},
		component: Zone
	},
	{
		path: 'allee',
		data: {breadcrumb: 'Allée'},
		component: Allee
	},
	{
		path: 'quai',
		data: {breadcrumb: 'Quai'},
		component: Quai
	},
	{path: '**', redirectTo: '/notfound'}
] as Routes;
